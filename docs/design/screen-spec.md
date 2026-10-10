# Screen spec

Input for the visual draft. Describes what each screen holds, not how it looks.

## Constraints

- Mobile first; the phone at the pool deck is the main device. Must also read well on desktop.
- Light mode only. Tailwind.
- Times are the hero content: large, tabular numerals, format `1:05.32` or `28.41`.
- English by default, 中文 toggle in the header. Every label below exists in both.
- Public and signed-in views are the same screens. Signed-in editors see extra controls, marked **(editor)**.

## Global

- **Header**: app name, language toggle (EN / 中文). When signed in: account menu with sign out.
- **Footer**: small "Sign in" link when signed out.
- **States every list needs**: loading, empty, failed to load with retry.
- **Save feedback**: saved, saving, failed with retry. Signal at the pool is unreliable, so failure must be obvious.

## 1. Home

- List of swimmers: name, next meet (name + date) if any.
- With one swimmer only, this screen is skipped and opens that swimmer.
- **(editor)** Add swimmer.

## 2. Swimmer

Header: swimmer name. Three tabs.

### 2a. Upcoming

- Meets that have entries without a result, soonest first.
- Per meet: name, dates, course badge (SCY / SCM / LCM), location, link to live results if set.
- Per entry under it: event (`100 Freestyle`), round if not a timed final, date, event number, heat, lane, seed time, notes.
- **(editor)** Add entries, edit entry, delete entry.

### 2b. Results

- Default: grouped by meet, newest first. Toggle: grouped by event (time history per event).
- Filters: course, stroke, season.
- Per result: event, round, time, drop against seed (`-1.24` / `+0.30`), status if not swum (DQ / No Show / Scratched), notes.
- Time shown is the official time. If only a live time exists, show it with an "unofficial" tag.
- Badges: personal best; provisional personal best (live time that would be one).
- Relay results show the team time and are visually marked as relays.
- **(editor)** Edit result.

### 2c. Personal bests

- One grid per course. Rows: stroke. Columns: distance. Cell: best time, date. Empty cells stay blank.
- Tapping a cell opens that event's history (same as Results grouped by event, filtered).

### Swimmer settings **(editor, owner only)**

- Edit name, Chinese name, URL slug.
- Private fields: date of birth, gender. Labelled as never shown publicly.
- Sharing: list of people who can edit, remove button, "share by email" field with found / no such account feedback.
- Delete swimmer, behind a typed confirmation.

## 3. Meet

- Header: name, dates, course badge, location, live results link, notes.
- Entries for every tracked swimmer at this meet, grouped by day, ordered by event number.
- Per entry: swimmer name (when more than one swimmer), event, round, heat / lane, seed, then live time, official time, drop.
- This is the meet-day screen. **(editor)** Tapping an entry opens the time entry sheet.
- **(editor)** Edit meet, add entries.

## 4. Time entry sheet **(editor)**

Bottom sheet over the meet screen. Used one-handed, in a hurry.

- Title: swimmer, event, round, heat / lane, seed time.
- Switch: live time / official time.
- Large time display and a custom number pad. Typing `10532` shows `1:05.32`. Backspace, clear.
- Status selector: Swum (default), DQ, No Show, Scratched. No Show and Scratched disable the pad.
- Notes field (relay leg and split go here).
- After a valid time: drop against seed, and personal best / provisional personal best if earned.
- Buttons: Save, Save and next (moves to the next entry in the meet order).

## 5. Add entries **(editor)**

- Step 1: pick swimmer and meet (or create the meet inline).
- Step 2: checklist of events valid for that meet's course, grouped by stroke. Already-entered events are ticked and locked.
- Step 3: one row per chosen event to fill in: date (defaults to meet start), round (defaults to timed final), event number, heat, lane, seed time (pre-filled from the personal best), notes. All optional except date.
- Create all at once.

## 6. Meet form **(editor)**

- Name, Chinese name (optional), course, start date, end date, location (optional), live results link (optional), notes (optional).
- Course cannot change once the meet has entries.

## 7. Sign in

- Email, password, sign in button, error message. No sign-up link; accounts are created by the admin.

## Vocabulary

| English | 中文 |
|---|---|
| Short Course Yards / Short Course Meters / Long Course Meters | 短池（码） / 短池（米） / 长池（米） |
| Freestyle / Backstroke / Breaststroke / Butterfly / Individual Medley | 自由泳 / 仰泳 / 蛙泳 / 蝶泳 / 个人混合泳 |
| Freestyle Relay / Medley Relay | 自由泳接力 / 混合泳接力 |
| Timed Final / Prelim / Final / Swim-off | 计时决赛 / 预赛 / 决赛 / 附加赛 |
| Swum / Disqualified / No Show / Scratched | 完赛 / 犯规 / 未参赛 / 退赛 |

## Sample data for the draft

- Meet: Shark Invitational · SCY · Nov 14–15 · Riverside Aquatic Center
- Entries: #12 50 Freestyle, heat 3 lane 4, seed 30.12 → live 29.48 (-0.64, personal best) · #27 100 Breaststroke, heat 2 lane 5, seed 1:32.80 → official 1:33.10 (+0.30) · #41 200 Freestyle Relay, 2:05.44, note "leg 3, split 31.2" · #44 100 Individual Medley, DQ

## Decisions after the design draft

The draft lives in `docs/design/canvas/`, built on the design system in `docs/design/dreambig/`.

- **Unsaved times are kept on the phone.** A time that fails to save is held in local storage and retried from the banner, as the failure states in the draft promise. This is not a full offline mode: reads and every other write still need a connection.
- **Set password screen.** Invite and password-reset links land on a single form: new password, confirm, save. Sign in gains a "Forgot password" link.
- **Screens derived from existing patterns, not drawn:**
  - Edit entry: the Add entries step 3 row, for one entry.
  - Add swimmer: Swimmer settings without the sharing and delete sections.
  - Delete entry: confirmation in the system's Modal.
  - Empty states for the Upcoming and Results tabs, and loading / empty / failed states for Home, following the Meet states.
  - Unknown swimmer or meet: the system's EmptyState with a link home.
  - Filter pickers: the Select from the components sheet.
- **Not in v1:** a list of all meets, and a delete meet control.
