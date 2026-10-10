import React from 'react';
import { Icon } from '../icons/Icon.jsx';

export function Toast({ children, icon = 'check', accent = 'var(--accent-green)', action, style, ...rest }) {
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-well)',
        border: '1px solid var(--border-hairline)',
        boxShadow: 'var(--shadow-toast)',
        padding: 'var(--space-sm) var(--space-md)',
        font: 'var(--type-body-sm)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-body)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={16} color={accent} />
      <span>{children}</span>
      {action}
    </div>
  );
}
