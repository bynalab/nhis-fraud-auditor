export default function ScoreBadge({ score }: { score: number }) {
  const level = score >= 76 ? "high" : score >= 26 ? "medium" : "low";
  const cls =
    level === "high"
      ? "bg-red-500"
      : level === "medium"
      ? "bg-amber-500"
      : "bg-green-500";
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-white font-semibold ${cls}`}
    >
      {score}
    </span>
  );
}
