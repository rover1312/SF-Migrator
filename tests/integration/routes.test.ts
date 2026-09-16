import type { Server } from 'node:http';
import type { Connection } from 'jsforce';
import app from '../../src/server/index';
import { orgStore } from '../../src/server/services/org-store';
import { salesforceService } from '../../src/server/services/salesforce.service';
import { config } from '../../src/server/utils/config';

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

  it('refuses OAuth URLs when no connected app is configured', async () => {
    // No SF_CLIENT_ID in test env, so this must fail fast with setup help
    // instead of handing Salesforce a blank client_id (invalid_client_id).
    const res = await json(
      await fetch(`${base}/api/auth/oauth-url?loginUrl=https://login.salesforce.com`),
    );
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('OAUTH_NOT_CONFIGURED');
    expect(res.error.message).toMatch(/SF_CLIENT_ID/);
  });

  it('answers OAuth callbacks missing code/state with a popup page', async () => {
    const res = await fetch(`${base}/api/auth/callback`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('sf-migrator-oauth');
    expect(html).toContain('"ok":false');
  });

  it('rejects OAuth callbacks with unknown state', async () => {
    const html = await (await fetch(`${base}/api/auth/callback?code=abc&state=nope`)).text();
    expect(html).toContain('Unknown or expired OAuth state');
  });

  it('completes the OAuth handshake with a stubbed Salesforce', async () => {
    // Simulate a configured connected app + Salesforce code exchange.
    const saved = { ...config.salesforce };
    const origExchange = salesforceService.exchangeCode.bind(salesforceService);
    const origConnect = salesforceService.connectWithTokens.bind(salesforceService);
    config.salesforce.clientId = 'test-client-id';
    config.salesforce.clientSecret = 'test-secret';
    config.salesforce.redirectUri = 'http://localhost:3001/api/auth/callback';
    salesforceService.exchangeCode = async () => ({
      accessToken: 'stub-access',
      instanceUrl: 'https://stub.salesforce.com',
      refreshToken: 'stub-refresh',
      sfOrgId: 'stub-org',
      sfUserId: 'stub-user',
    });
    salesforceService.connectWithTokens = async (orgId: string) => {
      salesforceService.setConnection(orgId, {} as unknown as Connection);
      return {} as unknown as Connection;
    };
    let orgId = '';
    try {
      const issued = await json(
        await fetch(
          `${base}/api/auth/oauth-url?loginUrl=https://login.salesforce.com&nickname=oauth-test`,
        ),
      );
      expect(issued.success).toBe(true);
      expect(issued.data.url).toContain('client_id=test-client-id');
      expect(issued.data.url).toContain(`state=${issued.data.state}`);

      const html = await (
        await fetch(`${base}/api/auth/callback?code=authcode&state=${issued.data.state}`)
      ).text();
      expect(html).toContain('sf-migrator-oauth');
      expect(html).toContain('"ok":true');
      orgId = (html.match(/"orgId":"([^"]+)"/) ?? [])[1] ?? '';
      expect(orgId).not.toBe('');

      // Org is registered and reusable without the popup.
      expect(await orgStore.get(orgId)).toMatchObject({ nickname: 'oauth-test' });

      // Single-use state: replaying the callback fails.
      const replay = await (
        await fetch(`${base}/api/auth/callback?code=authcode&state=${issued.data.state}`)
      ).text();
      expect(replay).toContain('Unknown or expired OAuth state');
    } finally {
      Object.assign(config.salesforce, saved);
      salesforceService.exchangeCode = origExchange;
      salesforceService.connectWithTokens = origConnect;
      if (orgId) {
        salesforceService.disconnect(orgId);
        await orgStore.remove(orgId);
      }
    }
  });
});
