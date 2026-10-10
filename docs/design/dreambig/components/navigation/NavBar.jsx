import React from 'react';
import { Wordmark } from '../brand/Wordmark.jsx';
import { Button } from '../buttons/Button.jsx';
import { Icon } from '../icons/Icon.jsx';

export function NavBar({ links = [], active, onNavigate = () => {}, cta = 'Start free', onCta, sticky = true, style, ...rest }) {
  return (
    <header
      style={{
        background: 'var(--canvas-white)',
        borderBottom: '1px solid var(--border-hairline)',
        padding: 'var(--pad-nav) var(--gutter)',
        position: sticky ? 'sticky' : 'static',
        top: 0,
        zIndex: 20,
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
      {...rest}
    >
      <nav style={{ maxWidth: 'var(--container-wide)', margin: '0 auto', display: 'flex', alignItems: 'center', gap: 32 }}>
        <button onClick={() => onNavigate(links[0])} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
          <Wordmark size={20} />
        </button>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {links.map((l) => (
            <button
              key={l}
              onClick={() => onNavigate(l)}
              style={{
                font: 'var(--type-body-sm)',
                fontFamily: 'var(--font-sans)',
                color: active === l ? 'var(--color-primary)' : 'var(--text-body)',
                background: 'none',
                border: 0,
                padding: '6px 10px',
                borderRadius: 'var(--radius-menu-item)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <a href="#" style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)', textDecoration: 'none' }}>Log in</a>
        <Button variant="utility" onClick={onCta}>{cta}</Button>
        <span style={{ display: 'none' }}><Icon name="menu" size={20} /></span>
      </nav>
    </header>
  );
}
