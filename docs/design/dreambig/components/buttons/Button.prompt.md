One-line: The brand's action button — use `primary` for the single blue CTA on a view, `secondary` for the white pill beside it, `utility` for nav and plan-select actions.

```jsx
<Button variant="primary" size="lg">Start free</Button>
<Button variant="secondary" size="lg">Request a demo</Button>
<Button variant="utility">Choose plan</Button>
```

- Pills are `radius-full`; utility is 8px with a hairline border and 4px/14px padding. Never mix them up.
- Press: primary darkens to `--color-primary-active` and both pills take `scale(0.9)`. No hover state is documented in the source.
- Never colour a button from the accent palette.
