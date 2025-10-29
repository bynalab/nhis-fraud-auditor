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
    <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="text-gray-500 text-xs">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {card("Total Claims", totalClaims.toLocaleString())}
      {card("Average Claim ($)", averageClaimCharge.toLocaleString())}
      {card(
        "Flagged (>75)",
        `${flaggedCount.toLocaleString()} (${flaggedPercent}%)`
      )}
    </div>
  );
}
