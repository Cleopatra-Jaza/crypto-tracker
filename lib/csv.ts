export function escapeCsvCell(t: unknown): string {
  const s = String(t ?? "");
  let out = s.replace(/"/g, '""');
  if (/^[=+\-@]/.test(s)) out = "'" + out;
  return '"' + out + '"';
}

export function buildCsv(lines: string[]): string {
  return "\uFEFF" + lines.join("\n");
}
