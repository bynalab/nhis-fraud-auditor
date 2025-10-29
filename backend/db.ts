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
  declare provider_id: string | null;
  declare provider_type: string | null;
  declare procedure_code: string | null;
  declare claim_charge: number; // dollars, REAL
  declare claim_date: string | null;
  declare fraud_score: number;
  declare fraud_category: "Low" | "Medium" | "High" | null;
  declare fraud_reasons: string | null;
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
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    patient_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    provider_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    provider_type: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    procedure_code: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    claim_charge: {
      type: DataTypes.REAL,
      allowNull: false,
    },
    claim_date: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fraud_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    fraud_category: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isIn: [["Low", "Medium", "High"]],
      },
    },
    fraud_reasons: {
      type: DataTypes.TEXT,
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

// Provider Model
export class Provider extends Model {
  declare id: number;
  declare provider_id: string;
  declare provider_type: string | null;
  declare total_claims: number;
  declare avg_claim_charge: number;
  declare last_updated: Date;
}

Provider.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    provider_id: { type: DataTypes.TEXT, unique: true },
    provider_type: { type: DataTypes.TEXT, allowNull: true },
    total_claims: { type: DataTypes.INTEGER, defaultValue: 0 },
    avg_claim_charge: { type: DataTypes.REAL, defaultValue: 0 },
    last_updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: "Provider",
    tableName: "providers",
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
  provider_id: string | null;
  provider_type: string | null;
  procedure_code: string | null;
  claim_charge: number; // dollars
  claim_date: string | null;
};
