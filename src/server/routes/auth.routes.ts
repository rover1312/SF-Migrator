import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { orgStore } from '../services/org-store';
import { salesforceService } from '../services/salesforce.service';
import { fail, ok } from '../utils/api-response';

const router = Router();

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

// GET /api/auth/oauth-url?loginUrl=... — start the OAuth web-server flow.
router.get('/oauth-url', (req, res) => {
  const loginUrl =
    typeof req.query.loginUrl === 'string' ? req.query.loginUrl : 'https://login.salesforce.com';
  ok(res, { url: salesforceService.getAuthorizationUrl(loginUrl, randomUUID()) });
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
