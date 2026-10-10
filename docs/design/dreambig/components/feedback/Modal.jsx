import React from 'react';
import { IconButton } from '../buttons/IconButton.jsx';

export function Modal({ open = true, title, children, actions, onClose, width = 480, style, ...rest }) {
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 40 }} onClick={onClose}>
      <div
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-card)',
          borderRadius: 'var(--radius-well)',
          padding: 'var(--pad-card)',
          boxShadow: 'var(--shadow-modal)',
          width,
          maxWidth: '100%',
          boxSizing: 'border-box',
          fontFamily: 'var(--font-sans)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          ...style,
        }}
        {...rest}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <h3 style={{ font: 'var(--type-heading-3)', letterSpacing: 'var(--tracking-heading-3)', margin: 0, flex: 1 }}>{title}</h3>
          {onClose ? <IconButton icon="x" label="Close" size={28} tone="on-light" /> : null}
        </div>
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-secondary)' }}>{children}</div>
        {actions ? <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>{actions}</div> : null}
      </div>
    </div>
  );
}
