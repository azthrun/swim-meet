import React from 'react';

export function BadgePill({ tone = 'primary', dot, children, style, ...rest }) {
  const tones = {
    primary: { background: 'var(--surface-card)', color: 'var(--color-primary)' },
    ink: { background: 'var(--surface-card)', color: 'var(--text-body)' },
    'on-dark': { background: 'rgba(255,255,255,0.12)', color: 'var(--text-on-dark)' },
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        font: 'var(--type-eyebrow)',
        fontFamily: 'var(--font-sans)',
        letterSpacing: 'var(--tracking-eyebrow)',
        padding: '4px 8px',
        borderRadius: 'var(--radius-full)',
        ...tones[tone],
        ...style,
      }}
      {...rest}
    >
      {dot ? <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-full)', background: dot }} /> : null}
      {children}
    </span>
  );
}
