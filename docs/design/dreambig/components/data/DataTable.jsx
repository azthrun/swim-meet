import React from 'react';

export function DataTable({ columns = [], rows = [], style, ...rest }) {
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-card)', overflow: 'hidden', fontFamily: 'var(--font-sans)', ...style }} {...rest}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: c.align || 'left',
                  background: 'var(--canvas)',
                  font: 'var(--type-eyebrow)',
                  letterSpacing: 'var(--tracking-eyebrow)',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  padding: 'var(--space-sm) var(--space-md)',
                  borderBottom: '1px solid var(--border-hairline)',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    textAlign: c.align || 'left',
                    font: 'var(--type-body-sm)',
                    color: 'var(--text-body)',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-hairline)',
                  }}
                >
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
