/** SOQL query builder. All identifiers/literals are escaped; never interpolate raw UI input. */

export interface FilterInput {
  field: string;
  operator: string;
  value: string;
}

const OPERATORS = new Set(['=', '!=', '>', '<', '>=', '<=', 'IN', 'NOT IN', 'LIKE']);
const IDENT_PATTERN = /^[A-Za-z_][A-Za-z0-9_.]*$/;

/** Validate a field/object identifier (allows relationship dots). Throws on abuse. */
export function escapeIdent(name: string): string {
  if (!IDENT_PATTERN.test(name)) {
    throw new Error(`Invalid SOQL identifier: ${name}`);
  }
  return name;
}

/** Quote a SOQL string literal. */
export function escapeLiteral(value: string): string {
  return `'${value.replace(/'/g, "\\'")}'`;
}

function formatValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed !== '' && Number.isFinite(Number(trimmed))) return trimmed;
  const upper = trimmed.toUpperCase();
  if (upper === 'TRUE' || upper === 'FALSE' || upper === 'NULL') return upper;
  return escapeLiteral(trimmed);
}

export function buildCondition(filter: FilterInput): string {
  const field = escapeIdent(filter.field);
  const operator = filter.operator.toUpperCase();
  if (!OPERATORS.has(operator)) {
    throw new Error(`Unsupported operator: ${filter.operator}`);
  }
  if (operator === 'IN' || operator === 'NOT IN') {
    const values = filter.value
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v !== '')
      .map(formatValue);
    if (values.length === 0) throw new Error(`IN operator needs at least one value`);
    return `${field} ${operator} (${values.join(', ')})`;
  }
  return `${field} ${operator} ${formatValue(filter.value)}`;
}

/** Render `WHERE a AND b` or an empty string when there are no filters. */
export function buildWhere(filters: FilterInput[]): string {
  if (filters.length === 0) return '';
  return `WHERE ${filters.map(buildCondition).join(' AND ')}`;
}

export interface SelectArgs {
  object: string;
  fields: string[];
  filters?: FilterInput[];
  orderBy?: string;
  limit?: number;
}

export function buildSelect(args: SelectArgs): string {
  if (args.fields.length === 0) throw new Error('Select needs at least one field');
  const parts = [
    `SELECT ${args.fields.map(escapeIdent).join(', ')}`,
    `FROM ${escapeIdent(args.object)}`,
  ];
  const where = buildWhere(args.filters ?? []);
  if (where) parts.push(where);
  if (args.orderBy) parts.push(`ORDER BY ${escapeIdent(args.orderBy)}`);
  if (args.limit !== undefined) {
    if (!Number.isInteger(args.limit) || args.limit < 1) throw new Error('Invalid limit');
    parts.push(`LIMIT ${args.limit}`);
  }
  return parts.join(' ');
}

export function buildCount(object: string, filters: FilterInput[] = []): string {
  const parts = [`SELECT COUNT()`, `FROM ${escapeIdent(object)}`];
  const where = buildWhere(filters);
  if (where) parts.push(where);
  return parts.join(' ');
}
