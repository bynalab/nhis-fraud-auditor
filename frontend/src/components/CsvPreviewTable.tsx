type Props = {
  headers: string[];
  rows: string[][];
};

export default function CsvPreviewTable({ headers, rows }: Props) {
  return (
    <table style={{ borderCollapse: "collapse", minWidth: 640, width: "100%" }}>
      <thead>
        <tr>
          {headers.map((h, idx) => (
            <th
              key={idx}
              style={{
                textAlign: "left",
                padding: "6px 8px",
                borderBottom: "1px solid #eee",
                background: "#fafafa",
                position: "sticky",
                top: 0,
              }}
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
              <td
                key={cIdx}
                style={{
                  padding: "6px 8px",
                  borderBottom: "1px solid #f3f3f3",
                }}
              >
                {row[cIdx] ?? ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
