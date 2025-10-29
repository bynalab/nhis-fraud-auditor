type Props = {
  totalClaims: number;
  averageClaimCharge: number;
  flaggedCount: number;
  flaggedPercent: number;
};

export default function Metrics({
  totalClaims,
  averageClaimCharge,
  flaggedCount,
  flaggedPercent,
}: Props) {
  const card = (label: string, value: string) => (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 8,
        padding: 16,
        flex: 1,
        background: "#fafafa",
      }}
    >
      <div style={{ color: "#666", fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {card("Total Claims", totalClaims.toLocaleString())}
      {card("Average Claim ($)", averageClaimCharge.toLocaleString())}
      {card(
        "Flagged (>75)",
        `${flaggedCount.toLocaleString()} (${flaggedPercent}%)`
      )}
    </div>
  );
}
