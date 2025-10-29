export default function ScoreBadge({ score }: { score: number }) {
  const level = score >= 76 ? "high" : score >= 26 ? "medium" : "low";
  const color =
    level === "high" ? "#ff4d4f" : level === "medium" ? "#faad14" : "#52c41a";
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 12,
        background: color,
        color: "white",
        fontWeight: 600,
      }}
    >
      {score}
    </span>
  );
}
