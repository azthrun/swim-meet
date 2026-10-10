import React from 'react';
import { Icon } from '../icons/Icon.jsx';

export function SidebarNavRow({ icon, label, count, active = false, onClick, style, ...rest }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        textAlign: 'left',
        background: active ? 'var(--canvas)' : 'transparent',
        border: 0,
        borderLeft: '2px solid ' + (active ? 'var(--color-primary)' : 'transparent'),
        borderRadius: 'var(--radius-menu-item)',
        padding: 'var(--space-sm) var(--space-md)',
        font: 'var(--type-body-sm)',
        fontFamily: 'var(--font-sans)',
        color: active ? 'var(--text-body)' : 'var(--text-secondary)',
        fontWeight: active ? 'var(--weight-medium)' : 'var(--weight-regular)',
        cursor: 'pointer',
        transition: 'var(--transition-surface)',
        ...style,
      }}
      {...rest}
    >
      {icon ? <Icon name={icon} size={16} color={active ? 'var(--color-primary)' : 'var(--text-muted)'} /> : null}
      <span style={{ flex: 1 }}>{label}</span>
      {count != null ? <span style={{ font: 'var(--type-caption)', color: 'var(--text-faint)' }}>{count}</span> : null}
    </button>
  );
}
