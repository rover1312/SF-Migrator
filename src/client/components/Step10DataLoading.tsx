import { useState } from 'react';
import type { JobSnapshot } from '../hooks/useJob';
import { useMigrationStore } from '../store/migrationStore';
import { api } from '../utils/api-client';
import { buildMigrationConfig } from '../utils/build-config';
import { Badge, Button, Card, Notice, ProgressBar } from './ui';

const emptyProgress = {
  totalObjects: 0,
  completedObjects: 0,
  totalRecords: 0,
  processedRecords: 0,
  succeededRecords: 0,
  failedRecords: 0,
};

/** Step 10 — load into each selected target, track progress, retry failures. */
export default function Step10DataLoading() {
  const store = useMigrationStore();
  const { targetOrgs, loadTargets, extractJobId } = store;
  const [jobs, setJobs] = useState<Record<string, JobSnapshot>>({});
  const [jobByTarget, setJobByTarget] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targets = targetOrgs.filter((o) => loadTargets.includes(o.orgId));
  if (targets.length === 0) return <Notice kind="warn">Select load targets first (Step 8).</Notice>;
  if (!extractJobId) return <Notice kind="warn">Run extraction first (Step 7).</Notice>;

  async function poll(jobId: string): Promise<void> {
    for (;;) {
      await new Promise((r) => setTimeout(r, 2000));
      const snapshot = await api.get<JobSnapshot>(`/api/load/status?id=${jobId}`);
      setJobs((j) => ({ ...j, [snapshot.id]: snapshot }));
      if (['completed', 'failed', 'cancelled'].includes(snapshot.status)) return;
    }
  }

  async function startOne(orgId: string): Promise<void> {
    setError(null);
    setStarting(orgId);
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
      const { jobId } = await api.post<{ jobId: string }>('/api/load/start', {
        targetOrgId: orgId,
        extractJobId,
        config,
      });
      setJobByTarget((m) => ({ ...m, [orgId]: jobId }));
      setJobs((j) => ({
        ...j,
        [jobId]: { id: jobId, kind: 'load', status: 'running', progress: { ...emptyProgress } },
      }));
      await poll(jobId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(null);
    }
  }

  async function retry(jobId: string): Promise<void> {
    await api.post('/api/load/retry', { id: jobId });
    await poll(jobId);
  }

  async function control(jobId: string, action: 'pause' | 'resume' | 'cancel'): Promise<void> {
    await api.post(`/api/load/${action}`, { id: jobId });
  }

  return (
    <section>
      <h2>10. Data loading</h2>
      {error && <Notice kind="error">{error}</Notice>}
      {targets.map((org) => {
        const job = jobByTarget[org.orgId] ? jobs[jobByTarget[org.orgId]] : undefined;
        return (
          <Card key={org.orgId} title={org.nickname}>
            {!job ? (
              <Button
                primary
                onClick={() => void startOne(org.orgId)}
                disabled={starting === org.orgId}
              >
                {starting === org.orgId ? 'Starting…' : 'Start loading'}
              </Button>
            ) : (
              <div>
                <p>
                  Status:{' '}
                  <Badge
                    color={
                      job.status === 'completed'
                        ? 'green'
                        : job.status === 'failed'
                          ? 'red'
                          : 'gray'
                    }
                  >
                    {job.status}
                  </Badge>{' '}
                  {job.currentObject && (
                    <>
                      Current: <code>{job.currentObject}</code>
                    </>
                  )}
                </p>
                <ProgressBar
                  value={job.progress.processedRecords}
                  max={job.progress.totalRecords}
                />
                <p>
                  {job.progress.succeededRecords} succeeded · {job.progress.failedRecords} failed ·{' '}
                  {job.progress.processedRecords}/{job.progress.totalRecords} processed
                </p>
                {job.error && <Notice kind="error">{job.error}</Notice>}
                {job.status === 'running' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button onClick={() => void control(job.id, 'pause')}>Pause</Button>
                    <Button onClick={() => void control(job.id, 'cancel')}>Cancel</Button>
                  </div>
                )}
                {job.status === 'paused' && (
                  <Button onClick={() => void control(job.id, 'resume')}>Resume</Button>
                )}
                {job.status === 'completed' && (
                  <p>
                    <a href={`/api/load/report/${job.id}`} target="_blank" rel="noreferrer">
                      Report
                    </a>{' '}
                    {job.progress.failedRecords > 0 && (
                      <a href={`/api/load/errors/${job.id}`} target="_blank" rel="noreferrer">
                        Error log
                      </a>
                    )}
                  </p>
                )}
                {(job.status === 'completed' || job.status === 'failed') &&
                  job.progress.failedRecords > 0 && (
                    <Button onClick={() => void retry(job.id)}>Retry failed records</Button>
                  )}
              </div>
            )}
          </Card>
        );
      })}
      <p style={{ color: '#555' }}>
        Loads run in dependency order with lookup ID translation. Reports persist under{' '}
        <code>data/logs/</code>.
      </p>
    </section>
  );
}
