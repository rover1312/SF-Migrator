import { useEffect, useState } from 'react';
import { useMigrationStore } from '../store/migrationStore';
import { api } from '../utils/api-client';
import { Badge, Button, Card, Notice, TextInput } from './ui';

interface SObjectRow {
  name: string;
  label: string;
  custom: boolean;
  recordCount?: number;
}

/** Step 4 — discover source objects, search, multi-select in load order. */
export default function Step4ObjectSelection() {
  const { sourceOrg, selectedObjects, objectLabels, setObjects, setStep } = useMigrationStore();
  const [rows, setRows] = useState<SObjectRow[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sourceOrg || rows.length > 0) return;
    // Load once per source org; search/filtering is fully client-side.
    setLoading(true);
    api
      .get<SObjectRow[]>(`/api/objects/list?orgId=${sourceOrg.orgId}&includeCounts=true`)
      .then((data) => setRows(data.sort((a, b) => a.label.localeCompare(b.label))))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [sourceOrg]);

  if (!sourceOrg) return <Notice kind="warn">Connect the source org first (Step 2).</Notice>;

  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.label.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(name: string, label: string): void {
    const names = selectedObjects.includes(name)
      ? selectedObjects.filter((o) => o !== name)
      : [...selectedObjects, name];
    setObjects(names, { ...objectLabels, [name]: label });
  }

  return (
    <section>
      <h2>4. Objects</h2>
      {loading && <Notice kind="info">Loading objects…</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      <TextInput
        label="Search objects"
        value={search}
        onChange={setSearch}
        placeholder="Account…"
      />
      <p>
        Selected: <Badge color="gray">{selectedObjects.length}</Badge> (selection order = load
        order)
      </p>
      <Card>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {filtered.map((r) => (
            <label key={r.name} style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
              <input
                type="checkbox"
                checked={selectedObjects.includes(r.name)}
                onChange={() => toggle(r.name, r.label)}
              />
              <span>
                <strong>{r.label}</strong> <code>{r.name}</code>{' '}
                {r.custom && <Badge color="yellow">custom</Badge>}{' '}
                {r.recordCount !== undefined && <Badge color="gray">{r.recordCount} records</Badge>}
              </span>
            </label>
          ))}
        </div>
      </Card>
      {selectedObjects.length === 0 && <Notice kind="warn">Select at least one object.</Notice>}
      <Button primary disabled={selectedObjects.length === 0} onClick={() => setStep(5)}>
        Continue to fields
      </Button>
    </section>
  );
}
