import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { orgStore } from '../services/org-store';
import { isOAuthConfigured, salesforceService } from '../services/salesforce.service';
import { fail, ok } from '../utils/api-response';

const router = Router();

/** Pending OAuth logins: state -> context. Entries expire after 10 minutes. */
const pendingOAuth = new Map<string, { nickname: string; loginUrl: string; createdAt: number }>();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function takePendingOAuth(state: string): { nickname: string; loginUrl: string } | undefined {
  const now = Date.now();
  for (const [key, value] of pendingOAuth) {
    if (now - value.createdAt > OAUTH_STATE_TTL_MS) pendingOAuth.delete(key);
  }
  const found = pendingOAuth.get(state);
  if (found) pendingOAuth.delete(state);
  return found;
}

/**
 * Render the popup-closing page. Posts `{ source: 'sf-migrator-oauth', ... }`
 * to the opener window (the wizard) and closes itself. The payload is
 * JSON-serialized server-side so nothing user-controlled becomes code.
 */
function oauthPopupPage(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `<!doctype html><html><body><script>
window.opener && window.opener.postMessage(Object.assign({ source: 'sf-migrator-oauth' }, ${json}), '*');
window.close();
</script><p>You can close this window and return to SF-Migrator.</p></body></html>`;
}

interface LoginBody {
  orgId?: string;
  nickname?: string;
  loginUrl?: string;
  username?: string;
  password?: string;
  securityToken?: string;
  accessToken?: string;
  instanceUrl?: string;
  refreshToken?: string;
}

// POST /api/auth/org — connect with username/password (+ token) or OAuth tokens.
router.post('/org', async (req, res) => {
  const body = req.body as LoginBody;
  const orgId = body.orgId ?? randomUUID();
  const nickname = body.nickname ?? 'org';
  const loginUrl = body.loginUrl ?? 'https://login.salesforce.com';
  try {
    if (body.accessToken && body.instanceUrl) {
      await salesforceService.connectWithTokens(orgId, {
        accessToken: body.accessToken,
        instanceUrl: body.instanceUrl,
        refreshToken: body.refreshToken,
      });
      await orgStore.save({
        orgId,
        nickname,
        loginUrl,
        instanceUrl: body.instanceUrl,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        connectedAt: new Date().toISOString(),
      });
    } else if (body.username && body.password) {
      await salesforceService.connectWithCredentials(orgId, {
        loginUrl,
        username: body.username,
        password: body.password,
        securityToken: body.securityToken,
      });
      await orgStore.save({
        orgId,
        nickname,
        loginUrl,
        username: body.username,
        connectedAt: new Date().toISOString(),
      });
    } else {
      fail(res, 400, 'BAD_REQUEST', 'Provide username+password or accessToken+instanceUrl');
      return;
    }
    ok(res, { orgId, nickname, connected: true });
  } catch (err) {
    fail(res, 401, 'AUTH_FAILED', (err as Error).message);
  }
});

// GET /api/auth/oauth-url?loginUrl=...&nickname=... — start the OAuth flow.
// Fails fast with setup instructions when no connected app is configured,
// instead of handing Salesforce a blank client_id (invalid_client_id).
router.get('/oauth-url', (req, res) => {
  if (!isOAuthConfigured()) {
    fail(
      res,
      400,
      'OAUTH_NOT_CONFIGURED',
      'OAuth is not configured. Create a Salesforce connected app with callback URL ' +
        '(default http://localhost:3001/api/auth/callback), set SF_CLIENT_ID, SF_CLIENT_SECRET ' +
        'and SF_REDIRECT_URI in .env, then restart the server. Username/password login works without this.',
    );
    return;
  }
  const loginUrl =
    typeof req.query.loginUrl === 'string' ? req.query.loginUrl : 'https://login.salesforce.com';
  const nickname =
    typeof req.query.nickname === 'string' && req.query.nickname ? req.query.nickname : 'org';
  const state = randomUUID();
  pendingOAuth.set(state, { nickname, loginUrl, createdAt: Date.now() });
  ok(res, { url: salesforceService.getAuthorizationUrl(loginUrl, state), state });
});

// GET /api/auth/callback?code=...&state=... — Salesforce redirects here.
// Exchanges the code, registers the org, and hands the result to the wizard
// popup via postMessage.
router.get('/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const send = (payload: Record<string, unknown>): void => {
    res.status(200).type('html').send(oauthPopupPage(payload));
  };
  if (!code || !state) {
    send({ ok: false, error: 'Missing code or state in OAuth callback.' });
    return;
  }
  const pending = takePendingOAuth(state);
  if (!pending) {
    send({ ok: false, error: 'Unknown or expired OAuth state. Please start login again.' });
    return;
  }
  try {
    const tokens = await salesforceService.exchangeCode(code);
    const orgId = randomUUID();
    await salesforceService.connectWithTokens(orgId, tokens);
    await orgStore.save({
      orgId,
      nickname: pending.nickname,
      loginUrl: pending.loginUrl,
      instanceUrl: tokens.instanceUrl,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sfOrgId: tokens.sfOrgId,
      connectedAt: new Date().toISOString(),
    });
    send({ ok: true, orgId, nickname: pending.nickname, loginUrl: pending.loginUrl });
  } catch (err) {
    send({ ok: false, error: (err as Error).message });
  }
});

// GET /api/auth/orgs — list locally registered orgs.
router.get('/orgs', async (_req, res) => {
  const orgs = (await orgStore.loadAll()).map((o) => ({ ...o, accessToken: undefined }));
  ok(res, orgs);
});

// POST /api/auth/logout — disconnect and forget an org.
router.post('/logout', async (req, res) => {
  const { orgId } = req.body as { orgId?: string };
  if (!orgId) {
    fail(res, 400, 'BAD_REQUEST', 'orgId is required');
    return;
  }
  salesforceService.disconnect(orgId);
  await orgStore.remove(orgId);
  ok(res, { orgId, connected: false });
});

export default router;
