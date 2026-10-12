# Swim Meet

A public record of swimmers' meet schedules and times. The site is static and reads from one hosted Supabase project.

Live: https://azthrun.github.io/swim-meet/

Domain terms are defined in [GLOSSARY.md](GLOSSARY.md), decisions in [docs/adr/](docs/adr/), and the design in [docs/design/](docs/design/).

## Local development

Needs Node 24.

```bash
npm install
npm run dev
```

Open http://localhost:5173/swim-meet/. There is no local database: the dev server reads the same hosted Supabase project as the live site ([ADR 0003](docs/adr/0003-single-hosted-database.md)).

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no output |
| `npm test` | Vitest unit tests for the pure logic in `src/lib/` |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the built site |

### Configuration

[.env](.env) holds the Supabase project URL and its publishable key. Both are public by design and committed; row level security is what protects the data. No service-role key or database password belongs in this repository, and nothing here needs a repository secret.

### Layout

- `src/lib/` pure logic with tests: time format and parse, personal best selection, seasons, dates, permissions, form validation, and the defaults for new entries.
- `src/data/` the Supabase client, queries, mutations, and `database.types.ts`.
- `src/auth/` the session and what the signed-in account may edit. Edit controls are shown from `lib/permissions.ts`, which mirrors the row level security policies; the database still has the last word.
- `src/i18n/` UI chrome in English and Chinese. Courses, strokes, rounds and statuses are not here: their names come from the lookup tables (`name_en` / `name_zh`).
- `src/components/`, `src/screens/` hand-built from the DreamBig tokens. `src/styles/index.css` imports the token files from `docs/design/dreambig/tokens/` and gives them Tailwind names.

Routing is hash-based (`/#/swimmers/jayden/results`) because GitHub Pages serves a single `index.html`. The Vite base path is `/swim-meet/`.

## Database

The schema lives in `supabase/migrations/`. CI never touches the database. A migration is applied by hand through the Supabase connector, `supabase/tests/rls_check.sql` is run the same way, the file is named after the applied version, and only then is its pull request merged.

After a schema change, regenerate `src/data/database.types.ts` (Supabase connector, or `npx supabase gen types typescript --project-id vjmkdwlluakdbvtvoucn`) and commit it.

## Deploys

Three workflows in `.github/workflows/`:

- **CI** (`ci.yml`): every pull request runs lint, typecheck, unit tests and a build.
- **Deploy** (`deploy.yml`): every push to `main` builds the site and publishes `dist/` to GitHub Pages. Merging a pull request is the deploy. It can also be run by hand from the Actions tab. The repository's Pages source must be set to "GitHub Actions".
- **Keep Supabase awake** (`keep-alive.yml`): every 3 days, one read through the public API so the free-tier project is not paused for inactivity. GitHub switches scheduled workflows off after 60 days without repository activity; if that happens, re-enable it from the Actions tab.
