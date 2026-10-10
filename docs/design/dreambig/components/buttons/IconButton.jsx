import React from 'react';
import { Icon } from '../icons/Icon.jsx';

export function IconButton({ icon, size = 40, tone = 'on-dark', label, style, ...rest }) {
  const [down, setDown] = React.useState(false);
  const tones = {
    'on-dark': { background: 'var(--fill-translucent)', color: 'var(--color-on-primary)' },
    'on-light': { background: 'var(--fill-translucent)', color: 'var(--text-body)' },
    surface: { background: 'var(--surface-card)', color: 'var(--text-body)', boxShadow: 'var(--shadow-soft)' },
  };
  return (
    <button
      aria-label={label}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-full)',
        border: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'var(--transition-press), var(--transition-surface)',
        ...tones[tone],
        ...(down ? { transform: 'scale(var(--press-scale))' } : null),
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={Math.round(size * 0.45)} />
    </button>
  );
}
