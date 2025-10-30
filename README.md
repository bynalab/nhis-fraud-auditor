# NHIS Fraud Auditor Dashboard

A fraud detection dashboard for medical claims auditing with an explainable scoring system.

## Project Structure

```
/backend
  ├── index.ts         # Express server entry point
  ├── db.ts            # Sequelize models and database setup
  ├── routes/          # API route handlers
  │   ├── claims.ts
  │   └── metrics.ts
  ├── utils/           # Utility functions
  │   ├── heuristic.ts # Fraud scoring logic
  │   └── ingest.ts    # CSV ingestion script
  └── data/            # CSV files and SQLite database
      └── claims.sample.csv

/frontend
  ├── src/
  │   ├── components/  # React components
  │   ├── pages/       # Page components
  │   └── services/    # API service layer
  │       └── api.ts
  ├── index.html
  └── vite.config.ts
```

## Features

- Data ingestion from CSV to SQLite with precomputed procedure stats and fraud scores
- Explainable heuristic with reasons for each claim
- Dashboard: total claims, average charge, flagged count/percent, bar chart of score distribution
- Claims list with pagination, search by Procedure Code, filter by Provider Type
- Separate backend and frontend for independent deployment

## Tech Stack

- **Frontend**: React (Vite), React Router, Recharts, Axios, TanStack Query, Tailwind CSS
- **Backend**: Express.js, Sequelize ORM, SQLite
- **Database**: SQLite with precomputed aggregates

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

Install all dependencies (root, backend, and frontend):

```bash
npm run install:all
```

Or install separately:

```bash
# Root dependencies
npm install

# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend && npm install
```

### Data Preparation

1. Place your CSV file in `backend/data/claims.sample.csv` or provide a custom path
2. CSV should include headers: `claim_id, patient_id, provider_id, provider_type, procedure_code, claim_charge, service_date`

### Ingest Data

Build SQLite database with precomputed stats and scores:

```bash
npm run ingest
# Or from backend directory:
cd backend && npm run ingest
```

This creates `backend/data/claims.db` with all precomputed data.

### Development

Run backend and frontend separately:

```bash
# Terminal 1: Backend (port 3000)
npm run dev:backend

# Terminal 2: Frontend (port 5173)
npm run dev:frontend
```

By default, the frontend is configured to reach the API via an ngrok URL (see `frontend/vite.config.ts` and `frontend/src/services/http.ts`). For local development against your backend, either:

- Edit `frontend/vite.config.ts` and set the proxy target for `/api` to `http://localhost:3000`, or
- Set `VITE_API_URL=http://localhost:3000` when running the frontend to override the default base URL.

### Build for Production

```bash
# Build backend
npm run build:backend

# Build frontend
npm run build:frontend
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/metrics` - Get overall metrics and score distribution
- `GET /api/claims?page=1&pageSize=20&q=PROC100&providerType=CLINIC` - Get paginated claims with filters
- `POST /api/claims/upload` - Upload CSV of claims (multipart form field: `file`)
- `POST /api/admin/reset` - Truncate all tables (claims, procedures, providers)

## Fraud Scoring Heuristic

The scoring system uses an explainable heuristic (0-100) based on:

- **Overcharge ratio** (0-60): Charge vs. procedure average
- **Z-score** (0-25): Standard deviations above mean
- **High amount bump** (0-10): Absolute charge thresholds
- **Provider type risk** (0-10): Historical risk weights by provider type

Each claim includes a score and an array of reasons explaining the calculation.

## Data Model

- `claims`: Raw claim data
- `procedure_stats`: Aggregated statistics per procedure (avg, std dev, count)
- `claim_scores`: Precomputed fraud scores and reasons per claim

## Deployment

### Backend
The backend can be deployed as a standalone Express server. Ensure the SQLite database file (`backend/data/claims.db`) is included in deployment.

### Frontend
The frontend can be deployed as static files. Set the `VITE_API_URL` environment variable at build time to point to your backend (e.g., `VITE_API_URL=https://api.example.com npm run build`). If you rely on a proxy during local dev, ensure production builds use `VITE_API_URL`.

## Notes

