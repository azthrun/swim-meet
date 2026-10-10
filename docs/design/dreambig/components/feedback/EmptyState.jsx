import React from 'react';
import { Icon } from '../icons/Icon.jsx';

export function EmptyState({ icon = 'folder', title, children, action, style, ...rest }) {
  return (
    <div
      style={{
        background: 'var(--canvas)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-well)',
        padding: 'var(--pad-empty-state)',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 10,
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: 56, height: 56, borderRadius: 'var(--radius-full)', background: 'var(--surface-card)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', marginBottom: 4 }}>
        <Icon name={icon} size={26} />
      </span>
      {title ? <h3 style={{ font: 'var(--type-heading-3)', letterSpacing: 'var(--tracking-heading-3)', margin: 0 }}>{title}</h3> : null}
      <div style={{ font: 'var(--type-body-md)', color: 'var(--text-muted)', maxWidth: 380 }}>{children}</div>
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}
