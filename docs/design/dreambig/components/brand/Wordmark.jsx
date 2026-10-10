import React from 'react';

/* No logo files were supplied with the source material. The wordmark is set in plain type —
   do not substitute a drawn mark. Replace this component's internals when real assets arrive. */
export function Wordmark({ size = 20, tone = 'ink', style, ...rest }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-bold)',
        fontSize: size,
        lineHeight: 1,
        letterSpacing: size * -0.04,
        color: tone === 'on-dark' ? 'var(--text-on-dark)' : 'var(--text-heading)',
        ...style,
      }}
      {...rest}
    >
      DreamBig
    </span>
  );
}
