import { useEffect, useState } from 'react';
import { useOAuthLogin } from '../hooks/useOAuth';
import { useMigrationStore } from '../store/migrationStore';
import { api } from '../utils/api-client';
import { Badge, Button, Card, Notice, TextInput } from './ui';

/** Step 2 — connect the source org (Salesforce login or username/password). */
export default function Step2SourceOrg() {
  const { sourceOrg, setSourceOrg, setStep } = useMigrationStore();
  const oauth = useOAuthLogin();
  const [passwordFlow, setPasswordFlow] = useState<'oauth' | 'soap-legacy' | null>(null);
  const [nickname, setNickname] = useState(sourceOrg?.nickname ?? 'prod');
  const [loginUrl, setLoginUrl] = useState(sourceOrg?.loginUrl ?? 'https://login.salesforce.com');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [securityToken, setSecurityToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ passwordFlow: 'oauth' | 'soap-legacy' }>('/api/auth/methods')
      .then((m) => setPasswordFlow(m.passwordFlow))
      .catch(() => setPasswordFlow(null));
  }, []);

  async function connect(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const data = await api.post<{ orgId: string; nickname: string; connected: boolean }>(
        '/api/auth/org',
        { nickname, loginUrl, username, password, securityToken: securityToken || undefined },
      );
      setSourceOrg({ orgId: data.orgId, nickname, loginUrl, connected: data.connected });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(): Promise<void> {
    if (!sourceOrg) return;
    await api.post('/api/auth/logout', { orgId: sourceOrg.orgId });
    setSourceOrg(null);
  }

  async function oauthLogin(): Promise<void> {
    setError(null);
    try {
      const result = await oauth.login(loginUrl, nickname);
      setSourceOrg({ orgId: result.orgId, nickname, loginUrl, connected: true });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section>
      <h2 className="ui-h2">2. Source org</h2>
      {sourceOrg?.connected ? (
        <Card title="Connected">
          <p>
            <Badge color="green">connected</Badge> {sourceOrg.nickname} — {sourceOrg.loginUrl}
          </p>
          <div className="ui-btnrow">
            <Button onClick={() => void disconnect()}>Disconnect</Button>
            <Button primary onClick={() => setStep(3)}>
              Continue
            </Button>
          </div>
        </Card>
      ) : (
        <Card title="Connect the org to extract from" tint="mint">
          {passwordFlow === 'oauth' && (
            <Notice kind="ok">
              Password login uses the OAuth flow — safe beyond Summer &apos;27.
            </Notice>
          )}
          {passwordFlow === 'soap-legacy' && (
            <Notice kind="warn">
              No connected app configured: password login uses legacy SOAP, which retires Summer
              &apos;27. Add one to switch to OAuth (see Setup guide).
            </Notice>
          )}
          <TextInput label="Nickname" value={nickname} onChange={setNickname} />
          <TextInput label="Login URL" value={loginUrl} onChange={setLoginUrl} />
          <TextInput label="Username" value={username} onChange={setUsername} />
          <TextInput label="Password" value={password} onChange={setPassword} type="password" />
          <TextInput
            label="Security token (if required)"
            value={securityToken}
            onChange={setSecurityToken}
            type="password"
          />
          {error && <Notice kind="error">{error}</Notice>}
          {oauth.error && <Notice kind="error">{oauth.error}</Notice>}
          <div className="ui-btnrow">
            <Button primary onClick={() => void oauthLogin()} disabled={oauth.busy || !nickname}>
              {oauth.busy ? 'Waiting for Salesforce…' : 'Connect with Salesforce'}
            </Button>
          </div>
          <p className="ui-muted">Or connect with a username and password:</p>
          <div className="ui-btnrow">
            <Button onClick={() => void connect()} disabled={busy || !username || !password}>
              {busy ? 'Connecting…' : 'Connect with password'}
            </Button>
          </div>
        </Card>
      )}
    </section>
  );
}
