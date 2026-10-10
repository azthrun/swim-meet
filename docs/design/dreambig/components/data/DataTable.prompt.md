One-line: The app's list surface — use it for any tabular data; cells accept nodes so badges and links drop straight in.

```jsx
<DataTable columns={[{ key: 'name', label: 'Project' }, { key: 'owner', label: 'Owner' }]}
  rows={[{ name: 'Northwind rebrand', owner: 'Ada O.' }]} />
```

- Header cells use `eyebrow` type on the warm paper fill; body cells `body-sm`. Padding 12/16.
- Implements the source's `ex-data-table-cell` chrome.
