-- Pre-rewrite tables are kept for a later data migration but are no longer part of the app.
-- The legacy schema is not exposed through the API.
create schema if not exists legacy;
comment on schema legacy is 'Obsolete pre-rewrite tables. Read-only source for a future data migration.';

alter table if exists public."AgeGroups" set schema legacy;
alter table if exists public."Events" set schema legacy;
alter table if exists public."MotivationalStandards" set schema legacy;
alter table if exists public."Swimmers" set schema legacy;
alter table if exists public."SwimmerLogs" set schema legacy;
alter table if exists public."SwimmerManagers" set schema legacy;

revoke all on schema legacy from anon, authenticated, public;
revoke all on all tables in schema legacy from anon, authenticated, public;
revoke all on all sequences in schema legacy from anon, authenticated, public;
