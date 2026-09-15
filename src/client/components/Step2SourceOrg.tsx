import { useState } from 'react';
import { useMigrationStore } from '../store/migrationStore';
import { api } from '../utils/api-client';
import { Badge, Button, Card, Notice, TextInput } from './ui';

/** Step 2 — connect the source org (username/password or OAuth tokens). */
export default function Step2SourceOrg() {
  const { sourceOrg, setSourceOrg, setStep } = useMigrationStore();
  const [nickname, setNickname] = useState(sourceOrg?.nickname ?? 'prod');
  const [loginUrl, setLoginUrl] = useState(sourceOrg?.loginUrl ?? 'https://login.salesforce.com');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [securityToken, setSecurityToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function oauthUrl(): Promise<void> {
    const data = await api.get<{ url: string }>(
      `/api/auth/oauth-url?loginUrl=${encodeURIComponent(loginUrl)}`,
    );
    window.open(data.url, '_blank', 'noopener');
  }

  return (
    <section>
      <h2>2. Source org</h2>
      {sourceOrg?.connected ? (
        <Card title="Connected">
          <p>
            <Badge color="green">connected</Badge> {sourceOrg.nickname} — {sourceOrg.loginUrl}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => void disconnect()}>Disconnect</Button>
            <Button primary onClick={() => setStep(3)}>
              Continue
            </Button>
          </div>
        </Card>
      ) : (
        <Card title="Connect the org to extract from">
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
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              primary
              onClick={() => void connect()}
              disabled={busy || !username || !password}
            >
              {busy ? 'Connecting…' : 'Connect'}
            </Button>
            <Button onClick={() => void oauthUrl()}>Get OAuth login URL</Button>
          </div>
        </Card>
      )}
    </section>
  );
}
