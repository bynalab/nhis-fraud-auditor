import { Request, Response } from "express";
import { Op } from "sequelize";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parse } from "csv-parse/sync";
import { Claim, Procedure, Provider } from "../db";
import { computeFraudScore } from "../utils/heuristic";

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
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const csvContent = fs.readFileSync(req.file.path, "utf8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    }) as any[];

    let inserted = 0;
    for (const r of records) {
      const chargeDollars = Number(r.claim_charge || r.claimCharge || "0");
      try {
        await Claim.create({
          claim_id: r.claim_id || r.claimId,
          patient_id: r.patient_id || null,
          provider_id: r.provider_id || null,
          provider_type: r.provider_type || null,
          procedure_code: r.procedure_code || null,
          claim_charge: chargeDollars,
          claim_date: r.service_date || r.claim_date || null,
        });
        inserted++;
      } catch (e: any) {
        // ignore duplicates
      }
    }

    // Rebuild procedures
    await Procedure.destroy({ where: {}, truncate: true });
    const statsData = (await Claim.findAll({
      attributes: [
        "procedure_code",
        [
          Claim.sequelize!.fn("AVG", Claim.sequelize!.col("claim_charge")),
          "avg_charge",
        ],
        [
          Claim.sequelize!.fn("COUNT", Claim.sequelize!.col("id")),
          "total_claims",
        ],
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
      const avg = stat.avg_charge as number;
      const variance =
        charges.length > 1
          ? charges.reduce((s, v) => s + Math.pow(v - avg, 2), 0) /
            (charges.length - 1)
          : 0;
      const stdDev = Math.sqrt(variance);
      await Procedure.create({
        procedure_code: stat.procedure_code,
        avg_charge: avg,
        std_dev: stdDev,
        total_claims: stat.total_claims,
      });
    }

    // Recompute fraud fields for all claims
    const allClaims = await Claim.findAll();
    for (const claim of allClaims) {
      const proc = claim.procedure_code
        ? await Procedure.findOne({
            where: { procedure_code: claim.procedure_code },
          })
        : null;
      const resScore = computeFraudScore({
        claimChargeCents: Math.round((claim.claim_charge as number) * 100),
        avgChargeCents: proc
          ? Math.round((proc.avg_charge as number) * 100)
          : null,
        stdChargeCents: proc
          ? Math.round((proc.std_dev as number) * 100)
          : null,
        providerType: claim.provider_type ?? null,
        procedureCode: claim.procedure_code ?? null,
      });
      const category =
        resScore.score >= 76 ? "High" : resScore.score >= 26 ? "Medium" : "Low";
      await claim.update({
        fraud_score: resScore.score,
        fraud_category: category,
        fraud_reasons: JSON.stringify(resScore.reasons),
      });
    }

    // Rebuild provider stats
    await Provider.destroy({ where: {}, truncate: true });
    const providerAgg = (await Claim.findAll({
      attributes: [
        "provider_id",
        "provider_type",
        [
          Claim.sequelize!.fn("COUNT", Claim.sequelize!.col("id")),
          "total_claims",
        ],
        [
          Claim.sequelize!.fn("AVG", Claim.sequelize!.col("claim_charge")),
          "avg_claim_charge",
        ],
      ],
      where: { provider_id: { [Op.ne]: null } },
      group: ["provider_id", "provider_type"],
      raw: true,
    })) as any[];
    for (const p of providerAgg) {
      await Provider.create({
        provider_id: p.provider_id,
        provider_type: p.provider_type,
        total_claims: p.total_claims,
        avg_claim_charge: p.avg_claim_charge,
      });
    }

    fs.unlink(req.file.path, () => {});
    res.status(200).json({ inserted, total: await Claim.count() });
  } catch (e: any) {
    console.error("Upload ingest failed:", e);
    res.status(500).json({ error: e.message || "Upload failed" });
  }
}
