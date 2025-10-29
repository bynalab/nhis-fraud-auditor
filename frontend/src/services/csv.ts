export type CsvPreview = {
  headers: string[];
  rows: string[][]; // up to maxRows
  totalRowsEstimated: number; // excluding header
};

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((cell) => cell.trim());
}

export function parseCsvPreview(text: string, maxRows = 20): CsvPreview {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [], totalRowsEstimated: 0 };
  }
  const headers = splitCsvLine(lines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length && rows.length < maxRows; i++) {
    rows.push(splitCsvLine(lines[i]));
  }
  const totalRowsEstimated = Math.max(0, lines.length - 1);
  return { headers, rows, totalRowsEstimated };
}
