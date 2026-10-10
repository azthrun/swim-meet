One-line: The marketing top bar — white, hairline-bottomed, wordmark left, menu centre, "Log in" plus a utility CTA right.

```jsx
<NavBar links={['Product', 'Solutions', 'Enterprise', 'Pricing']} active="Pricing" />
```

- The nav CTA is a `utility` button (8px), never the marketing pill.
- Active link is the one place blue appears in the chrome.
- Below the tablet breakpoint this condenses to a hamburger (`Icon name="menu"`).
