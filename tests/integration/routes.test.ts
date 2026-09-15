import type { Server } from 'node:http';
import app from '../../src/server/index';

/* eslint-disable @typescript-eslint/no-explicit-any */
async function json(res: Response): Promise<any> {
  return (await res.json()) as unknown;
}

/** Route-level tests against a live ephemeral server (no Salesforce needed). */
describe('http routes', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const validConfig = {
    version: 1,
    sourceOrg: { nickname: 'prod', loginUrl: 'https://login.salesforce.com' },
    targetOrgs: [{ nickname: 'sandbox', loginUrl: 'https://test.salesforce.com' }],
    objects: [{ name: 'Account', order: 0 }],
    fields: { Account: ['Name'] },
    filters: [],
    extraction: { format: 'csv', batchSize: 1000 },
    loading: { operation: 'insert', batchSize: 200, stopOnError: false },
  };

  it('serves the health check', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect((await json(res)).status).toBe('ok');
  });

  it('exports a config and re-imports it via multipart upload', async () => {
    const exported = await json(
      await fetch(`${base}/api/config/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: validConfig, format: 'json' }),
      }),
    );
    expect(exported.success).toBe(true);

    const form = new FormData();
    form.append(
      'file',
      new Blob([exported.data.content], { type: 'application/json' }),
      'cfg.json',
    );
    const imported = await json(
      await fetch(`${base}/api/config/import`, { method: 'POST', body: form }),
    );
    expect(imported.success).toBe(true);
    expect(imported.data.config).toEqual(validConfig);
  });

  it('rejects invalid configs with details', async () => {
    const res = await json(
      await fetch(`${base}/api/config/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { version: 1 }, format: 'json' }),
      }),
    );
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_CONFIG');
  });

  it('returns 404 for unknown jobs', async () => {
    const res = await json(await fetch(`${base}/api/extract/status?id=nope`));
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('NOT_FOUND');
  });
});
