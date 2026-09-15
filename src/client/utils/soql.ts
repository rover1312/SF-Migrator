/** Client-side SOQL preview. Mirrors src/server/utils/soql.ts (preview only). */

export interface PreviewFilter {
  field: string;
  operator: string;
  value: string;
}

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'IN', 'NOT IN', 'LIKE'];

function quote(value: string): string {
  const trimmed = value.trim();
  if (trimmed !== '' && Number.isFinite(Number(trimmed))) return trimmed;
  const upper = trimmed.toUpperCase();
  if (upper === 'TRUE' || upper === 'FALSE' || upper === 'NULL') return upper;
  return `'${trimmed.replace(/'/g, "\\'")}'`;
}

export function previewWhere(filters: PreviewFilter[]): string {
  const parts: string[] = [];
  for (const f of filters) {
    if (!f.field) continue;
    const op = f.operator.toUpperCase();
    if (!OPERATORS.includes(op)) continue;
    if (op === 'IN' || op === 'NOT IN') {
      const values = f.value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
        .map(quote);
      if (values.length === 0) continue;
      parts.push(`${f.field} ${op} (${values.join(', ')})`);
    } else {
      parts.push(`${f.field} ${op} ${quote(f.value)}`);
    }
  }
  return parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '';
}

export function previewSelect(object: string, fields: string[], filters: PreviewFilter[]): string {
  const cols = fields.length > 0 ? fields.join(', ') : 'Id';
  const where = previewWhere(filters);
  return `SELECT ${cols} FROM ${object}${where ? ` ${where}` : ''}`;
}
