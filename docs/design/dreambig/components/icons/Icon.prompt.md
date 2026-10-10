One-line: Renders a Lucide glyph at the brand's 2px stroke weight, inheriting `currentColor` — use it anywhere an icon is needed instead of hand-drawing SVG.

```jsx
<Icon name="check" size={16} color="var(--accent-green)" />
```

- Requires the Lucide UMD script on the page (see `readme.md` → ICONOGRAPHY).
- Sizes in use: 16 beside `body-sm`, 20 in buttons and nav, 24+ in empty states.
- Lucide is a **substitution**, not a DreamBig asset. If real icon assets arrive, swap this wrapper's internals and keep the API.
