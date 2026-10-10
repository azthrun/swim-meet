# Swim Meet — v1 visual design

Snapshot of the Claude Design canvas "Swim Meet" (2026-10-10):
https://claude.ai/code/artifact/0f1dbfa2-91a3-4ebc-b91b-058b0d91fa6f

- `canvas.json` lists every artboard with its title and size.
- Each `*.dc.html` file is one artboard's markup. All styling is inline and uses DreamBig CSS variables by name, so read the files as a spec for layout, tokens and copy. They won't render on their own: they expect the canvas runtime (`support.js`), the design system at `ds/dreambigdesignsystem_59eada/` (here: `../dreambig/`) and an uploaded Lucide build.
- `<x-import component-from-global-scope="DreamBigDesignSystem_59eada.Button" …>` means "use the DreamBig `Button` with these props". Its source is in `../dreambig/components/`.
- `Components.dc.html` specifies every component composed for this app (number pad, bottom sheet, badges, status block, relay row, PB grid cells, save feedback) and the one new token, `--font-features-tabular: "lnum" 1, "tnum" 1`.

| Artboard | Screen |
|---|---|
| Main, HomeEditor | 1 Home (public / editor) |
| SwimmerUpcoming, SwimmerUpcomingEditor | 2a Upcoming |
| SwimmerResults, SwimmerResultsEditor, SwimmerResultsByEvent | 2b Results |
| SwimmerPBs | 2c Personal bests |
| SwimmerSettings | Swimmer settings (owner) |
| Meet, MeetEditor, MeetEditorZh | 3 Meet (public / editor / 中文) |
| TimeEntry, TimeEntryZh | 4 Time entry sheet (EN live / 中文 official) |
| MeetStates, TimeEntryStates | Loading, empty, failed to load, saving, failed to save, No Show |
| AddEntries | 5 Add entries, steps 1–3 |
| MeetForm | 6 Meet form (edit with course locked / new) |
| SignIn | 7 Sign in (default / error) |
| SwimmerDesktop, MeetDesktop | Desktop layouts |

`../dreambig/` holds the DreamBig design system's README, token stylesheets and the source of the components used here.
