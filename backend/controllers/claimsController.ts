import { Request, Response } from "express";
import { Op, Sequelize } from "sequelize";
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
      whereClause.procedure_code = { [Op.like]: `%${q}%` };
    }
    if (providerType) {
      whereClause.provider_type = providerType;
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
      claimId: claim.claim_id,
      providerType: claim.provider_type,
      procedureCode: claim.procedure_code,
      claimCharge: Math.round(claim.claim_charge),
      score: claim.fraud_score ?? 0,
      reasons: claim.fraud_reasons ? JSON.parse(claim.fraud_reasons) : [],
      serviceDate: claim.claim_date,
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
    const claimsToInsert = records.map((r) => ({
      claim_id: r.claim_id || r.claimId,
      patient_id: r.patient_id || null,
      provider_id: r.provider_id || null,
      provider_type: r.provider_type || null,
      procedure_code: r.procedure_code || null,
      claim_charge: Number(r.claim_charge || r.claimCharge || "0"),
      claim_date: r.service_date || r.claim_date || null,
    }));

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
    })) as any[];

    for (const stat of statsData) {
      const procedureClaims = (await Claim.findAll({
        where: { procedure_code: stat.procedure_code },
        attributes: ["claim_charge"],
        raw: true,
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
