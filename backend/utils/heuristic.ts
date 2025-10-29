// Simple, explainable fraud likelihood heuristic producing an integer [0, 100]
// Inputs are in cents to avoid floating point issues

export function computeFraudScore({
  claimChargeCents,
  avgChargeCents,
  stdChargeCents,
  providerType,
  procedureCode,
}: {
  claimChargeCents: number;
  avgChargeCents: number | null;
  stdChargeCents: number | null;
  providerType: string | null;
  procedureCode: string | null;
}) {
  let score = 0;
  const reasons: string[] = [];

  if (avgChargeCents && claimChargeCents > avgChargeCents * 1.5) {
    score += 40;
    reasons.push("Claim charge significantly higher than average.");
  } else if (avgChargeCents && claimChargeCents > avgChargeCents * 1.2) {
    score += 20;
    reasons.push("Claim charge moderately higher than average.");
  }

  if (stdChargeCents && avgChargeCents) {
    const z = (claimChargeCents - avgChargeCents) / stdChargeCents;
    if (z > 2) {
      score += 25;
      reasons.push("Claim charge more than 2 SD above average.");
    }
  }

  if (!providerType) {
    score += 10;
    reasons.push("Missing provider type data.");
  }

  if (!procedureCode) {
    score += 5;
    reasons.push("Missing procedure code data.");
  }

  return { score: Math.min(100, score), reasons };
}

export function calculateStandardDeviation(
  charges: number[],
  avg: number
): number {
  return Math.sqrt(calculateVariance(charges, avg));
}

export function calculateVariance(charges: number[], avg: number): number {
  if (charges.length <= 1) {
    return 0;
  }

  return (
    charges.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) /
    (charges.length - 1)
  );
}

export function getFraudCategoryFromScore(score: number) {
  return score >= 75 ? "High" : score >= 26 ? "Medium" : "Low";
}