- The heuristic is intentionally explainable and conservative; adjust thresholds in `backend/utils/heuristic.ts` as needed
- Database writes are safe for read-mostly workloads; for production with heavy writes, consider PostgreSQL
- All scoring happens during ingestion for fast dashboard queries

## 🧱 Architectural Overview

The application is a two-tier system:

- Frontend (`frontend/`): React + Vite SPA that calls REST endpoints. It uses TanStack Query for data fetching/caching, Tailwind CSS for styling, and Recharts for visualizations. API access is configured via a Vite dev proxy for local development and via `VITE_API_URL` for builds.
- Backend (`backend/`): Express.js server with Sequelize and SQLite. Data is ingested from CSV into normalized tables and precomputed aggregates. The server exposes endpoints for metrics, claims listing, file upload, and admin reset.

Request flow: UI → `/api/*` → Express routes → Controllers → Sequelize models → SQLite. Ingestion precomputes `procedure` stats and `fraud_score` so dashboard queries remain fast.

## 🧮 Fraud Likelihood Heuristic

We used the standard deviation approach because it measures how far a claim deviates from what’s statistically normal for that procedure.
If a claim’s cost is far above the average range — for example, more than 2 or 3 standard deviations higher — it’s likely fraudulent or misreported.

Explanation: https://youtu.be/MRqtXL2WX2M?si=YavUALCQZpxLFti2

The fraud score ranges from 0 to 100 and is the sum of weighted signals (capped at 100):

- Overcharge ratio: adds 20 if charge > 1.15× average; adds 40 if > 1.5×.
- Z-score: adds 25 if z-score > 2, where \( z = \frac{claim - avg}{std} \).
- Missing data penalties: +10 if `providerType` is missing, +5 if `procedureCode` is missing.

Each claim stores the `fraud_score`, `fraud_category` (Low/Medium/High), and human-readable `reasons` explaining which rules fired. See `backend/utils/heuristic.ts` for exact logic.

## 🧪 AI-Generated Test Example

Prompt used:

"Compare Jest vs Vitest briefly for a Vite/TypeScript monorepo: execution speed, ESM support, tsconfig integration, watch mode UX, and ecosystem maturity. Recommend which to use here and why. Then write a Vitest unit test suite for a `computeFraudScore` function that returns `{ score, reasons }` and a `getFraudCategoryFromScore` helper. Cover: baseline no-risk case; moderate (1.15×) and significant (1.5×) overcharge; z-score strictly > 2; penalties for missing providerType and procedureCode; and ensure score is capped at 100. Use TS and import from `../utils/heuristic`."

Reason for choosing Vitest (from the comparison): native Vite/ESM compatibility, faster cold start and watch mode for TS/ESM, simpler configuration in ESM projects, and seamless inline snapshot/expect API parity with Jest.

Generated code (placed at `backend/tests/heuristic.test.ts`):

