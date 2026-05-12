export type CsvCell = string | number | boolean | Date | null | undefined;

export function csvEscape(v: CsvCell): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  const s = typeof v === "string" ? v : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvRow(cells: ReadonlyArray<CsvCell>): string {
  return cells.map(csvEscape).join(",") + "\r\n";
}

export function csvHeader(cols: ReadonlyArray<string>): string {
  return csvRow(cols);
}
