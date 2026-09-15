import { BulkIngest, type BulkTransport } from '../../src/server/services/bulk.service';
import { parseCsv, toCsv } from '../../src/server/utils/csv';

function fakeTransport(scenario: 'clean' | 'with-failures'): BulkTransport {
  const calls: string[] = [];
  return async ({ method, url, body }) => {
    calls.push(`${method} ${url}`);
    if (method === 'POST') return { id: 'job-1', state: 'Open' };
    if (method === 'PUT') {
      expect(typeof body).toBe('string');
      return {};
    }
    if (method === 'PATCH') return {};
    if (url.endsWith('/failedResults/')) return 'sf__Id,sf__Error\n,BAD';
    return {
      id: 'job-1',
      state: 'JobComplete',
      numberRecordsProcessed: 2,
      numberRecordsFailed: scenario === 'with-failures' ? 1 : 0,
    };
  };
}

describe('bulk ingest', () => {
  it('round-trips CSV with quotes, commas, and newlines', () => {
    const columns = ['a', 'b'];
    const rows = [
      { a: 'x,y', b: 'q"q' },
      { a: 'line1\nline2', b: '' },
    ];
    const parsed = parseCsv(toCsv(columns, rows));
    expect(parsed.columns).toEqual(columns);
    expect(parsed.rows).toEqual([
      { a: 'x,y', b: 'q"q' },
      { a: 'line1\nline2', b: '' },
    ]);
  });

  it('runs create/upload/close/poll for a clean job', async () => {
    const bulk = new BulkIngest(fakeTransport('clean'), '60.0', 1, 5);
    const summary = await bulk.run('Account', 'insert', ['Name'], [{ Name: 'Acme' }]);
    expect(summary).toMatchObject({ jobId: 'job-1', state: 'JobComplete', recordsFailed: 0 });
    expect(summary.failedCsv).toBeUndefined();
  });

  it('fetches failed results when records fail', async () => {
    const bulk = new BulkIngest(fakeTransport('with-failures'), '60.0', 1, 5);
    const summary = await bulk.run('Account', 'insert', ['Name'], [{ Name: 'Acme' }]);
    expect(summary.recordsFailed).toBe(1);
    expect(summary.failedCsv).toContain('sf__Error');
  });

  it('requires an external ID for upsert', async () => {
    const bulk = new BulkIngest(fakeTransport('clean'), '60.0', 1, 5);
    await expect(bulk.run('Account', 'upsert', ['Name'], [{ Name: 'x' }])).rejects.toThrow(
      /externalIdField/,
    );
  });
});
