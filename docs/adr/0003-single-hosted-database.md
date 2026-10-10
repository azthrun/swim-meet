# One hosted database, no local or staging stack

Development, the RLS check, and production all use the single hosted Supabase project. The owner chose this over a local Supabase stack or a second project to keep one thing to run and pay attention to.

## Consequences

Every migration lands on the live site, so migrations must be additive and reviewed before merge. Tests that write run inside a transaction and roll back (`supabase/tests/rls_check.sql`). The project also holds a `legacy` schema of pre-rewrite tables that the API does not expose; it is kept as the source for a later data migration and must not be dropped.
