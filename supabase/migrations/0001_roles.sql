-- The two roles that write to the database from outside, each able to do one thing only:
--   news_writer  inserts, updates and deletes articles (the scheduled job, through the REST API with a token of this role)
--   n8n_leads    inserts leads (the n8n flow, through the Postgres connection of the EasyPanel network)
-- Both are created without a login and without a password. The password of n8n_leads is set apart, outside the
-- repository (it never appears in a migration). news_writer never logs in: PostgREST switches into it for a request whose
-- token says `role: news_writer`, which is what the grant to authenticator allows.
-- Neither role is a superuser, neither bypasses row level security, neither can create anything.
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

-- The schema must be reachable for a role to see its tables. What the role may do inside it is granted table by table.
grant usage on schema public to news_writer, n8n_leads;

-- Undo: revoke news_writer from authenticator; drop owned by news_writer, n8n_leads; drop role news_writer; drop role n8n_leads;
