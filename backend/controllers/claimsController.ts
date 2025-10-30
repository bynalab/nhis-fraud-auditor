import { Request, Response } from "express";
import { Op, Sequelize } from "sequelize";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parse } from "csv-parse/sync";
import { Claim, Procedure, sequelize } from "../db";
import {
  computeFraudScore,
  calculateStandardDeviation,
  getFraudCategoryFromScore,
} from "../utils/heuristic";
import { convertToCents } from "../utils/currency";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
export const upload = multer({ dest: uploadDir });

export async function listClaims(req: Request, res: Response) {
  try {
    const {
      page = "1",
      pageSize = "20",
      q = "",
    } = req.query as Record<string, string>;

    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const whereClause: any = {};

    if (q) {
      whereClause[Op.or] = [
        { diagnosis: { [Op.like]: `%${q}%` } },
        { treatment: { [Op.like]: `%${q}%` } },
        { patient_id: { [Op.like]: `%${q}%` } },
        { fraud_type: { [Op.like]: `%${q}%` } },
      ];
    }

    const { count, rows } = await Claim.findAndCountAll({
      where: whereClause,
      order: [
        ["fraud_score", "DESC"],
        ["claim_charge", "DESC"],
      ],
      limit: ps,
      offset,
    });

    const items = rows.map((claim: any) => ({
      claim_id: claim.claim_id,
      patient_id: claim.patient_id,
      age: claim.age,
      gender: claim.gender,
      date_admitted: claim.date_admitted,
      date_discharged: claim.date_discharged,
      diagnosis: claim.diagnosis,
      treatment: claim.treatment,
      claim_charge: Math.round(claim.claim_charge),
      fraud_type: claim.fraud_type,
      fraud_score: claim.fraud_score ?? 0,
      fraud_category: claim.fraud_category,
      fraud_reasons: claim.fraud_reasons ? JSON.parse(claim.fraud_reasons) : [],
    }));

    res.status(200).json({ page: p, pageSize: ps, total: count, items });
  } catch (e: any) {
    console.error("Error in listClaims:", e);
    res.status(500).json({ error: e.message || "Internal Server Error" });
  }
}

export async function uploadClaims(req: Request, res: Response) {
  const transaction = await sequelize.transaction();

  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // 1️⃣ Parse uploaded CSV
    const csvContent = fs.readFileSync(req.file.path, "utf8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    }) as any[];

    // 2️⃣ Normalize and prepare claims
    const claimsToInsert = records.map((r) => ({
      claim_id: r["Claim ID"] || r["Patient ID"],
      patient_id: r["Patient ID"],
      age: Number(r["Age"]) || null,
      gender: r["Gender"] || null,
      date_admitted: r["Date Admitted"] || null,
      date_discharged: r["Date Discharged"] || null,
      diagnosis: r["Diagnosis"] || null,
      treatment: r["Treatment"] || null, // used as procedure code
      claim_charge: Number(r["Amount Billed"]) || 0,
      fraud_type: r["Fraud Type"] || null,
    }));

    await Claim.bulkCreate(claimsToInsert, {
      ignoreDuplicates: true,
      transaction,
    });

    // 3️⃣ Compute average & standard deviation for each treatment (procedure)
    const statsData = (await Claim.findAll({
      attributes: [
        "treatment",
        [Sequelize.fn("AVG", Sequelize.col("claim_charge")), "avg_charge"],
        [Sequelize.fn("COUNT", Sequelize.col("id")), "total_claims"],
      ],
      where: { treatment: { [Op.ne]: null } },
      group: ["treatment"],
      raw: true,
      transaction,
    })) as any[];

    await Procedure.destroy({ where: {}, truncate: true, transaction });

    for (const stat of statsData) {
      const charges = (
        await Claim.findAll({
          where: { treatment: stat.treatment },
          attributes: ["claim_charge"],
          raw: true,
          transaction,
        })
      ).map((c) => c.claim_charge as number);

      const avg = stat.avg_charge as number;
      const stdDev = calculateStandardDeviation(charges, avg);

      // We could save this in memory but we might want to do some visualization
      // e.g If you want to show average and deviation per treatment on a dashboard or analytics page

      await Procedure.create(
        {
          procedure_code: stat.treatment,
          avg_charge: avg,
          std_dev: stdDev,
          total_claims: stat.total_claims,
        },
        { transaction }
      );
    }

    // 4️⃣ Preload procedures once into memory (avoid repeated DB lookups)
    const procedures = await Procedure.findAll({ raw: true, transaction });
    const procMap = new Map(procedures.map((p) => [p.procedure_code, p]));

    // 5️⃣ Compute fraud scores for all claims
    const allClaims = await Claim.findAll({ transaction });
    for (const claim of allClaims) {
      const proc = procMap.get(claim.treatment ?? "");
      const fraudResult = computeFraudScore({
        claimChargeCents: convertToCents(claim.claim_charge || 0),
        avgChargeCents: convertToCents(proc?.avg_charge ?? 0),
        stdChargeCents: convertToCents(proc?.std_dev ?? 0),
        providerType: null,
        procedureCode: claim.treatment ?? null,
      });

      const category = getFraudCategoryFromScore(fraudResult.score);

      await claim.update(
        {
          fraud_score: fraudResult.score,
          fraud_category: category,
          fraud_reasons: JSON.stringify(fraudResult.reasons),
        },
        { transaction }
      );
    }

    await transaction.commit();
    fs.unlink(req.file.path, () => {});

    res.status(200).json({
      success: true,
      message: "Claims uploaded and fraud scores computed successfully.",
      total_claims: await Claim.count(),
    });
  } catch (e: any) {
    console.error("Upload failed:", e);
    await transaction.rollback();
    res.status(500).json({ error: e.message || "Upload failed" });
  }
}
