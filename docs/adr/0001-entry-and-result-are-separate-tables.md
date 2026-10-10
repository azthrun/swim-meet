# Entry and result are separate tables

An upcoming swim and a finished swim are the same thing at different points in its life, so one `swims` table with nullable times would have worked. We split it into `entries` and a 1:1 `results` row created when the first outcome is recorded, because "upcoming" then means "no result row" instead of "all time columns null", and the edit and import paths that change during and after a meet touch only `results`.

## Consequences

Every read of a finished swim joins two tables. `entries.course_code` duplicates the meet's course on purpose: composite foreign keys to both `meets` and `events` use it to guarantee an entry's event belongs to the meet's course without a trigger.
