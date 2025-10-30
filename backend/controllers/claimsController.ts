import { Request, Response } from "express";
import { Op, Sequelize, where } from "sequelize";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parse } from "csv-parse/sync";
import { Claim, Procedure, Provider, sequelize } from "../db";
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
      providerType = "",
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
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const csvContent = fs.readFileSync(req.file.path, "utf8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    }) as any[];

    // ✅ Normalize & prepare claims
    const claimsToInsert = records.map((r) => {
      const treatment = r["Treatment"] || null;
      return {
        claim_id: r["Claim ID"] || r["Patient ID"],
        patient_id: r["Patient ID"] || null,
        age: r["Age"] ? Number(r["Age"]) : null,
        gender: r["Gender"] || null,
        date_admitted: r["Date Admitted"] || null,
        date_discharged: r["Date Discharged"] || null,
        diagnosis: r["Diagnosis"] || null,
        treatment: treatment,
        claim_charge: Number(r["Amount Billed"] || r["Claim Charge"] || "0"),
        fraud_type: r["Fraud Type"] || null,
        // Legacy fields for backward compatibility with fraud detection
        procedure_code: treatment, // map treatment to procedure_code
        provider_id: r["Provider ID"] || null,
        provider_type: r["Provider Type"] || null,
      };
    });

    // ✅ Bulk insert with duplicate ignoring
    await Claim.bulkCreate(claimsToInsert, {
      ignoreDuplicates: true,
      transaction,
    });

    // ✅ Rebuild procedure stats
    await Procedure.destroy({ where: {}, truncate: true, transaction });

    const statsData = (await Claim.findAll({
      attributes: [
        "procedure_code",
        [Sequelize.fn("AVG", Sequelize.col("claim_charge")), "avg_charge"],
        [Sequelize.fn("COUNT", Sequelize.col("id")), "total_claims"],
      ],
      where: { procedure_code: { [Op.ne]: null } },
      group: ["procedure_code"],
      raw: true,
      transaction,
    })) as any[];

    for (const stat of statsData) {
      const procedureClaims = (await Claim.findAll({
        where: { procedure_code: stat.procedure_code },
        attributes: ["claim_charge"],
        raw: true,
        transaction,
      })) as any[];

      const charges = procedureClaims.map((c) => c.claim_charge as number);

      const averageCharge = stat.avg_charge as number;
      const stdDev = calculateStandardDeviation(charges, averageCharge);
      await Procedure.create(
        {
          procedure_code: stat.procedure_code,
          avg_charge: averageCharge,
          std_dev: stdDev,
          total_claims: stat.total_claims,
        },
        { transaction }
      );
    }

    // ✅ Compute fraud scores
    const allClaims = await Claim.findAll({ transaction });
    for (const claim of allClaims) {
      let procedure: Procedure | null = null;
      if (claim.procedure_code) {
        procedure = await Procedure.findOne({
          where: { procedure_code: claim.procedure_code },
          transaction,
        });
      }

      const fraudResult = computeFraudScore({
        claimChargeCents: convertToCents(claim.claim_charge as number),
        avgChargeCents: convertToCents(procedure?.avg_charge ?? 0),
        stdChargeCents: convertToCents(procedure?.std_dev ?? 0),
        providerType: claim.provider_type ?? null,
        procedureCode: claim.procedure_code ?? null,
      });

      const fraudCategory = getFraudCategoryFromScore(fraudResult.score);

      await claim.update(
        {
          fraud_score: fraudResult.score,
          fraud_category: fraudCategory,
          fraud_reasons: JSON.stringify(fraudResult.reasons),
        },
        { transaction }
      );
    }

    // ✅ Rebuild provider stats
    await Provider.destroy({ where: {}, truncate: true, transaction });

    const providerAgg = (await Claim.findAll({
      attributes: [
        "provider_id",
        "provider_type",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "total_claims"],
        [
          Sequelize.fn("AVG", Sequelize.col("claim_charge")),
          "avg_claim_charge",
        ],
      ],
      where: { provider_id: { [Op.ne]: null } },
      group: ["provider_id", "provider_type"],
      raw: true,
      transaction,
    })) as any[];

    await Provider.bulkCreate(providerAgg, { transaction });

    await transaction.commit();
    fs.unlink(req.file.path, () => {});

    res.status(200).json({
      success: true,
      message: "Claims uploaded and fraud scores recomputed successfully.",
      inserted: claimsToInsert.length,
      total: await Claim.count(),
    });
  } catch (e: any) {
    console.error("Upload ingest failed:", e);
    await transaction.rollback();
    res.status(500).json({ error: e.message || "Upload failed" });
  }
}
