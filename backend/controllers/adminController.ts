import { Request, Response } from "express";
import { sequelize, Claim, Provider, Procedure } from "../db";

export async function resetData(req: Request, res: Response) {
  try {
    await Claim.destroy({ where: {}, truncate: true });
    await Provider.destroy({ where: {}, truncate: true });
    await Procedure.destroy({ where: {}, truncate: true });
    res.status(200).json({ ok: true, message: "All tables truncated" });
  } catch (e: any) {
    console.error("Error in resetData:", e);
    res.status(500).json({ error: e.message || "Failed to reset data" });
  }
}

export async function dropDatabase(req: Request, res: Response) {
  try {
    await sequelize.drop();
    await sequelize.sync({ force: true });
    res
      .status(200)
      .json({ ok: true, message: "Database dropped and re-initialized" });
  } catch (e: any) {
    console.error("Error in dropDatabase:", e);
    res.status(500).json({ error: e.message || "Failed to drop database" });
  }
}
