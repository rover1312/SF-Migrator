import { useEffect, useState } from 'react';
import type { FieldMeta } from '../store/migrationStore';
import { useMigrationStore } from '../store/migrationStore';
import { api } from '../utils/api-client';
import { Badge, Button, Card, Notice } from './ui';

/** Step 5 — per-object fields with create/update color coding + lookup mapping. */
export default function Step5FieldSelection() {
  const {
    sourceOrg,
    selectedObjects,
    objectLabels,
    fieldMeta,
    setFieldMeta,
    selectedFields,
    setSelectedFields,
    toggleField,
    lookups,
    setLookup,
    setStep,
  } = useMigrationStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceOrg) return;
    for (const name of selectedObjects) {
      if (fieldMeta[name]) continue;
      api
        .get<FieldMeta[]>(`/api/fields/describe/${name}?orgId=${sourceOrg.orgId}`)
        .then((fields) => {
          setFieldMeta(name, fields);
          if (!selectedFields[name]) {
            setSelectedFields(
              name,
              fields.filter((f) => f.creatable).map((f) => f.name),
            );
          }
        })
        .catch((err) => setError((err as Error).message));
    }
  }, [sourceOrg, selectedObjects]);

  if (!sourceOrg) return <Notice kind="warn">Connect the source org first (Step 2).</Notice>;
  if (selectedObjects.length === 0)
    return <Notice kind="warn">Select objects first (Step 4).</Notice>;

  return (
    <section>
      <h2 className="ui-h2">5. Fields & permissions</h2>
      <p>
        <Badge color="green">C creatable</Badge> <Badge color="red">not creatable</Badge>{' '}
        <Badge color="green">U updateable</Badge> <Badge color="red">not updateable</Badge>
      </p>
      {error && <Notice kind="error">{error}</Notice>}
      {selectedObjects.map((name) => {
        const meta = fieldMeta[name] ?? [];
        const selected = selectedFields[name] ?? [];
        return (
          <Card
            key={name}
            title={`${objectLabels[name] ?? name} (${selected.length}/${meta.length})`}
          >
            <div className="ui-btnrow">
              <Button
                onClick={() =>
                  setSelectedFields(
                    name,
                    meta.map((f) => f.name),
                  )
                }
              >
                Select all
              </Button>
              <Button onClick={() => setSelectedFields(name, [])}>Select none</Button>
            </div>
            {meta.map((f) => (
              <label key={f.name} className="ui-row">
                <input
                  className="ui-toggle"
                  type="checkbox"
                  checked={selected.includes(f.name)}
                  onChange={() => toggleField(name, f.name)}
                />
                <code>{f.name}</code>
                <span className="ui-muted">{f.label}</span>
                <Badge color={f.creatable ? 'green' : 'red'}>C</Badge>
                <Badge color={f.updateable ? 'green' : 'red'}>U</Badge>
                {!f.creatable && !f.updateable && <Badge color="gray">read-only</Badge>}
                {(f.type === 'reference' || f.name.endsWith('Id')) && f.name !== 'Id' && (
                  <select
                    className="ui-select"
                    aria-label={`Parent object for ${name}.${f.name}`}
                    value={lookups[name]?.[f.name] ?? ''}
                    onChange={(e) => setLookup(name, f.name, e.target.value || null)}
                  >
                    <option value="">no lookup mapping</option>
                    {selectedObjects
                      .filter((o) => o !== name)
                      .map((o) => (
                        <option key={o} value={o}>
                          → {o}
                        </option>
                      ))}
                  </select>
                )}
              </label>
            ))}
          </Card>
        );
      })}
      <Button
        primary
        disabled={selectedObjects.some((o) => (selectedFields[o] ?? []).length === 0)}
        onClick={() => setStep(6)}
      >
        Continue to filters
      </Button>
    </section>
  );
}
