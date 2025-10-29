// @ts-nocheck
import { describe, it, expect } from "vitest";
import {
  computeFraudScore,
  getFraudCategoryFromScore,
} from "../utils/heuristic";

describe("computeFraudScore", () => {
  it("returns 0 when nothing suspicious and metadata present", () => {
    const { score, reasons } = computeFraudScore({
      claimChargeCents: 10_000,
      avgChargeCents: 10_000,
      stdChargeCents: 1_000,
      providerType: "Hospital",
      procedureCode: "X123",
    });
    expect(score).toBe(0);
    expect(reasons).toHaveLength(0);
    expect(getFraudCategoryFromScore(score)).toBe("Low");
  });

  it("adds 20 for moderately higher than average (>1.15x)", () => {
    const { score, reasons } = computeFraudScore({
      claimChargeCents: 12_600,
      avgChargeCents: 10_000,
      stdChargeCents: 5_000,
      providerType: "Clinic",
      procedureCode: "P001",
    });
    expect(score).toBe(20);
    expect(reasons).toContain("Claim charge moderately higher than average.");
  });

  it("adds 40 for significantly higher than average (>1.5x)", () => {
    const { score, reasons } = computeFraudScore({
      claimChargeCents: 15_100,
      avgChargeCents: 10_000,
      stdChargeCents: 5_000,
      providerType: "Clinic",
      procedureCode: "P001",
    });
    expect(score).toBe(40);
    expect(getFraudCategoryFromScore(score)).toBe("Medium");
    expect(reasons).toContain(
      "Claim charge significantly higher than average."
    );
  });

  it("adds 25 when z-score > 2", () => {
    // (claim - avg)/std = (18k - 10k)/4k = 2.0 -> needs strictly > 2
    const justAtThreshold = computeFraudScore({
      claimChargeCents: 18_000,
      avgChargeCents: 10_000,
      stdChargeCents: 4_000,
      providerType: "Lab",
      procedureCode: "L100",
    });
    expect(justAtThreshold.score).toBeGreaterThanOrEqual(0);
    expect(justAtThreshold.reasons).not.toContain(
      "Claim charge more than 2 SD above average."
    );

    const aboveThreshold = computeFraudScore({
      claimChargeCents: 18_100,
      avgChargeCents: 10_000,
      stdChargeCents: 4_000,
      providerType: "Lab",
      procedureCode: "L100",
    });
    expect(aboveThreshold.score).toBeGreaterThanOrEqual(25);
    expect(aboveThreshold.reasons).toContain(
      "Claim charge more than 2 SD above average."
    );
  });

  it("adds 10 when providerType missing and 5 when procedureCode missing", () => {
    const { score, reasons } = computeFraudScore({
      claimChargeCents: 10_000,
      avgChargeCents: 10_000,
      stdChargeCents: 1_000,
      providerType: null,
      procedureCode: null,
    });
    expect(score).toBe(15);
    expect(reasons).toEqual(
      expect.arrayContaining([
        "Missing provider type data.",
        "Missing procedure code data.",
      ])
    );
  });

  it("caps score at 100 when many rules apply", () => {
    const { score } = computeFraudScore({
      claimChargeCents: 1_500_000, // triggers absolute value + higher avg + likely z-score
      avgChargeCents: 500_000,
      stdChargeCents: 100_000,
      providerType: null,
      procedureCode: null,
    });
    expect(score).toBeLessThanOrEqual(100);
  });
});
