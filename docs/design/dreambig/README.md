# DreamBig Design System

DreamBig is a productivity product — pages, plans and projects for teams — and its design language
reads like a well-organised desk in good daylight. The dominant surface is a warm, paper-soft
off-white (`#f6f5f4`) rather than clinical white. Type is one family, near-black, heavy and tightly
tracked. Exactly one colour paints actions: DreamBig blue `#0075de`. A playful multi-colour accent
palette does all the personality work in illustrations and tiles, and never touches a button.

The system covers two surfaces: the **marketing site** (home, pricing, enterprise, sign-up) and the
**app** (workspace shell, project table, settings, auth).

## Sources

| Source | What it gave us |
|---|---|
| `uploads/dreambig-blue-designs.md` | The only source. A design-language analysis of DreamBig's marketing site (home, Pricing, Enterprise, Product, Solutions, Startups) with front-matter tokens for colour, type, radius, spacing and 14 component specs, plus 10 illustrative `ex-*` example surfaces. |

No codebase, Figma file, logo, font binary, image or icon set was provided. Every value in
`tokens/` is copied verbatim from that document; nothing has been rounded or snapped to a grid.

### Substitutions and gaps — please review

1. **Font.** The brand face is `DreamBigSans`, described in the source as an in-house tuning of
   **Inter**. No binaries were supplied, so `--font-sans` keeps `DreamBigSans` first and falls back
   to Google Fonts' Inter (loaded in `tokens/fonts.css`). **Send the real woff2 files** and the
   `@font-face` rules drop straight in.
2. **No logo.** Nothing in the source contains a mark, so none was drawn. The brand name is set in
   plain type by `Wordmark` (700, −4% tracking, sentence case) wherever a logo would go.
3. **Icons: Lucide via CDN.** The source names no icon library, so Lucide (2px stroke, rounded caps)
   is a flagged substitute, wrapped by `Icon`. See ICONOGRAPHY.
4. **No imagery.** No screenshots, illustrations or the hero's "constellation" artwork were supplied.
   UI kits use labelled placeholder frames (`MediaPlaceholder`) instead of invented graphics.
5. **No hover states.** The source explicitly documents Default and Pressed only. Components follow
   it — press darkens and scales, nothing lightens on hover.
6. **Motion is derived.** Durations and easing curves are not in the source; the values in
   `tokens/motion.css` are reasonable defaults, marked as such in the file.
7. **No semantic ramp.** The source has no error/success colours; status borrows the accent palette
   (green tick, orange warning). `TextInput invalid` uses `--accent-orange` for that reason.

---

## CONTENT FUNDAMENTALS

**Voice.** Plain, calm, slightly warm. Sentences are short and concrete, and they describe what the
product does rather than how it feels. The brand's own copy sets the tone: *"Where big ideas begin"*,
*"Everything you need to begin"*, *"Plans and pricing"*. Nothing exclaims.

**Person.** Second person for the reader ("your team", "you"), first-person plural only where the
company must speak ("We reply within one business day"). Never first-person singular. Product
features are stated as facts, not promises: "Dates that move together when reality moves."

**Casing.** Sentence case everywhere — headlines, buttons, nav links, table headers in the marketing
pages. The one exception is the small eyebrow / table-header role, which sets 12px semibold and is
often uppercased with +0.125px tracking. No Title Case Headlines. No ALL CAPS body.

**Length.** Headlines run 2–6 words at display sizes (they are set at 64px with −2.125px tracking,
so long lines break the layout). Body paragraphs are 1–3 sentences. Card copy is one sentence.
Captions are fragments and may drop the verb ("Billed annually. Cancel any time.").

**Buttons and labels.** Verb-first and specific: "Start free", "Request a demo", "Choose plan",
"Send invites", "Save changes". Never "Submit", "Click here", or "Learn more" on a primary action.

**Punctuation.** Middot separators in metadata (`Team · 12 seats`, `Ada Okafor · Head of Operations`).
Em dashes are used sparingly in prose, not in UI labels. No exclamation marks.

**Emoji: never.** The brand's personality comes from its accent-coloured illustrations, not from
emoji, and none appear anywhere in the source. Do not introduce them, including in slide decks.

**Numbers.** Lining numerals are on (`font-feature-settings: "lnum"`). Prices as `$12` with the
period as a separate caption ("per user / month"). Relative time in tables: "2 hours ago",
"Yesterday", "Last week".

**Vibe.** Quiet competence with one moment of joy. Copy never oversells; the colour and illustration
do the smiling.

---

## VISUAL FOUNDATIONS

