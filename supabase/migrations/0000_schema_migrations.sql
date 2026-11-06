-- The registry of the migrations already applied. scripts/db-migrate.mjs writes one row per migration, in the same
-- transaction as the migration itself. Row level security is on and there is no policy: only the owner role and the
-- service role (which bypass it) can read or write the registry, and nobody on the public API can.
create table if not exists public.schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

alter table public.schema_migrations enable row level security;

-- Supabase grants new tables in public to anon and authenticated by default. Without a policy the rows stay closed, but
-- taking the privileges away too means the registry does not even show up as readable.
revoke all on table public.schema_migrations from public, anon, authenticated;

-- Undo: drop table public.schema_migrations;
