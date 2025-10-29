type Props = {
  headers: string[];
  rows: string[][];
};

export default function CsvPreviewTable({ headers, rows }: Props) {
  return (
    <table className="w-full min-w-[640px] border-collapse">
      <thead>
        <tr>
          {headers.map((h, idx) => (
            <th
              key={idx}
              className="text-left px-2 py-1.5 border-b border-gray-200 bg-gray-50 sticky top-0"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rIdx) => (
          <tr key={rIdx}>
            {headers.map((_, cIdx) => (
              <td key={cIdx} className="px-2 py-1.5 border-b border-gray-100">
                {row[cIdx] ?? ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
