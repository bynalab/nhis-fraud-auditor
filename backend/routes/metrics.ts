import express from "express";
import { getMetrics } from "../controllers/metricsController";

const router = express.Router();

router.get("/", getMetrics);

export default router;
