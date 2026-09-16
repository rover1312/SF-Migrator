import type { ReactNode } from 'react';

/** Neo-glass primitives. Same props API; all depth lives in theme.css. */

export type CardTint = 'rose' | 'peach' | 'mint' | 'sky';

export function Card({
  title,
  children,
  tint,
}: {
  title?: string;
  children: ReactNode;
  tint?: CardTint;
}) {
  return (
    <section className={tint ? `ui-panel ui-panel-tint-${tint}` : 'ui-panel'}>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}

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
      className={primary ? 'ui-btn ui-btn-primary' : 'ui-btn'}
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
    <label className="ui-field">
      <span>{label}</span>
      <input
        className="ui-input"
        type={type ?? 'text'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
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
  return (
    <p className={`ui-notice ui-notice-${kind}`} role={kind === 'error' ? 'alert' : undefined}>
      {children}
    </p>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="ui-gauge"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progress"
    >
      <div className="ui-gauge-fill" style={{ width: `${Math.max(pct, 4)}%` }}>
        {pct}%
      </div>
    </div>
  );
}

const lampClass = {
  green: 'ui-lamp-green',
  red: 'ui-lamp-red',
  gray: '',
  yellow: 'ui-lamp-yellow',
};

export function Badge({
  color,
  children,
}: {
  color: 'green' | 'red' | 'gray' | 'yellow';
  children: ReactNode;
}) {
  return <span className={`ui-lamp ${lampClass[color]}`}>{children}</span>;
}
