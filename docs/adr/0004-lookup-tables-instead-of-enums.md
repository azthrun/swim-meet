# Lookup tables instead of Postgres enums

Course, stroke, round, status, gender, standard level, and age group are lookup tables keyed by a short text code (`SCY`, `FREE`, `PRELIM`) with `name_en` and `name_zh` columns, not Postgres enums. The data has to be shown in English and Chinese, and the owner wanted those translations stored in the database; enums cannot carry labels. Chinese is a single `name_zh` column seeded in Simplified.

## Consequences

The frontend reads fixed vocabulary from the database and keeps only UI chrome in its own translation files. Lookup rows are written by migrations only.
