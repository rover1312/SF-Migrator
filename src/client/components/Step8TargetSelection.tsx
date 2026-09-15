import { useMigrationStore } from '../store/migrationStore';
import { Badge, Button, Card, Notice, TextInput } from './ui';

/** Step 8 — pick load targets and the insert/update/upsert strategy. */
export default function Step8TargetSelection() {
  const { targetOrgs, loadTargets, toggleLoadTarget, strategy, setStrategy, setStep } =
    useMigrationStore();

  if (targetOrgs.length === 0) return <Notice kind="warn">Add target orgs first (Step 3).</Notice>;

  return (
    <section>
      <h2>8. Targets for loading</h2>
      <Card title="Which orgs receive data?">
        {targetOrgs.map((org) => (
          <label key={org.orgId} style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
            <input
              type="checkbox"
              checked={loadTargets.includes(org.orgId)}
              onChange={() => toggleLoadTarget(org.orgId)}
            />
            <span>
              <strong>{org.nickname}</strong> <Badge color="green">connected</Badge>
            </span>
          </label>
        ))}
      </Card>
      <Card title="Loading strategy">
        <label style={{ display: 'block', marginBottom: 8 }}>
          <span style={{ display: 'block', fontSize: 12, color: '#555' }}>Operation</span>
          <select
            value={strategy.operation}
            onChange={(e) =>
              setStrategy({ operation: e.target.value as 'insert' | 'update' | 'upsert' })
            }
          >
            <option value="insert">Insert</option>
            <option value="update">Update</option>
            <option value="upsert">Upsert</option>
          </select>
        </label>
        {strategy.operation === 'upsert' && (
          <TextInput
            label="External ID field"
            value={strategy.externalIdField}
            onChange={(v) => setStrategy({ externalIdField: v })}
            placeholder="External_Id__c"
          />
        )}
        <TextInput
          label="Batch size (1 – 10000)"
          type="number"
          value={strategy.batchSize}
          onChange={(v) => setStrategy({ batchSize: Number(v) || 200 })}
        />
        <label style={{ display: 'flex', gap: 8 }}>
          <input
            type="checkbox"
            checked={strategy.stopOnError}
            onChange={(e) => setStrategy({ stopOnError: e.target.checked })}
          />
          Stop on first error (otherwise log and continue)
        </label>
      </Card>
      {loadTargets.length === 0 && <Notice kind="warn">Select at least one target org.</Notice>}
      <Button primary disabled={loadTargets.length === 0} onClick={() => setStep(9)}>
        Continue to validation
      </Button>
    </section>
  );
}
