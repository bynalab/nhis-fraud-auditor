import express from "express";
import { resetData } from "../controllers/adminController";

const router = express.Router();

router.post("/reset", resetData);

export default router;