```typescript
// @ts-nocheck
import { describe, it, expect } from "vitest";
import {
  computeFraudScore,
  getFraudCategoryFromScore,
} from "../utils/heuristic";

describe("computeFraudScore", () => {
  it("returns 0 when nothing suspicious and metadata present", () => {
    const { score, reasons } = computeFraudScore({
      claimChargeCents: 10_000,
      avgChargeCents: 10_000,
      stdChargeCents: 1_000,
      providerType: "Hospital",
      procedureCode: "X123",
    });
    expect(score).toBe(0);
    expect(reasons).toHaveLength(0);
    expect(getFraudCategoryFromScore(score)).toBe("Low");
  });

  it("adds 20 for moderately higher than average (>1.15x)", () => {
    const { score, reasons } = computeFraudScore({
      claimChargeCents: 12_600,
      avgChargeCents: 10_000,
      stdChargeCents: 5_000,
      providerType: "Clinic",
      procedureCode: "P001",
    });
    expect(score).toBe(20);
    expect(reasons).toContain("Claim charge moderately higher than average.");
  });

  it("adds 40 for significantly higher than average (>1.5x)", () => {
    const { score, reasons } = computeFraudScore({
      claimChargeCents: 15_100,
      avgChargeCents: 10_000,
      stdChargeCents: 5_000,
      providerType: "Clinic",
      procedureCode: "P001",
    });
    expect(score).toBe(40);
    expect(getFraudCategoryFromScore(score)).toBe("Medium");
    expect(reasons).toContain(
      "Claim charge significantly higher than average."
    );
  });

  it("adds 25 when z-score > 2", () => {
    // (claim - avg)/std = (18k - 10k)/4k = 2.0 -> needs strictly > 2
    const justAtThreshold = computeFraudScore({
      claimChargeCents: 18_000,
      avgChargeCents: 10_000,
      stdChargeCents: 4_000,
      providerType: "Lab",
      procedureCode: "L100",
    });
    expect(justAtThreshold.score).toBeGreaterThanOrEqual(0);
    expect(justAtThreshold.reasons).not.toContain(
      "Claim charge more than 2 SD above average."
    );

    const aboveThreshold = computeFraudScore({
      claimChargeCents: 18_100,
      avgChargeCents: 10_000,
      stdChargeCents: 4_000,
      providerType: "Lab",
      procedureCode: "L100",
    });
    expect(aboveThreshold.score).toBeGreaterThanOrEqual(25);
    expect(aboveThreshold.reasons).toContain(
      "Claim charge more than 2 SD above average."
    );
  });

  it("adds 10 when providerType missing and 5 when procedureCode missing", () => {
    const { score, reasons } = computeFraudScore({
      claimChargeCents: 10_000,
      avgChargeCents: 10_000,
      stdChargeCents: 1_000,
      providerType: null,
      procedureCode: null,
    });
    expect(score).toBe(15);
    expect(reasons).toEqual(
      expect.arrayContaining([
        "Missing provider type data.",
        "Missing procedure code data.",
      ])
    );
  });

  it("caps score at 100 when many rules apply", () => {
    const { score } = computeFraudScore({
      claimChargeCents: 1_500_000, // triggers absolute value + higher avg + likely z-score
      avgChargeCents: 500_000,
      stdChargeCents: 100_000,
      providerType: null,
      procedureCode: null,
    });
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

How to run tests:

```bash
cd backend && npm run test
```

## 🏗️ AI-Assisted Architectural Decision

Prompt used:

"Compare SQLite vs. PostgreSQL for a small-scale medical claims auditing dashboard that ingests CSVs, precomputes aggregates, and serves read-mostly queries with occasional uploads. Evaluate dev velocity, deployment simplicity, query performance for aggregates, concurrency, and future scalability. Recommend which to use now and when to switch."

Decision summary:

- We chose SQLite for local-first development, zero-ops deployment, and excellent read performance on precomputed aggregates. Concurrency limits are acceptable for our single-writer, read-mostly workload. We would migrate to PostgreSQL when concurrent ingestion, multi-user writes, or horizontal scaling are required.

## 🤖 AI Prompt Journal

1) Prompt: "Design an explainable fraud score heuristic from 0–100 for medical claims using average charge, standard deviation (z-score), absolute thresholds, and missing-data penalties. Return both a numeric score and human-readable reasons."
   - Used for: Shaping the rules in `backend/utils/heuristic.ts` (weights, thresholds, reasons).

2) Prompt: "Explain why my Sequelize findAll aggregation returns empty after transaction insert."
   - Used for: Helped identify that findAll queries executed inside an active transaction must include the { transaction } option to access uncommitted data

3) Prompt: "Write a Vitest unit test suite for a `computeFraudScore` function ... (see above)."
   - Used for: Generating `backend/tests/heuristic.test.ts` test coverage for key rules.

4) Prompt: "Define an Express + Sequelize SQLite schema for claims, procedures (aggregates), and providers to support fast dashboard queries; include fields and basic relations."
   - Used for: Informing the DB model layout in `backend/db.ts` and aggregate strategy.

5) Prompt: "Implement an Express file upload endpoint that accepts a CSV (`multipart/form-data` field `file`), bulk inserts normalized claims with duplicate-ignore, recomputes procedure/provider aggregates, and updates fraud scores. Use Sequelize transactions."
   - Used for: Structuring the ingestion flow in `backend/controllers/claimsController.ts`.

6) Prompt: "Draft a React (Vite) dashboard with TanStack Query fetching `/api/metrics` and `/api/claims`, including a search bar by procedure code, provider type filter, pagination, and a score distribution chart with Recharts."
   - Used for: Guiding UI composition in `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Claims.tsx`, and components.
