/** Minimal RFC-4180 CSV writer/reader (no dependencies). */

export function toCsv(
  columns: string[],
  rows: Record<string, unknown>[],
  includeHeader = true,
): string {
  const cell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = rows.map((row) => columns.map((c) => cell(row[c])).join(','));
  if (includeHeader) lines.unshift(columns.map(cell).join(','));
  return lines.join('\n');
}

export interface ParsedCsv {
  columns: string[];
  rows: Record<string, string>[];
}

/** Parse CSV text, honoring quoted cells (including embedded newlines). */
export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = '';
  let quoted = false;
  let i = 0;
  const endCell = (): void => {
    current.push(cell);
    cell = '';
  };
  const endRow = (): void => {
    endCell();
    rows.push(current);
    current = [];
  };
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 2;
      } else if (ch === '"') {
        quoted = false;
        i += 1;
      } else {
        cell += ch;
        i += 1;
      }
    } else if (ch === '"') {
      quoted = true;
      i += 1;
    } else if (ch === ',') {
      endCell();
      i += 1;
    } else if (ch === '\r' || ch === '\n') {
      endRow();
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1;
    } else {
      cell += ch;
      i += 1;
    }
  }
  if (cell !== '' || current.length > 0) endRow();
  // Drop the phantom row a trailing newline leaves behind.
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === '')) rows.pop();
  if (rows.length === 0) return { columns: [], rows: [] };
  const [columns, ...data] = rows;
  return {
    columns,
    rows: data.map((cells) => Object.fromEntries(columns.map((c, idx) => [c, cells[idx] ?? '']))),
  };
}
