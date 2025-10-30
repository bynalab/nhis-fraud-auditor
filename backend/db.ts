import { DataTypes, Model, Sequelize } from "sequelize";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "claims.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: dbPath,
  logging: false,
});

// Claim Model
export class Claim extends Model {
  declare id: number;
  declare claim_id: string;
  declare patient_id: string | null;
  declare age: number | null;
  declare gender: string | null;
  declare date_admitted: string | null;
  declare date_discharged: string | null;
  declare diagnosis: string | null;
  declare treatment: string | null;
  declare claim_charge: number; // dollars, REAL
  declare fraud_type: string | null;
  declare fraud_score: number;
  declare fraud_category: "Low" | "Medium" | "High" | null;
  declare fraud_reasons: string | null;
  declare procedure_code: string | null; // legacy field, maps to treatment
  declare provider_id: string | null; // legacy field for fraud detection
  declare provider_type: string | null; // legacy field for fraud detection
  declare created_at: Date;
}

Claim.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    claim_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    patient_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date_admitted: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    date_discharged: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    diagnosis: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    treatment: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    claim_charge: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    fraud_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fraud_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    fraud_category: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [["Low", "Medium", "High"]],
      },
    },
    fraud_reasons: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    procedure_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    provider_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    provider_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "Claim",
    tableName: "claims",
    timestamps: false,
  }
);

// Procedure Model
export class Procedure extends Model {
  declare id: number;
  declare procedure_code: string | null;
  declare avg_charge: number;
  declare std_dev: number;
  declare total_claims: number;
  declare last_updated: Date;
}

Procedure.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    procedure_code: { type: DataTypes.TEXT, unique: true },
    avg_charge: { type: DataTypes.REAL, defaultValue: 0 },
    std_dev: { type: DataTypes.REAL, defaultValue: 0 },
    total_claims: { type: DataTypes.INTEGER, defaultValue: 0 },
    last_updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: "Procedure",
    tableName: "procedures",
    timestamps: false,
  }
);

// Initialize database and sync models
export async function initializeDatabase() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  return sequelize;
}

export type ClaimRow = {
  claim_id: string;
  patient_id: string | null;
  age: number | null;
  gender: string | null;
  date_admitted: string | null;
  date_discharged: string | null;
  diagnosis: string | null;
  treatment: string | null;
  claim_charge: number; // dollars
  fraud_type: string | null;
};
