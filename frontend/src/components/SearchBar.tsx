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
        placeholder="Search by Diagnosis, Treatment and Fraud Type"
        onChange={(e) => onChange({ q: e.target.value, providerType })}
        className="flex-1 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
