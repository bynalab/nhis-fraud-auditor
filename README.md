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

- **Frontend**: React (Vite), React Router, Recharts, Axios
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

The frontend will proxy API requests to `http://localhost:3000` automatically.

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
The frontend can be deployed as static files. Update the API base URL in `frontend/src/services/api.ts` or set `VITE_API_URL` environment variable to point to your backend.

## Notes

- The heuristic is intentionally explainable and conservative; adjust thresholds in `backend/utils/heuristic.ts` as needed
- Database writes are safe for read-mostly workloads; for production with heavy writes, consider PostgreSQL
- All scoring happens during ingestion for fast dashboard queries
