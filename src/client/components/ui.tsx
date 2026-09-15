import type { ReactNode } from 'react';

/** Tiny unstyled primitives. Styling stays inline so the UI has zero CSS deps. */

const card: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
};

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section style={card}>
      {title && <h3 style={{ marginTop: 0 }}>{title}</h3>}
      {children}
    </section>
  );
}

const button: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid #888',
  background: '#f5f5f5',
  cursor: 'pointer',
};

export function Button({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      style={{
        ...button,
        ...(primary ? { background: '#0366d6', color: '#fff', borderColor: '#0366d6' } : {}),
        ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 8 }}>
      <span style={{ display: 'block', fontSize: 12, color: '#555' }}>{label}</span>
      <input
        type={type ?? 'text'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #bbb' }}
      />
    </label>
  );
}

export function Notice({
  kind,
  children,
}: {
  kind: 'error' | 'warn' | 'info' | 'ok';
  children: ReactNode;
}) {
  const colors = { error: '#b00020', warn: '#8a6d00', info: '#0366d6', ok: '#137333' };
  return (
    <p
      style={{
        color: colors[kind],
        background: '#fafafa',
        borderLeft: `4px solid ${colors[kind]}`,
        padding: '8px 12px',
      }}
    >
      {children}
    </p>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ background: '#eee', borderRadius: 6, overflow: 'hidden', margin: '8px 0' }}>
      <div
        style={{
          width: `${pct}%`,
          background: '#0366d6',
          color: '#fff',
          fontSize: 12,
          padding: '2px 8px',
        }}
      >
        {pct}%
      </div>
    </div>
  );
}

export function Badge({
  color,
  children,
}: {
  color: 'green' | 'red' | 'gray' | 'yellow';
  children: ReactNode;
}) {
  const bg = { green: '#e6f4ea', red: '#fce8e6', gray: '#f1f3f4', yellow: '#fef7e0' }[color];
  const fg = { green: '#137333', red: '#b00020', gray: '#5f6368', yellow: '#8a6d00' }[color];
  return (
    <span
      style={{
        background: bg,
        color: fg,
        borderRadius: 10,
        padding: '1px 8px',
        fontSize: 12,
        marginRight: 4,
      }}
    >
      {children}
    </span>
  );
}