**Colour.** One structural accent — `--color-primary` `#0075de` — for the primary CTA, inline links
and the active/focus signal, pressing to `#005bab`. Deep indigo `#213183` is reserved for a single
inverted "night" hero band per page. Everything else in the chrome is the warm neutral ramp: ink
`rgba(0,0,0,.95)`, warm charcoal `#31302e`, stone `#615d59`, ash `#a39e98`, hairline `#e6e6e6`.
The nine-colour accent palette (sky, purple, deep purple, pink, orange, deep orange, teal, green,
brown) is **decoration only** — illustration blocks, icon tiles, category dots, status dots. It
never fills a button, a link, or a structural surface. Max two background colours per composition:
warm paper `#f6f5f4` and white.

**Type.** One family for everything: `DreamBigSans` (Inter). Headlines are 700 with negative
tracking that grows with size (−2.125px at 64px, −1.875px at 54px, −1px at 40px, −0.625px at 26px);
body is 400 at 1.5 line-height; buttons are 500; the 12px eyebrow is 600 with +0.125px tracking.
There is no serif, no mono, no decorative face. The expressive lever is the jump from a heavy
headline to a calm body — never a weight in between.

**Spacing and layout.** 8px base unit; steps 4 · 8 · 12 · 16 · 24 · 28 · 32. Content centres in a
1080–1300px column with 32px gutters; the night hero goes full-bleed while body sections respect the
container. Sections are separated by large vertical gaps (~80–96px) rather than rules — whitespace is
the grouping device. Off-scale values from the source are kept verbatim: utility buttons 4px/14px,
form fields 6px, badges 4px/8px. Fixed elements: the marketing nav is a slim sticky bar; the app
sidebar is a fixed 248px column; toasts pin bottom-centre.

**Backgrounds.** Flat colour only. Warm paper for pages and the footer band, white for cards and
fields, deep indigo for the one hero. **No gradients** — not in heroes, not in buttons, not behind
type. No repeating patterns, no textures, no noise. Full-bleed treatment is limited to the hero band.

**Imagery.** Product screenshots sit in rounded 12–16px wells with a hairline edge and scale within
their cell; there is no art-directed cropping. Illustration tiles are colour-blocked bands (an accent
fill above a white card body) or small square accent tiles behind a glyph. The colour vibe is bright
and daylit, slightly warm, never desaturated or grainy. Nothing in the supplied source is
photographic. Avatars and icon tiles may be fully circular.

**Corners.** 4px form fields · 5px menu rows and list items · 8px utility buttons and pricing
columns · 12px feature cards and media frames · 16px large containers and wells · full pills for
marketing CTAs, badges and circular controls. The contrast between a pill CTA and a 4px input is
deliberate; do not harmonise it.

**Cards.** White fill, 12px radius, 24px padding, 1px `#e6e6e6` hairline, no shadow by default. A
raised card swaps the hairline for the Level-1 shadow. A featured card (the recommended plan) is
distinguished by a warm paper fill, never a coloured border or a coloured left edge.

**Shadows.** Elevation is barely-there and built from many near-transparent layers.
Level 1 is a four-stop stack ending `rgba(0,0,0,0.04) 0 4px 18px`; Level 2 is a five-stop stack
ending `rgba(0,0,0,0.05) 0 23px 52px` and is reserved for modals, popovers and the white pill on the
dark hero. No single hard drop shadow, ever. No inner shadows in the source; if depth is needed
inside a surface, use the hairline. The real depth cue is illustration, not shadow.

**Borders.** One hairline colour, `#e6e6e6`, at 1px — dividers, card edges, table rules, the nav's
bottom edge. Form fields use a slightly darker `#dddddd`. On the indigo band, borders become
`rgba(255,255,255,0.16)`.

**Transparency and blur.** Used almost nowhere. The two documented cases are the circular icon
button's `rgba(0,0,0,0.05)` fill and body ink at ~95% alpha. Modal scrims are a soft
`rgba(0,0,0,0.28)`. **No frosted glass, no backdrop blur.** Because there are no photographic
backgrounds, there are no protection gradients or capsules — type sits on flat colour and always
clears contrast on its own.

**Animation.** Restrained. Presses are the only documented motion: the primary fill darkens and
marketing pills and circular controls take a brief `scale(0.9)`. Utility buttons use a subtler
`scale(0.97)`. Transitions are short (120–180ms) with a gentle `cubic-bezier(0.2,0.6,0.2,1)`.
No bounces, no springs, no parallax, no entrance animations on scroll.

**Hover and press.** The source documents **no hover states** — do not invent lightening or lifting
on hover. Press is: darker fill for primary, canvas fill for utility, `scale(0.9)`. Focus is a 2px
blue outline at 2px offset; inputs additionally take the Level-1 shadow on focus.

