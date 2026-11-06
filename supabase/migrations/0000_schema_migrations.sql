-- The registry of the migrations already applied. scripts/db-migrate.mjs writes one row per migration, in the same
-- transaction as the migration itself, together with the sha256 of the file: editing a migration that was applied fails
-- the next plan instead of being ignored.
--
-- It lives in the schema `private`, which the API (PostgREST) does not expose: the schemas it serves are the ones named in
-- its configuration, and `public` is one of them. Row level security is on and there is no policy, so even a role that
-- someone grants a privilege to later sees no row. Only the owner and the service role (which bypass it) read it.
-- Idempotent: running it again changes nothing.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

-- A registry created before the hash existed gets the column. A row without a hash counts as edited: it is loud on purpose.
alter table private.schema_migrations add column if not exists sha256 text;
do $$
begin
  if not exists (select from pg_constraint where conname = 'schema_migrations_sha256_shape' and conrelid = 'private.schema_migrations'::regclass) then
    alter table private.schema_migrations add constraint schema_migrations_sha256_shape check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$');
  end if;
end
$$;

alter table private.schema_migrations enable row level security;

-- Supabase hands every new table to anon and authenticated by default. Take it back.
revoke all on table private.schema_migrations from public, anon, authenticated;

-- Undo: drop table private.schema_migrations; drop schema private;
