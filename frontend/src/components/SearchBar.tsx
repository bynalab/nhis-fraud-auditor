type Props = {
  q: string;
  providerType: string;
  onChange: (next: { q: string; providerType: string }) => void;
};

export default function SearchBar({ q, providerType, onChange }: Props) {
  return (
    <div className="flex gap-2 items-center mb-3">
      <input
        value={q}
        placeholder="Search by Procedure Code"
        onChange={(e) => onChange({ q: e.target.value, providerType })}
        className="flex-1 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        value={providerType}
        placeholder="Filter by Provider Type"
        onChange={(e) => onChange({ q, providerType: e.target.value })}
        className="w-60 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
