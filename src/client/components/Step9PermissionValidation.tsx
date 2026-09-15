import { useState } from 'react';
import { useMigrationStore } from '../store/migrationStore';
import { api } from '../utils/api-client';
import { buildMigrationConfig } from '../utils/build-config';
import { Badge, Button, Card, Notice } from './ui';

interface Check {
  object: string;
  field: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

interface Report {
  targetOrgId: string;
  operation: string;
  checks: Check[];
  passed: number;
  failed: number;
  warnings: number;
  canProceed: boolean;
}

/** Step 9 — pre-flight permission checks per target; failures block loading. */
export default function Step9PermissionValidation() {
  const store = useMigrationStore();
  const { targetOrgs, loadTargets, setStep } = store;
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targets = targetOrgs.filter((o) => loadTargets.includes(o.orgId));
  if (targets.length === 0) return <Notice kind="warn">Select load targets first (Step 8).</Notice>;

  async function run(orgId: string): Promise<void> {
    setError(null);
    setRunning(orgId);
    try {
      const config = buildMigrationConfig({
        sourceOrg: store.sourceOrg!,
        loadTargets: targets,
        selectedObjects: store.selectedObjects,
        objectLabels: store.objectLabels,
        selectedFields: store.selectedFields,
        filters: store.filters,
        extraction: store.extraction,
        strategy: store.strategy,
        lookups: store.lookups,
      });
      const report = await api.post<Report>('/api/validate/permissions', {
        targetOrgId: orgId,
        config,
        operation: store.strategy.operation,
      });
      setReports((r) => ({ ...r, [orgId]: report }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(null);
    }
  }

  const allChecked = targets.every((t) => reports[t.orgId]);
  const anyBlocking = targets.some((t) => reports[t.orgId] && !reports[t.orgId].canProceed);

  return (
    <section>
      <h2>9. Permission validation</h2>
      {error && <Notice kind="error">{error}</Notice>}
      {targets.map((org) => {
        const report = reports[org.orgId];
        return (
          <Card key={org.orgId} title={org.nickname}>
            {!report ? (
              <Button onClick={() => void run(org.orgId)} disabled={running === org.orgId}>
                {running === org.orgId ? 'Checking…' : 'Run permission check'}
              </Button>
            ) : (
              <div>
                <p>
                  <Badge color="green">{report.passed} pass</Badge>
                  <Badge color="red">{report.failed} fail</Badge>
                  <Badge color="yellow">{report.warnings} warnings</Badge>{' '}
                  {report.canProceed ? (
                    <Badge color="green">can proceed</Badge>
                  ) : (
                    <Badge color="red">blocked</Badge>
                  )}
                </p>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {report.checks
                    .filter((c) => c.status !== 'pass')
                    .map((c, i) => (
                      <p key={i}>
                        <code>
                          {c.object}.{c.field}
                        </code>{' '}
                        <Badge color={c.status === 'fail' ? 'red' : 'yellow'}>{c.status}</Badge>{' '}
                        {c.message}
                      </p>
                    ))}
                  {report.checks.every((c) => c.status === 'pass') && (
                    <Notice kind="ok">All fields writable on this target.</Notice>
                  )}
                </div>
                <Button onClick={() => void run(org.orgId)}>Re-check</Button>
              </div>
            )}
          </Card>
        );
      })}
      {anyBlocking && (
        <Notice kind="error">Fix blocking failures in the target org before loading.</Notice>
      )}
      <Button primary disabled={!allChecked || anyBlocking} onClick={() => setStep(10)}>
        Continue to loading
      </Button>
    </section>
  );
}
