import React from 'react';

export function TextInput({ label, hint, type = 'text', invalid = false, style, ...rest }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)' }}>
      {label ? <span style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>{label}</span> : null}
      <input
        type={type}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background: 'var(--surface-card)',
          color: 'var(--text-body)',
          font: 'var(--type-body-sm)',
          fontFamily: 'var(--font-sans)',
          padding: 'var(--space-input)',
          border: '1px solid ' + (invalid ? 'var(--accent-orange)' : 'var(--border-input)'),
          borderRadius: 'var(--radius-input)',
          boxShadow: focused ? 'var(--shadow-input-focus)' : 'none',
          outline: 'none',
          transition: 'var(--transition-surface)',
          width: '100%',
          boxSizing: 'border-box',
          ...style,
        }}
        {...rest}
      />
      {hint ? <span style={{ font: 'var(--type-caption)', color: invalid ? 'var(--accent-orange)' : 'var(--text-faint)' }}>{hint}</span> : null}
    </label>
  );
}