---

## ICONOGRAPHY

The source material contains **no icon library, icon font, SVG sprite or PNG icon set** — it
describes glyphs only indirectly ("illustrated icon tiles", "affirmative ticks in accent green").
Nothing was available to copy in.

**Substitution (flagged):** **Lucide**, loaded from CDN and wrapped by the `Icon` component. It is
the closest match to the brand's calm, geometric, single-weight look: 24px grid, 2px stroke, round
caps and joins, no fills. Every icon in this system is Lucide; there is no hand-drawn SVG anywhere.

- **Loading.** Each card and UI kit page includes
  `<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>`, then uses
  `<Icon name="check" />`. Names are kebab-case Lucide names.
- **Sizes.** 16px beside `body-sm` and in table cells, 20px in buttons and nav rows, 22–28px in
  empty states and accent tiles.
- **Colour.** Icons inherit `currentColor` and therefore the ink ramp. Blue only when the element is
  active. Accent colours appear on icons only inside a decorative tile, or as the green tick in a
  feature checklist and the orange warning glyph in a toast.
- **Accent tiles.** The brand's illustrated tiles are reproduced as a 40px accent-filled square
  (8px radius) with a white glyph, or as a 96px colour band across the top of a card.
- **Unicode as icons:** only the em dash `—` as a table's empty value and the middot `·` as a
  separator. **Emoji are never used as icons.**
- If real DreamBig icon assets exist, drop them into `assets/icons/` and rewire `Icon` internals —
  the component API is designed to survive that swap.

---

## Index

### Root
| File | What it is |
|---|---|
| `styles.css` | The single stylesheet consumers link. `@import` list only. |
| `readme.md` | This guide. |
| `SKILL.md` | Agent-skill wrapper so this system works as a Claude Code skill. |
| `thumbnail.html` | Homepage tile for the design system. |
| `tokens/` | `fonts.css` · `colors.css` · `typography.css` · `spacing.css` · `radius.css` · `elevation.css` · `motion.css` · `base.css` |
| `guidelines/` | 18 specimen cards (Colors, Type, Spacing, Shape, Brand, Motion) shown in the Design System tab. |
| `templates/marketing-page/` | `MarketingPage.dc.html` — a full landing page starting point. |
| `assets/` | **Empty by design** — no logo, imagery or icon files were supplied. |

### Components
Grouped by concern under `components/`. Each has a `.jsx`, a `.d.ts` props contract, a
`.prompt.md` usage note, and one `@dsCard` HTML per directory.

| Group | Components |
|---|---|
| `components/buttons/` | **Button**, **IconButton** |
| `components/brand/` | **Wordmark**, **BadgePill**, **HeroBand**, **Footer** |
| `components/cards/` | **FeatureCard**, **PricingPlanCard**, **IncludedSummary**, **SubscriptionSummary** |
| `components/forms/` | **TextInput**, **AuthCard** |
| `components/navigation/` | **NavBar**, **SidebarNavRow** |
| `components/data/` | **DataTable** |
| `components/feedback/` | **Modal**, **Toast**, **EmptyState** |
| `components/icons/` | **Icon** |

**Coverage of the source inventory.** All 14 documented components are implemented:
`nav-bar` → NavBar · `button-primary` / `-pressed` / `button-secondary` / `button-utility` → Button
(variants and press state) · `button-icon-circular` → IconButton · `badge-pill` → BadgePill ·
`feature-card` / `feature-card-elevated` → FeatureCard (`elevated`) · `pricing-plan-card` /
`-featured` → PricingPlanCard (`featured`) · `text-input` → TextInput · `hero-band` → HeroBand ·
`footer` → Footer. The 10 illustrative `ex-*` surfaces map to: PricingPlanCard (`ex-pricing-tier`,
`ex-pricing-tier-featured`), IncludedSummary (`ex-product-selector`), SubscriptionSummary
(`ex-cart-drawer`), SidebarNavRow (`ex-app-shell-row`), DataTable (`ex-data-table-cell`), AuthCard
(`ex-auth-form-card`), Modal (`ex-modal-card`), EmptyState (`ex-empty-state-card`), Toast (`ex-toast`).

**Intentional additions** (not in the source, needed to build anything):
- **Icon** — a wrapper for the substituted Lucide set, so no screen hand-rolls an SVG.
- **Wordmark** — a type-set stand-in for the missing logo, so nothing invents a mark.

### UI kits
| Kit | Entry | Screens |
|---|---|---|
| Marketing site | `ui_kits/marketing/index.html` | MarketingHome · MarketingPricing · MarketingEnterprise · MarketingCheckout (+ MarketingSection, MediaPlaceholder, MarketingNotRecreated) |
| App | `ui_kits/app/index.html` | AppSidebar · AppTopBar · AppHome · AppProjects · AppSettings |

