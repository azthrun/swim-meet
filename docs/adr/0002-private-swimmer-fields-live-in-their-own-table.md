# Private swimmer fields live in their own table

`swimmers` is readable by anyone, and Postgres row level security filters rows, not columns, so a date of birth stored there would be readable through the API no matter what the UI hides. Date of birth and gender live in `swimmer_private`, which only the swimmer's editors can select. We chose a separate table over column grants or a public view because a missing policy on a separate table fails closed.

## Consequences

Nothing derived from date of birth (age, age group) may be returned to anonymous callers. Features that need it, such as motivational standard levels, must compute server-side and return only the derived level.
