import express from "express";
import { resetData, dropDatabase } from "../controllers/adminController";

const router = express.Router();

router.post("/reset", resetData);
router.post("/drop", dropDatabase);

export default router;
