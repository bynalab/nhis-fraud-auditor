import express from "express";
import {
  listClaims,
  uploadClaims,
  upload,
} from "../controllers/claimsController";

const router = express.Router();

router.get("/", listClaims);
router.post("/upload", upload.single("file"), uploadClaims);

export default router;
