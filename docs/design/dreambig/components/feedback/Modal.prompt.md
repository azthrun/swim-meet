One-line: Centred dialog on a soft scrim — feature-card chrome carried by the Level-2 elevated shadow.

```jsx
<Modal title="Invite your team" onClose={close}
  actions={<><Button variant="utility">Cancel</Button><Button variant="primary">Send invites</Button></>}>
  They will get a link to this workspace.
</Modal>
```

- The overlay positions `absolute`; give the containing surface `position: relative`.
- Implements the source's `ex-modal-card`.
