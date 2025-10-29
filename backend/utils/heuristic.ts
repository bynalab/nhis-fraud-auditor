// Simple, explainable fraud likelihood heuristic producing an integer [0, 100]
// Inputs are in cents to avoid floating point issues

export type HeuristicInput = {
  claimChargeCents: number;
  avgChargeCents: number | null; // null/0 means unknown average
  stdChargeCents: number | null; // null means unknown std
  providerType?: string | null;
  procedureCode?: string | null;
};

export type HeuristicResult = {
  score: number; // 0-100
  reasons: string[];
};

// Rationale:
// - Overcharge ratio: charge vs. average for the same procedure
// - Z-score on charge using std dev
// - Provider type risk weighting (some types historically riskier)
// - High absolute amount bump
// The final score is capped to [0, 100].

const providerTypeRisk: Record<string, number> = {
  // add small, adjustable risk weights (0-10)
  DME: 6,
  HOSPITAL: 2,
  PHARMACY: 4,
  CLINIC: 3,
  LAB: 5,
};

export function computeFraudScore(input: HeuristicInput): HeuristicResult {
  const reasons: string[] = [];
  const { claimChargeCents, avgChargeCents, stdChargeCents, providerType } =
    input;

  let score = 0;

  // Overcharge ratio component (0-60)
  if (avgChargeCents && avgChargeCents > 0) {
    const ratio = claimChargeCents / avgChargeCents;
    if (ratio >= 2.5) {
      score += 60; // extreme
      reasons.push("Charge >= 2.5x procedure average");
    } else if (ratio >= 2.0) {
      score += 48;
      reasons.push("Charge >= 2.0x procedure average");
    } else if (ratio >= 1.5) {
      score += 36;
      reasons.push("Charge >= 1.5x procedure average");
    } else if (ratio >= 1.2) {
      score += 22;
      reasons.push("Charge >= 1.2x procedure average");
    } else if (ratio >= 1.0) {
      score += 8;
      reasons.push("Charge slightly above procedure average");
    }
  } else {
    // Unknown average: modest base uncertainty
    score += 8;
    reasons.push("Unknown procedure average; uncertainty bump");
  }

  // Z-score component using std dev (0-25)
  if (avgChargeCents && stdChargeCents && stdChargeCents > 0) {
    const z = (claimChargeCents - avgChargeCents) / stdChargeCents;
    if (z >= 3.0) {
      score += 25;
      reasons.push("Charge >= 3 SD above mean");
    } else if (z >= 2.0) {
      score += 18;
      reasons.push("Charge >= 2 SD above mean");
    } else if (z >= 1.0) {
      score += 10;
      reasons.push("Charge >= 1 SD above mean");
    }
  }

  // High absolute amount bump (0-10)
  if (claimChargeCents >= 200_000) {
    // $2000+
    score += 10;
    reasons.push("High absolute charge (>= $2000)");
  } else if (claimChargeCents >= 100_000) {
    // $1000+
    score += 6;
    reasons.push("High absolute charge (>= $1000)");
  }

  // Provider-type risk (0-10)
  if (providerType) {
    const risk = providerTypeRisk[providerType.toUpperCase()] ?? 0;
    if (risk > 0) {
      score += risk;
      reasons.push(`Provider type risk (+${risk})`);
    }
  }

  // Normalize and clamp
  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return { score: Math.round(score), reasons };
}
