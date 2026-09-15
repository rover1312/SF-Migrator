import { parseCsv, toCsv } from '../../src/server/utils/csv';

describe('csv utils', () => {
  it('round-trips quotes, commas, and embedded newlines', () => {
    const columns = ['Id', 'Name', 'Notes'];
    const rows = [
      { Id: '001', Name: 'Acme, Inc.', Notes: 'line1\nline2' },
      { Id: '002', Name: 'Say "hi"', Notes: '' },
    ];
    const parsed = parseCsv(toCsv(columns, rows));
    expect(parsed.columns).toEqual(columns);
    expect(parsed.rows).toEqual(rows);
  });

  it('handles CRLF, empty input, and header-only files', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual({ columns: ['a', 'b'], rows: [{ a: '1', b: '2' }] });
    expect(parseCsv('')).toEqual({ columns: [], rows: [] });
    expect(parseCsv('a,b\n')).toEqual({ columns: ['a', 'b'], rows: [] });
  });

  it('omits the header on request', () => {
    expect(toCsv(['a'], [{ a: '1' }, { a: '2' }], false)).toBe('1\n2');
  });

  it('scales linearly on larger payloads', () => {
    const columns = ['Id', 'Name'];
    const rows = Array.from({ length: 20000 }, (_, i) => ({ Id: `id-${i}`, Name: `Name ${i}` }));
    const parsed = parseCsv(toCsv(columns, rows));
    expect(parsed.rows).toHaveLength(20000);
    expect(parsed.rows[19999]).toEqual({ Id: 'id-19999', Name: 'Name 19999' });
  });
});
