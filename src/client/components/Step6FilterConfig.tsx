import { useMigrationStore } from '../store/migrationStore';
import { previewSelect } from '../utils/soql';
import { Button, Card, Notice } from './ui';

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'IN', 'NOT IN', 'LIKE'];

/** Step 6 — per-object WHERE builder with live SOQL preview. */
export default function Step6FilterConfig() {
  const {
    selectedObjects,
    objectLabels,
    selectedFields,
    filters,
    addFilter,
    updateFilter,
    removeFilter,
    setStep,
  } = useMigrationStore();

  if (selectedObjects.length === 0)
    return <Notice kind="warn">Select objects first (Step 4).</Notice>;

  return (
    <section>
      <h2>6. Filters</h2>
      {selectedObjects.map((name) => {
        const rows = filters
          .map((f, i) => ({ ...f, index: i }))
          .filter((f) => f.objectName === name);
        const fields = selectedFields[name] ?? [];
        return (
          <Card key={name} title={objectLabels[name] ?? name}>
            {rows.map((row) => (
              <div key={row.index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select
                  value={row.field}
                  onChange={(e) => updateFilter(row.index, { field: e.target.value })}
                >
                  <option value="">field…</option>
                  {fields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <select
                  value={row.operator}
                  onChange={(e) => updateFilter(row.index, { operator: e.target.value })}
                >
                  {OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
                <input
                  value={row.value}
                  placeholder="value (comma-separated for IN)"
                  onChange={(e) => updateFilter(row.index, { value: e.target.value })}
                  style={{ flex: 1, padding: 6, borderRadius: 6, border: '1px solid #bbb' }}
                />
                <Button onClick={() => removeFilter(row.index)}>✕</Button>
              </div>
            ))}
            <Button onClick={() => addFilter(name)}>Add filter</Button>
            <pre style={{ background: '#f6f8fa', padding: 8, borderRadius: 6, overflowX: 'auto' }}>
              {previewSelect(name, fields, rows)}
            </pre>
          </Card>
        );
      })}
      <Button primary onClick={() => setStep('summary')}>
        Review summary
      </Button>
    </section>
  );
}
