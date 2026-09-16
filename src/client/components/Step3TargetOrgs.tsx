import { useState } from 'react';
import { useOAuthLogin } from '../hooks/useOAuth';
import { useMigrationStore } from '../store/migrationStore';
import { api } from '../utils/api-client';
import { Badge, Button, Card, Notice, TextInput } from './ui';

/** Step 3 — register one or more target orgs (must differ from the source). */
export default function Step3TargetOrgs() {
  const { sourceOrg, targetOrgs, addTargetOrg, removeTargetOrg, setStep } = useMigrationStore();
  const oauth = useOAuthLogin();
  const [nickname, setNickname] = useState('');
  const [loginUrl, setLoginUrl] = useState('https://test.salesforce.com');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [securityToken, setSecurityToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function nicknameTaken(name: string): Promise<boolean> {
    if (sourceOrg && name === sourceOrg.nickname) return true;
    return targetOrgs.some((o) => o.nickname === name);
  }

  async function oauthAdd(): Promise<void> {
    setError(null);
    if (await nicknameTaken(nickname)) {
      setError('Target nickname must be unique and differ from the source org nickname.');
      return;
    }
    try {
      const result = await oauth.login(loginUrl, nickname);
      addTargetOrg({ orgId: result.orgId, nickname, loginUrl, connected: true });
      setNickname('');
    } catch {
      // Error is already surfaced via oauth.error.
    }
  }

  async function add(): Promise<void> {
    setError(null);
    if (sourceOrg && nickname === sourceOrg.nickname) {
      setError('Target nickname must differ from the source org nickname.');
      return;
    }
    setBusy(true);
    try {
      const data = await api.post<{ orgId: string }>('/api/auth/org', {
        nickname,
        loginUrl,
        username,
        password,
        securityToken: securityToken || undefined,
      });
      addTargetOrg({ orgId: data.orgId, nickname, loginUrl, connected: true });
      setNickname('');
      setUsername('');
      setPassword('');
      setSecurityToken('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(orgId: string): Promise<void> {
    await api.post('/api/auth/logout', { orgId });
    removeTargetOrg(orgId);
  }

  return (
    <section>
      <h2 className="ui-h2">3. Target orgs</h2>
      {targetOrgs.map((org) => (
        <Card key={org.orgId} title={org.nickname}>
          <p>
            <Badge color="green">connected</Badge> {org.loginUrl}
          </p>
          <Button onClick={() => void remove(org.orgId)}>Remove</Button>
        </Card>
      ))}
      {targetOrgs.length < 10 && (
        <Card title="Add target org" tint="rose">
          <TextInput label="Nickname (unique)" value={nickname} onChange={setNickname} />
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
            <Button primary onClick={() => void oauthAdd()} disabled={oauth.busy || !nickname}>
              {oauth.busy ? 'Waiting for Salesforce…' : 'Connect with Salesforce'}
            </Button>
          </div>
          <p className="ui-muted">Or add with a username and password:</p>
          <Button onClick={() => void add()} disabled={busy || !nickname || !username || !password}>
            {busy ? 'Adding…' : 'Add target org'}
          </Button>
        </Card>
      )}
      <Button primary disabled={targetOrgs.length === 0} onClick={() => setStep(4)}>
        Continue{targetOrgs.length === 0 ? ' (add at least one target)' : ''}
      </Button>
    </section>
  );
}
