-- Stands in, in a throwaway Postgres, for what the Supabase already has before our first migration: the roles that
-- PostgREST uses (anon, authenticated, service_role, authenticator) and the default privileges Supabase gives every new
-- table, function and sequence of the public schema. Those default privileges are the reason our migrations revoke
-- explicitly: without that, a new table would be open to anon until a policy said otherwise.
-- NEVER run this against a real Supabase. It refuses to run where one is: scripts/run-rls-tests.mjs checks the same before
-- it starts, and this block checks again, so running the file by hand does not skip the guard.
do $$
begin
  if exists (select from pg_roles where rolname = 'supabase_admin')
     or exists (select from pg_roles where rolname in ('anon', 'service_role') and rolcanlogin)
     or exists (select from pg_namespace where nspname in ('auth', 'storage', 'supabase_functions')) then
    raise exception 'this looks like a real Supabase: the role stand-in only runs in a blank throwaway Postgres';
  end if;
end
$$;

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit;
  end if;
end
$$;

grant anon, authenticated, service_role to authenticator;

grant usage on schema public to anon, authenticated, service_role;

-- What Supabase does for the objects its admin roles create in public.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
