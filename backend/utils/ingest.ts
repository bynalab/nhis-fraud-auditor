#!/usr/bin/env ts-node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";
import { initializeDatabase, Claim, Provider, Procedure } from "../db";
import { computeFraudScore } from "./heuristic";
import { Op } from "sequelize";

// CLI: ts-node backend/utils/ingest.ts [backend/data/claims.csv]
// Builds backend/data/claims.db with precomputed stats and scores

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.join(__dirname, "..");
const dataDir = path.join(backendRoot, "data");
const csvPath = process.argv[2] || path.join(dataDir, "claims.sample.csv");

if (!fs.existsSync(csvPath)) {
  console.error(
    `CSV not found at ${csvPath}. Provide a CSV path or place claims.sample.csv in backend/data/`
  );
  process.exit(1);
}

type CsvRow = {
  claim_id: string;
  patient_id?: string;
  provider_id?: string;
  provider_type?: string;
  procedure_code?: string;
  claim_charge?: string; // dollars
  service_date?: string; // source column name in CSV
};

async function ingest() {
  await initializeDatabase();
  console.log("Database initialized");

  const content = fs.readFileSync(csvPath, "utf8");
  const records: CsvRow[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Parsed ${records.length} records from CSV`);

  // Clear existing data
  await Claim.destroy({ where: {}, truncate: true });
  await Provider.destroy({ where: {}, truncate: true });
  await Procedure.destroy({ where: {}, truncate: true });

  // Insert claims (without fraud fields filled yet)
  for (const r of records) {
    const chargeDollars = Number(r.claim_charge || "0");
    await Claim.create({
      claim_id: r.claim_id,
      patient_id: r.patient_id || null,
      provider_id: r.provider_id || null,
      provider_type: r.provider_type || null,
      procedure_code: r.procedure_code || null,
      claim_charge: chargeDollars,
      claim_date: r.service_date || null,
    });
  }

  console.log("Inserted claims");

  // Build procedure stats using Sequelize
  const statsData = (await Claim.findAll({
    attributes: [
      "procedure_code",
      [
        Claim.sequelize!.fn("AVG", Claim.sequelize!.col("claim_charge")),
        "avg_charge",
      ],
      [
        Claim.sequelize!.fn(
          "COUNT",
          Claim.sequelize!.fn("DISTINCT", Claim.sequelize!.col("claim_id"))
        ),
        "total_claims",
      ],
    ],
    where: { procedure_code: { [Op.ne]: null } },
    group: ["procedure_code"],
    raw: true,
  })) as any[];

  // Calculate std dev for each procedure
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
        ? charges.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
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

  console.log("Created procedure stats");

  // Compute scores and update claims
  const allClaims = await Claim.findAll();
  for (const claim of allClaims) {
    const stat = claim.procedure_code
      ? await Procedure.findOne({
          where: { procedure_code: claim.procedure_code },
        })
      : null;

    const res = computeFraudScore({
      claimChargeCents: Math.round((claim.claim_charge as number) * 100),
      avgChargeCents: stat
        ? Math.round((stat.avg_charge as number) * 100)
        : null,
      stdChargeCents: stat ? Math.round((stat.std_dev as number) * 100) : null,
      providerType: claim.provider_type ?? null,
      procedureCode: claim.procedure_code ?? null,
    });

    const category =
      res.score >= 76 ? "High" : res.score >= 26 ? "Medium" : "Low";

    await claim.update({
      fraud_score: res.score,
      fraud_category: category,
      fraud_reasons: JSON.stringify(res.reasons),
    });
  }

  // Build provider stats
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

  console.log("Computed fraud scores");
  console.log(
    `Ingested ${records.length} rows into ${path.join(dataDir, "claims.db")}`
  );
}

ingest().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
