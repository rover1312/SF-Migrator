import { useState } from 'react';
import { useExtraction } from '../hooks/useExtraction';
import { useMigrationStore } from '../store/migrationStore';
import { buildMigrationConfig } from '../utils/build-config';
import { Badge, Button, Card, Notice, ProgressBar, TextInput } from './ui';

/** Step 7 — extraction settings, live progress, pause/resume/cancel. */
export default function Step7Extraction() {
  const store = useMigrationStore();
  const { sourceOrg, extraction, setExtraction, setExtractJobId, setStep } = store;
  const { jobId, job, error, starting, start, control } = useExtraction();
  const [startError, setStartError] = useState<string | null>(null);

  if (!sourceOrg) return <Notice kind="warn">Connect the source org first (Step 2).</Notice>;
  const src = sourceOrg;

  async function onStart(): Promise<void> {
    setStartError(null);
    try {
      const config = buildMigrationConfig({
        sourceOrg: src,
        loadTargets: [],
        selectedObjects: store.selectedObjects,
        objectLabels: store.objectLabels,
        selectedFields: store.selectedFields,
        filters: store.filters,
        extraction,
        strategy: store.strategy,
        lookups: store.lookups,
      });
      const id = await start(src.orgId, config);
      setExtractJobId(id);
    } catch (err) {
      setStartError((err as Error).message);
    }
  }

  const progress = job?.progress;
  const done = job && ['completed', 'failed', 'cancelled'].includes(job.status);

  return (
    <section>
      <h2 className="ui-h2">7. Extraction</h2>
      <Card title="Settings" tint="sky">
        <label className="ui-field">
          <span>Output format</span>
          <select
            className="ui-select"
            value={extraction.format}
            onChange={(e) => setExtraction({ format: e.target.value as 'csv' | 'json' | 'both' })}
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="both">Both</option>
          </select>
        </label>
        <TextInput
          label="Batch size (100 – 50000)"
          type="number"
          value={extraction.batchSize}
          onChange={(v) => setExtraction({ batchSize: Number(v) || 5000 })}
        />
        {!jobId && (
          <Button primary onClick={() => void onStart()} disabled={starting}>
            {starting ? 'Starting…' : 'Start extraction'}
          </Button>
        )}
      </Card>

      {startError && <Notice kind="error">{startError}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      {job && (
        <Card title={`Job ${job.id}`}>
          <p role="status">
            Status:{' '}
            <Badge
              color={
                job.status === 'completed' ? 'green' : job.status === 'failed' ? 'red' : 'gray'
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
          <ProgressBar value={progress?.completedObjects ?? 0} max={progress?.totalObjects ?? 0} />
          <p>
            {progress?.processedRecords ?? 0} / {progress?.totalRecords ?? 0} records
          </p>
          {job.error && <Notice kind="error">{job.error}</Notice>}
          {!done && (
            <div className="ui-btnrow">
              {job.status === 'running' && (
                <Button onClick={() => void control('pause')}>Pause</Button>
              )}
              {job.status === 'paused' && (
                <Button onClick={() => void control('resume')}>Resume</Button>
              )}
              <Button onClick={() => void control('cancel')}>Cancel</Button>
            </div>
          )}
          {job.status === 'completed' && (
            <div className="ui-btnrow">
              <a href={`/api/extract/files/${job.id}`} target="_blank" rel="noreferrer">
                List extracted files
              </a>
              <Button primary onClick={() => setStep(8)}>
                Continue to targets
              </Button>
            </div>
          )}
        </Card>
      )}
    </section>
  );
}
