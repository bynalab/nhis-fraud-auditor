import express, { Request, Response } from "express";
import { initializeDatabase } from "./db";
import claimsRouter from "./routes/claims";
import metricsRouter from "./routes/metrics";
import adminRouter from "./routes/admin";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({ origin: "*" }));

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// API Routes
app.use("/api/claims", claimsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/admin", adminRouter);

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log("Database initialized successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
}

startServer();
