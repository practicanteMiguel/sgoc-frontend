'use client';

export const inputStyle: React.CSSProperties = {
  border:       '1.5px solid var(--color-border)',
  background:   'var(--color-surface-0)',
  color:        'var(--color-text-900)',
  borderRadius: 8,
  padding:      '6px 10px',
  fontSize:     12,
  outline:      'none',
  width:        '100%',
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, style, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>
          {label}
        </label>
      )}
      <input style={{ ...inputStyle, ...style }} {...props} />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, style, children, ...props }: SelectProps) {
  return (
    <div>
      {label && (
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>
          {label}
        </label>
      )}
      <select style={{ ...inputStyle, appearance: 'none' as const, ...style }} {...props}>
        {children}
      </select>
    </div>
  );
}
