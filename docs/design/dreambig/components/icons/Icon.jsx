import React from 'react';

/* Lucide (CDN) is the substituted icon set — the source material defines no icon library.
   The host page must load the Lucide UMD build from unpkg.com/lucide@latest/dist/umd/lucide.js */
const toPascal = (n) => String(n).replace(/(^|-)([a-z0-9])/g, (m, a, b) => b.toUpperCase());

export function Icon({ name, size = 20, strokeWidth = 2, color = 'currentColor', style, ...rest }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const lucide = typeof window !== 'undefined' ? window.lucide : null;
    const host = ref.current;
    if (!lucide || !host) return;
    const key = toPascal(name);
    const node = (lucide.icons && (lucide.icons[key] || lucide.icons[name])) || lucide[key];
    if (!node) return;
    const svg = lucide.createElement(node);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('stroke-width', strokeWidth);
    host.replaceChildren(svg);
  }, [name, size, strokeWidth]);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, flex: 'none', color, ...style }}
      {...rest}
    />
  );
}
