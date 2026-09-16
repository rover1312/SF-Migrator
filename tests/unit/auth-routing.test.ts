import type { Connection } from 'jsforce';
import { SalesforceService, isOAuthConfigured } from '../../src/server/services/salesforce.service';
import { config } from '../../src/server/utils/config';

describe("password login routing (Summer '27 SOAP login() retirement)", () => {
  const saved = { ...config.salesforce };
  afterEach(() => {
    Object.assign(config.salesforce, saved);
  });

  it('reports whether OAuth is configured', () => {
    expect(isOAuthConfigured()).toBe(false);
    config.salesforce.clientId = 'id';
    config.salesforce.clientSecret = 'secret';
    config.salesforce.redirectUri = 'http://localhost:3001/api/auth/callback';
    expect(isOAuthConfigured()).toBe(true);
  });

  it('uses the OAuth password flow when a connected app exists', async () => {
    config.salesforce.clientId = 'id';
    config.salesforce.clientSecret = 'secret';
    config.salesforce.redirectUri = 'http://localhost:3001/api/auth/callback';
    const svc = new SalesforceService();
    const seen: { user: string; pass: string }[] = [];
    const origConnect = svc.connectWithTokens.bind(svc);
    void origConnect;
    svc.connectWithTokens = async (orgId: string) => {
      svc.setConnection(orgId, {} as unknown as Connection);
      return {} as unknown as Connection;
    };
    try {
      const fakeOAuth2 = {
        authenticate: async (user: string, pass: string) => {
          seen.push({ user, pass });
          return {
            token_type: 'Bearer' as const,
            scope: 'api refresh_token',
            id: 'https://login.salesforce.com/id/org/user',
            access_token: 'a',
            instance_url: 'https://stub.salesforce.com',
            refresh_token: 'r',
            signature: 'sig',
            issued_at: '0',
          };
        },
      };
      await svc.connectWithCredentials(
        'org-1',
        {
          loginUrl: 'https://login.salesforce.com',
          username: 'u',
          password: 'p',
          securityToken: 'T',
        },
        { oauth2: fakeOAuth2 },
      );
      // Security token appended exactly like SOAP login required.
      expect(seen).toEqual([{ user: 'u', pass: 'pT' }]);
      expect(svc.requireConnection('org-1')).toBeDefined();
    } finally {
      svc.disconnect('org-1');
    }
  });

  it('falls back to legacy SOAP login without a connected app', async () => {
    const svc = new SalesforceService();
    let soapCalled = false;
    svc.loginViaSoap = async () => {
      soapCalled = true;
      return {} as unknown as Connection;
    };
    await svc.connectWithCredentials('org-2', {
      loginUrl: 'https://login.salesforce.com',
      username: 'u',
      password: 'p',
    });
    expect(soapCalled).toBe(true);
  });
});
