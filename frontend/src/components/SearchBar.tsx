type Props = {
  q: string;
  providerType: string;
  onChange: (next: { q: string; providerType: string }) => void;
};

export default function SearchBar({ q, providerType, onChange }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      <input
        value={q}
        placeholder="Search by Procedure Code"
        onChange={(e) => onChange({ q: e.target.value, providerType })}
        style={{
          padding: 8,
          borderRadius: 6,
          border: "1px solid #ddd",
          flex: 1,
        }}
      />
      <input
        value={providerType}
        placeholder="Filter by Provider Type"
        onChange={(e) => onChange({ q, providerType: e.target.value })}
        style={{
          padding: 8,
          borderRadius: 6,
          border: "1px solid #ddd",
          width: 240,
        }}
      />
    </div>
  );
}
