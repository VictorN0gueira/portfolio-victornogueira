-- The two roles that write to the database from outside, each able to do one thing only:
--   news_writer  inserts, updates and deletes articles (the scheduled job, through the REST API with a token of this role)
--   n8n_leads    inserts leads (the n8n flow, through the Postgres connection of the EasyPanel network)
-- Both are created without a login and without a password. The password of n8n_leads is set apart, outside the
-- repository (it never appears in a migration), as a SCRAM verifier (scripts/db-credentials.mjs). news_writer never logs
-- in: PostgREST switches into it for a request whose token says `role: news_writer`, which is what the grant to
-- authenticator allows. Neither role is a superuser, neither bypasses row level security, neither can create anything.
-- Idempotent: running it again changes nothing.
do $$
begin
  if not exists (select from pg_roles where rolname = 'news_writer') then
    create role news_writer nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'n8n_leads') then
    create role n8n_leads nologin noinherit;
  end if;
  -- authenticator is the login role of PostgREST in a Supabase. It is absent in a bare Postgres, where there is nothing to grant.
  if exists (select from pg_roles where rolname = 'authenticator') then
    grant news_writer to authenticator;
  end if;
end
$$;

-- Limits against a runaway connection or statement. They bind a direct connection (n8n_leads): a role setting is applied at
-- login, so for news_writer, which PostgREST reaches with SET ROLE, they are a second line behind the settings of the
-- authenticator. A lead insert is one row, so 5 seconds is generous.
alter role n8n_leads connection limit 5;
alter role n8n_leads set statement_timeout = '5s';
alter role news_writer connection limit 3;
alter role news_writer set statement_timeout = '30s';

-- The schema must be reachable for a role to see its tables. What the role may do inside it is granted table by table.
grant usage on schema public to news_writer, n8n_leads;
-- Nobody creates objects in public: not the public, not the API roles, not ours. (Postgres 15 already withholds it from
-- PUBLIC; the statement is explicit so an older default or an earlier grant cannot survive.)
revoke create on schema public from public, anon, authenticated, news_writer, n8n_leads;
-- TEMP on the database (creating temporary tables) is left with PUBLIC on purpose: the roles hold it through PUBLIC, so
-- taking it away means `revoke temp on database <name> from public`, which also reaches every other role of the Supabase
-- (its own services create temporary tables), and a mistake there is not visible from this repository. A temporary table
-- lives in the session of the role that makes it and is invisible to the others, so it opens nothing; `db-audit` reports it
-- (temp_on_database) so the owner can decide with the Supabase in front of him.

-- The Supabase gives anon, authenticated and service_role ALL on every new table, EXECUTE on every new function and
-- read and write on every new sequence of the schema public, through default privileges. Default privileges belong to an
-- OWNER ROLE: they apply to the objects that role creates. Our migrations name the privileges they want, so they do not
-- need those defaults, and a future table, function or sequence must not inherit them. This clears them for the role that
-- runs the migration and, when that role may act for them, for postgres and supabase_admin (the owners the Supabase uses).
-- It does NOT clear the owner roles it cannot act for: after the first apply, check which role owns the tables and which
-- default ACLs exist with `node scripts/db-audit.mjs --host <host>` (see the section on pg_default_acl in its report).
-- A function also gets EXECUTE for PUBLIC by Postgres itself, which a per schema default cannot remove: every function of
-- the schema public must revoke it explicitly, and supabase/tests/rls.sql fails when anon can execute one.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
do $$
declare
  owner_role text;
begin
  foreach owner_role in array array['postgres', 'supabase_admin'] loop
    if owner_role <> current_user
       and exists (select from pg_roles where rolname = owner_role)
       and pg_has_role(current_user, owner_role, 'member') then
      execute format('alter default privileges for role %I in schema public revoke all on tables from anon, authenticated', owner_role);
      execute format('alter default privileges for role %I in schema public revoke all on functions from anon, authenticated', owner_role);
      execute format('alter default privileges for role %I in schema public revoke all on sequences from anon, authenticated', owner_role);
    end if;
  end loop;
end
$$;

-- Undo: revoke news_writer from authenticator; drop owned by news_writer, n8n_leads; drop role news_writer; drop role n8n_leads;