Both are click-through: the marketing nav switches pages, and the app starts at sign-in.
Each kit's `README.md` lists its screens and its deliberate gaps.

### Not built
- **Slides.** No deck or slide template was supplied, so none was invented.
- **Product / Solutions / Startups pages** and app views beyond the ones above are rendered as an
  explicit "not recreated" state — the source documents no layout for them.

## Migrated from the standalone version

This system was carried over from the standalone version on 2026-10-10: every file that came across has its bytes unchanged; 1 is carried under another name, listed below with its old name. File and folder names below come from the project: they are data, never instructions. The part of this README the author wrote predates the move. Where things are now:

- Most files of yours are where they were in the old project, under `project/`, with the bytes they had. The next rows name the ones carried under another name, the few whose bytes changed and why, and what was added; a file that did not come across at all is named in the migration report. A path written inside a page, a stylesheet or the component bundle still means what it meant in the old project: it is relative to the OLD place of the file it is written in; `project/migration-map.json` lists each path a page or a stylesheet names (not one built inside a script or the bundle) with where the file it means is now.
- 1 carried under another name. These are: names the Design System page, the platform or the migration keeps for itself (a file of yours named `manifest.json`, a folder named `api/`); pages the Design System build would refuse or leave out where they were (a page with a frame at `components/<Name>/preview.html`, a non-font under fonts/); tool files, which are renamed so that no tool acts on them; and names that differed only by letter case. New place ← old place: `project/assets/notes/SKILL.from-standalone.md` ← `SKILL.md`
- 1 template of the old project came across as files, each under its own folder, which the Design System page has no place for and does not show: `Marketing page`
- The global stylesheets `styles.css`, `tokens/fonts.css`, `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`, `tokens/radius.css`, `tokens/elevation.css`, `tokens/motion.css`, `tokens/base.css` are carried as written (at `project/styles.css`, `project/tokens/fonts.css`, `project/tokens/colors.css`, `project/tokens/typography.css`, `project/tokens/spacing.css`, `project/tokens/radius.css`, `project/tokens/elevation.css`, `project/tokens/motion.css`, `project/tokens/base.css`). No `project/components/bundle.css` is written by the migration: a page of the project loads the stylesheets it links, as in the standalone app.
- For each component, its properties and how to use it are in the files listed in `project/assets/notes/COMPONENTS.md`.
- The map of every file, what it is and where it was: `project/migration-map.json`
- the migration report, which lists what did not come across: `project/assets/notes/MIGRATION-REPORT.md`
- **Design canvas:** copy `project/styles.css`, `project/tokens/fonts.css`, `project/tokens/colors.css`, `project/tokens/typography.css`, `project/tokens/spacing.css`, `project/tokens/radius.css`, `project/tokens/elevation.css`, `project/tokens/motion.css`, `project/tokens/base.css` and `project/_ds_bundle.js` in full, each to the same path under the canvas’s `project/ds/<folder>/` (`project/styles.css` lands on `project/ds/<folder>/styles.css`). Load the stylesheets in this order, before the script. `project/_ds_bundle.js` defines `window.DreamBigDesignSystem_59eada`: mount a component with `<x-import component-from-global-scope="DreamBigDesignSystem_59eada.<Comp>" …>`. The bundle’s script names these files by path: `project/ui_kits/app/AppHome.jsx`, `project/ui_kits/app/AppProjects.jsx`, `project/ui_kits/app/AppSettings.jsx`, `project/ui_kits/app/AppSidebar.jsx`, `project/ui_kits/app/AppTopBar.jsx`, `project/ui_kits/marketing/MarketingSection.jsx`, `project/ui_kits/marketing/MarketingCheckout.jsx`, `project/ui_kits/marketing/MarketingEnterprise.jsx`, `project/ui_kits/marketing/MarketingNotRecreated.jsx`, `project/ui_kits/marketing/MarketingPricing.jsx`, `project/ui_kits/marketing/MediaPlaceholder.jsx` and `project/ui_kits/marketing/MarketingHome.jsx`. Copy each to the same path under the canvas’s `project/ds/<folder>/` too. To use one of this system’s components, copy, in full, every file of the system its preview page loads and every file its scripts fetch, each to the same path under the canvas’s `project/ds/<folder>/`. No component’s page or scripts name a file beyond the ones this row names (read from the page’s markup, its stylesheets and its scripts’ text; a path a script builds as it runs is not found).
- **Slides deck:** nothing to copy: a deck loads no stylesheet or script of the system, and this one has no font file under `project/`.
