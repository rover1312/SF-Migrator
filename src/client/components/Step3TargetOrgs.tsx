import { useState } from 'react';
import { useMigrationStore } from '../store/migrationStore';
import { api } from '../utils/api-client';
import { Badge, Button, Card, Notice, TextInput } from './ui';

/** Step 3 — register one or more target orgs (must differ from the source). */
export default function Step3TargetOrgs() {
  const { sourceOrg, targetOrgs, addTargetOrg, removeTargetOrg, setStep } = useMigrationStore();
  const [nickname, setNickname] = useState('');
  const [loginUrl, setLoginUrl] = useState('https://test.salesforce.com');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [securityToken, setSecurityToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      <h2>3. Target orgs</h2>
      {targetOrgs.map((org) => (
        <Card key={org.orgId} title={org.nickname}>
          <p>
            <Badge color="green">connected</Badge> {org.loginUrl}
          </p>
          <Button onClick={() => void remove(org.orgId)}>Remove</Button>
        </Card>
      ))}
      {targetOrgs.length < 10 && (
        <Card title="Add target org">
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
          <Button
            primary
            onClick={() => void add()}
            disabled={busy || !nickname || !username || !password}
          >
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
