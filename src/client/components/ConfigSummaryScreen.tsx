import { useState } from 'react';
import { useMigrationStore } from '../store/migrationStore';
import { api } from '../utils/api-client';
import { buildMigrationConfig } from '../utils/build-config';
import { Badge, Button, Card, Notice } from './ui';

/** Pre-extraction summary: review, export, jump back to edit, confirm. */
export default function ConfigSummaryScreen() {
  const store = useMigrationStore();
  const {
    sourceOrg,
    targetOrgs,
    selectedObjects,
    objectLabels,
    selectedFields,
    filters,
    extraction,
    strategy,
    lookups,
    setStep,
  } = store;
  const [error, setError] = useState<string | null>(null);

  if (!sourceOrg) return <Notice kind="warn">Connect the source org first (Step 2).</Notice>;
  const src = sourceOrg;

  function buildConfig() {
    return buildMigrationConfig({
      sourceOrg: src,
      loadTargets: targetOrgs,
      selectedObjects,
      objectLabels,
      selectedFields,
      filters,
      extraction,
      strategy,
      lookups,
    });
  }

  async function exportConfig(format: 'json' | 'yaml'): Promise<void> {
    setError(null);
    try {
      const { content, filename } = await api.post<{ content: string; filename: string }>(
        '/api/config/export',
        { config: buildConfig(), format },
      );
      const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const totalFields = Object.values(selectedFields).reduce((n, f) => n + f.length, 0);
  const largeObjects = selectedObjects.length > 0 && filters.length === 0;

  return (
    <section>
      <h2>Summary</h2>
      {largeObjects && (
        <Notice kind="warn">No filters configured — extraction will pull full objects.</Notice>
      )}
      {error && <Notice kind="error">{error}</Notice>}

      <Card title="Source org">
        <p>
          {sourceOrg.nickname} — {sourceOrg.loginUrl}
        </p>
        <Button onClick={() => setStep(2)}>Edit</Button>
      </Card>

      <Card title={`Target orgs (${targetOrgs.length})`}>
        {targetOrgs.map((o) => (
          <Badge key={o.orgId} color="gray">
            {o.nickname}
          </Badge>
        ))}
        <div>
          <Button onClick={() => setStep(3)}>Edit</Button>
        </div>
      </Card>

      <Card title={`Objects & fields (${selectedObjects.length} objects, ${totalFields} fields)`}>
        <ul>
          {selectedObjects.map((name) => (
            <li key={name}>
              <code>{name}</code> — {(selectedFields[name] ?? []).length} fields
              {filters.some((f) => f.objectName === name) &&
                ` — ${filters.filter((f) => f.objectName === name).length} filter(s)`}
              {lookups[name] &&
                Object.entries(lookups[name]).map(([field, parent]) => (
                  <span key={field}>
                    {' '}
                    ·{' '}
                    <code>
                      {field} → {parent}
                    </code>
                  </span>
                ))}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => setStep(4)}>Edit objects</Button>
          <Button onClick={() => setStep(5)}>Edit fields</Button>
          <Button onClick={() => setStep(6)}>Edit filters</Button>
        </div>
      </Card>

      <Card title="Settings">
        <p>
          Extraction: {extraction.format}, batch {extraction.batchSize} · Loading:{' '}
          {strategy.operation}
          {strategy.operation === 'upsert' && ` via ${strategy.externalIdField}`} ·{' '}
          {strategy.stopOnError ? 'stop on error' : 'continue on error'}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => setStep(7)}>Edit</Button>
          <Button onClick={() => void exportConfig('json')}>Export JSON</Button>
          <Button onClick={() => void exportConfig('yaml')}>Export YAML</Button>
        </div>
      </Card>

      <Button primary onClick={() => setStep(7)}>
        Confirm & start extraction
      </Button>
    </section>
  );
}
