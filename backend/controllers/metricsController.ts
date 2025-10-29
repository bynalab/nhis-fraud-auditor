import { Request, Response } from "express";
import { Op } from "sequelize";
import { Claim } from "../db";
import { FRAUD_HIGH_THRESHOLD } from "../utils/constant";

export async function getMetrics(req: Request, res: Response) {
  try {
    const total = await Claim.count();

    const avgResult = (await Claim.findOne({
      attributes: [
        [
          Claim.sequelize!.fn("AVG", Claim.sequelize!.col("claim_charge")),
          "avg_charge",
        ],
      ],
      raw: true,
    })) as any;

    const flagged = await Claim.count({
      where: {
        fraud_score: { [Op.gt]: FRAUD_HIGH_THRESHOLD },
      },
    });

    const low = await Claim.count({ where: { fraud_category: "Low" } });
    const medium = await Claim.count({ where: { fraud_category: "Medium" } });
    const high = await Claim.count({ where: { fraud_category: "High" } });

    const totalClaims = total || 0;
    const flaggedCount = flagged || 0;
    const pctFlagged = totalClaims
      ? Math.round((flaggedCount / totalClaims) * 100)
      : 0;

    res.status(200).json({
      metrics: {
        totalClaims,
        averageClaimCharge: Math.round(avgResult?.avg_charge || 0),
        flaggedCount,
        flaggedPercent: pctFlagged,
      },
      distribution: {
        low: low || 0,
        medium: medium || 0,
        high: high || 0,
      },
    });
  } catch (e: any) {
    console.error("Error in getMetrics:", e);
    res.status(500).json({ error: e.message || "Internal Server Error" });
  }
}
