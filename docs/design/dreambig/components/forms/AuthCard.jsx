import React from 'react';
import { TextInput } from './TextInput.jsx';
import { Button } from '../buttons/Button.jsx';
import { Wordmark } from '../brand/Wordmark.jsx';

export function AuthCard({ mode = 'sign-in', onSubmit, footer, style, ...rest }) {
  const signUp = mode === 'sign-up';
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-well)',
        padding: 'var(--pad-card)',
        width: 380,
        boxSizing: 'border-box',
        boxShadow: 'var(--shadow-soft)',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        ...style,
      }}
      {...rest}
    >
      <Wordmark size={20} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2 style={{ font: 'var(--type-heading-2)', letterSpacing: 'var(--tracking-heading-2)', margin: 0 }}>
          {signUp ? 'Start free' : 'Welcome back'}
        </h2>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
          {signUp ? 'No card needed. Bring your team when you are ready.' : 'Pick up where you left off.'}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {signUp ? <TextInput label="Full name" placeholder="Ada Okafor" /> : null}
        <TextInput label="Work email" type="email" placeholder="you@company.com" />
        <TextInput label="Password" type="password" placeholder="••••••••" />
      </div>
      <Button variant="primary" fullWidth onClick={onSubmit}>{signUp ? 'Create account' : 'Log in'}</Button>
      {footer ? <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', textAlign: 'center' }}>{footer}</div> : null}
    </div>
  );
}
