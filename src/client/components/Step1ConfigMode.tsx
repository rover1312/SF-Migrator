import { useState } from 'react';
import { useMigrationStore } from '../store/migrationStore';
import { api } from '../utils/api-client';
import { Badge, Button, Card, Notice } from './ui';

interface ImportedConfig {
  sourceOrg: { nickname: string; loginUrl: string };
  targetOrgs: { nickname: string; loginUrl: string }[];
  objects: { name: string; label?: string }[];
  fields: Record<string, string[]>;
  filters: { objectName: string; field: string; operator: string; value: string }[];
  extraction: { format: 'csv' | 'json' | 'both'; batchSize: number };
  loading: {
    operation: 'insert' | 'update' | 'upsert';
    externalIdField?: string;
    batchSize: number;
    stopOnError: boolean;
  };
  lookups?: Record<string, Record<string, string>>;
}

/** Step 1 — start new or import a saved JSON/YAML configuration. */
export default function Step1ConfigMode() {
  const { setStep, hydrateFromConfig } = useMigrationStore();
  const [mode, setMode] = useState<'new' | 'import'>('new');
  const [preview, setPreview] = useState<ImportedConfig | null>(null);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(file: File): Promise<void> {
    setError(null);
    setPreview(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/config/import', { method: 'POST', body: form });
      const body = (await res.json()) as {
        success: boolean;
        data?: { config: ImportedConfig };
        error?: { message: string; details?: unknown };
      };
      if (!body.success || !body.data) {
        const details = Array.isArray(body.error?.details)
          ? `: ${(body.error?.details as string[]).join('; ')}`
          : '';
        throw new Error(`${body.error?.message ?? 'Import failed'}${details}`);
      }
      setFilename(file.name);
      setPreview(body.data.config);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadSample(): Promise<void> {
    const sample = {
      version: 1,
      sourceOrg: { nickname: 'prod', loginUrl: 'https://login.salesforce.com' },
      targetOrgs: [{ nickname: 'sandbox', loginUrl: 'https://test.salesforce.com' }],
      objects: [{ name: 'Account', order: 0 }],
      fields: { Account: ['Name'] },
      filters: [],
      extraction: { format: 'csv', batchSize: 5000 },
      loading: { operation: 'insert', batchSize: 200, stopOnError: false },
    };
    const { content, filename: name } = await api.post<{ content: string; filename: string }>(
      '/api/config/export',
      { config: sample, format: 'json' },
    );
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <h2 className="ui-h2">1. Configuration mode</h2>
      <div className="ui-btnrow">
        <Button primary={mode === 'new'} onClick={() => setMode('new')}>
          Start new migration
        </Button>
        <Button primary={mode === 'import'} onClick={() => setMode('import')}>
          Import configuration
        </Button>
      </div>

      {mode === 'new' && (
        <Card title="New migration" tint="sky">
          <p>Configure each step of the wizard. You can export the result later.</p>
          <Button primary onClick={() => setStep(2)}>
            Continue to source org
          </Button>
        </Card>
      )}

      {mode === 'import' && (
        <Card title="Import configuration" tint="peach">
          <input
            className="ui-file"
            aria-label="Upload configuration file"
            type="file"
            accept=".json,.yaml,.yml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
          <p>
            <Button onClick={() => void downloadSample()}>Download a sample config</Button>
          </p>
          {loading && <Notice kind="info">Validating…</Notice>}
          {error && <Notice kind="error">{error}</Notice>}
          {preview && (
            <div>
              <Notice kind="ok">
                {filename} is valid — {preview.objects.length} object(s),{' '}
                {Object.values(preview.fields).reduce((n, f) => n + f.length, 0)} field(s),{' '}
                {preview.filters.length} filter(s).
              </Notice>
              <p>
                Source: <Badge color="gray">{preview.sourceOrg.nickname}</Badge> Targets:{' '}
                {preview.targetOrgs.map((t) => (
                  <Badge key={t.nickname} color="gray">
                    {t.nickname}
                  </Badge>
                ))}
              </p>
              <Button
                primary
                onClick={() => {
                  hydrateFromConfig(preview);
                  setStep('summary');
                }}
              >
                Load configuration & review
              </Button>
            </div>
          )}
        </Card>
      )}
    </section>
  );
}
