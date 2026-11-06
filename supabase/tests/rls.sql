-- Proof of the row level security of the VN One tables. It runs after supabase/tests/00_supabase_roles.sql and every
-- migration, as a superuser, in a throwaway Postgres (see scripts/run-rls-tests.mjs). It switches into each role with
-- `set local role`, tries an operation and checks the answer. Everything happens inside one transaction that ends in a
-- rollback, so it leaves nothing behind. The first check that fails stops the script with a non zero exit code.
--
-- A denied operation must fail with sqlstate 42501 (insufficient_privilege, which Postgres also uses for a row that
-- breaks a row level security policy). Any other error, or no error, is a failure.
--
-- Section A looks at the SHAPE of what exists, not only at the tables we know: every relation of every kind (tables,
-- views, materialized views, foreign tables, sequences) and every function of the schemas public and private. A view runs
-- with the rights of its owner, a SECURITY DEFINER function with the rights of its owner, and the Supabase hands anon
-- EXECUTE on new functions: either one added later would leak the leads while a test that only counts tables stays green.
-- So the exact list of what exists is pinned, and anon and authenticated must hold no EXECUTE on a function and no
-- privilege on a sequence. To see the guard work, create `public.leads_v` (a view of leads) or a SECURITY DEFINER
-- `public.dump_leads()` in a throwaway database that passed this suite: it fails at A2, A3 or A3c.
-- Section F removes the first line of defense on purpose (it grants the table privileges the migrations took away) and
-- shows that the policies alone still keep the rows closed.
-- Section E runs identically under every locale (the runner prints the collation of the database it ran in): the character
-- checks of the tables are written with \u escapes, not with locale classes.
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

begin;

-- A role runs `stmt` and it must fail with `expected_state`.
create function pg_temp.expect_error(label text, role_name text, stmt text, expected_state text) returns text
language plpgsql as $f$
declare
  succeeded boolean := false;
  got_state text;
  got_message text;
begin
  begin
    execute format('set local role %I', role_name);
    execute stmt;
    succeeded := true;
  exception when others then
    got_state := sqlstate;
    got_message := sqlerrm;
  end;
  reset role;
  if succeeded then
    raise exception 'FAILED %: % was allowed and must not be', label, role_name;
  end if;
  if got_state <> expected_state then
    raise exception 'FAILED %: expected sqlstate %, got % (%)', label, expected_state, got_state, got_message;
  end if;
  return 'ok   ' || label;
end
$f$;

-- A role runs `stmt` and it must work.
create function pg_temp.expect_ok(label text, role_name text, stmt text) returns text
language plpgsql as $f$
declare
  got_message text;
begin
  begin
    execute format('set local role %I', role_name);
    execute stmt;
  exception when others then
    got_message := sqlerrm;
  end;
  reset role;
  if got_message is not null then
    raise exception 'FAILED %: % was denied and must be allowed (%)', label, role_name, got_message;
  end if;
  return 'ok   ' || label;
end
$f$;

-- A role runs `stmt` and it must touch exactly `expected_rows` rows (a select, or an update or delete that row level
-- security filters down to nothing).
create function pg_temp.expect_rows(label text, role_name text, stmt text, expected_rows bigint) returns text
language plpgsql as $f$
declare
  got_rows bigint;
  got_message text;
begin
  begin
    execute format('set local role %I', role_name);
    execute stmt;
    get diagnostics got_rows = row_count;
  exception when others then
    got_message := sqlerrm;
  end;
  reset role;
  if got_message is not null then
    raise exception 'FAILED %: % got an error (%)', label, role_name, got_message;
  end if;
  if got_rows <> expected_rows then
    raise exception 'FAILED %: % touched % row(s), expected %', label, role_name, got_rows, expected_rows;
  end if;
  return 'ok   ' || label;
end
$f$;

-- A query that runs as the superuser must answer exactly `expected`.
create function pg_temp.expect_equal(label text, query text, expected text) returns text
language plpgsql as $f$
declare
  got text;
begin
  execute query into got;
  if got is distinct from expected then
    raise exception 'FAILED %: expected [%], got [%]', label, expected, got;
  end if;
  return 'ok   ' || label;
end
$f$;

-- N distinct CJK characters (3 bytes each in UTF-8) that do not compress: a repeated character would be squeezed by TOAST
-- and the index would never see its real size. 900 of them (2700 bytes) break the unique index on url with a 54000 error.
create function pg_temp.cjk(n int) returns text language sql immutable as
$f$ select string_agg(chr(19968 + (g * 7919) % 20000), '') from generate_series(1, n) g $f$;

-- Rows to play with, written by the superuser (which bypasses row level security).
insert into public.articles (url, title, summary, source, language)
values ('https://example.test/seed', 'Seed article', 'Seed summary', 'devto', 'en');
insert into public.articles (url, title, summary, source, language, published_at)
values ('https://example.test/stale', 'Stale article', 'Published long ago', 'devto', 'en', now() - interval '10 days');
insert into public.leads (protocolo, canal, nome, email, servico, mensagem)
values ('SEED-1', 'email', 'Seed Lead', 'seed@example.test', 'Agente de IA', 'Seed message');

-- ============================================================================================================
-- A. The shape of what exists and of the grants: what each role may touch at all.
-- ============================================================================================================
select pg_temp.expect_equal('A1 every table of public and private has row level security on', $q$
  select (count(*) = 0)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private') and c.relkind in ('r', 'p') and not c.relrowsecurity
$q$, 'true');

select pg_temp.expect_equal('A2 the relations of public are exactly the known ones, of any kind (no view, no sequence, no foreign table)', $q$
  select coalesce(string_agg(c.relname || ':' || c.relkind::text, ',' order by c.relname), '') from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
$q$, 'articles:r,leads:r');

select pg_temp.expect_equal('A2 the relations of private are exactly the known ones, of any kind', $q$
  select coalesce(string_agg(c.relname || ':' || c.relkind::text, ',' order by c.relname), '') from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'private' and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
$q$, 'schema_migrations:r');

select pg_temp.expect_equal('A3 ' || r.role_name || ' holds exactly these privileges on the relations of public and private (column level counts)', format($q$
  select coalesce(string_agg(n.nspname || '.' || c.relname || ':' || p.priv, ',' order by n.nspname, c.relname, p.priv), '')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('select'), ('insert'), ('update'), ('references'), ('delete'), ('truncate'), ('trigger')) p(priv)
  where n.nspname in ('public', 'private') and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and case when p.priv in ('select', 'insert', 'update', 'references')
             then has_any_column_privilege(%L, c.oid, p.priv)
             else has_table_privilege(%L, c.oid, p.priv) end
$q$, r.role_name, r.role_name), r.expected)
from (values
  ('anon', 'public.articles:select'),
  ('authenticated', 'public.articles:select'),
  ('news_writer', 'public.articles:delete,public.articles:insert,public.articles:select,public.articles:update'),
  ('n8n_leads', 'public.leads:insert'),
  ('authenticator', '')
) as r(role_name, expected);

select pg_temp.expect_equal('A3b no role holds any privilege on a sequence', $q$
  select (count(*) = 0)::text from pg_class c cross join (values ('anon'), ('authenticated'), ('news_writer'), ('n8n_leads'), ('authenticator')) r(role_name)
  cross join (values ('usage'), ('select'), ('update')) p(priv)
  where c.relkind = 'S' and has_sequence_privilege(r.role_name, c.oid, p.priv)
$q$, 'true');

select pg_temp.expect_equal('A3c there is no function of ours in public or private, and no role can execute one', $q$
  select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private')
    and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
$q$, '0');

select pg_temp.expect_equal('A3d ' || r.role_name || ' cannot execute any function of public or private (extension functions apart)', format($q$
  select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private')
    and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
    and has_function_privilege(%L, p.oid, 'execute')
$q$, r.role_name), '0')
from (values ('anon'), ('authenticated'), ('news_writer'), ('n8n_leads'), ('authenticator')) as r(role_name);

select pg_temp.expect_equal('A4 n8n_leads and news_writer start without a login', $q$
  select string_agg(rolname || ':' || rolcanlogin::text, ',' order by rolname) from pg_roles where rolname in ('news_writer', 'n8n_leads')
$q$, 'n8n_leads:false,news_writer:false');

select pg_temp.expect_equal('A4b the roles carry their limits (connections and statement time)', $q$
  select string_agg(rolname || ':' || rolconnlimit || ':' || coalesce(rolconfig::text, ''), ',' order by rolname)
  from pg_roles where rolname in ('news_writer', 'n8n_leads')
$q$, 'n8n_leads:5:{statement_timeout=5s},news_writer:3:{statement_timeout=30s}');

select pg_temp.expect_equal('A5 neither of our roles bypasses row level security or is a superuser', $q$
  select (count(*) = 0)::text from pg_roles where rolname in ('news_writer', 'n8n_leads') and (rolbypassrls or rolsuper)
$q$, 'true');

select pg_temp.expect_equal('A6 no default privilege of the schema public hands anything to anon or authenticated (for any owner)', $q$
  select (count(*) = 0)::text from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral aclexplode(d.defaclacl) a
  where n.nspname = 'public' and a.grantee in (select oid from pg_roles where rolname in ('anon', 'authenticated'))
$q$, 'true');

select pg_temp.expect_equal('A7 no role can create in public, and none can even enter private', $q$
  select (count(*) = 0)::text from (values ('anon'), ('authenticated'), ('news_writer'), ('n8n_leads'), ('authenticator')) r(role_name)
  where has_schema_privilege(r.role_name, 'public', 'create') or has_schema_privilege(r.role_name, 'private', 'usage')
     or has_schema_privilege(r.role_name, 'private', 'create')
$q$, 'true');

select pg_temp.expect_equal('A8 authenticator cannot become n8n_leads, can become news_writer, and holds nothing of its own', $q$
  select pg_has_role('authenticator', 'n8n_leads', 'member')::text || ',' || pg_has_role('authenticator', 'news_writer', 'member')::text
$q$, 'false,true');

select pg_temp.expect_equal('A9 n8n_leads holds insert on its eight columns and not on id or criado_em', $q$
  select string_agg(a.attname, ',' order by a.attname) from pg_attribute a
  where a.attrelid = 'public.leads'::regclass and a.attnum > 0 and not a.attisdropped
    and has_column_privilege('n8n_leads', 'public.leads', a.attname, 'insert')
$q$, 'canal,email,enviado_em,mensagem,nome,protocolo,servico,whatsapp');

-- ============================================================================================================
-- B. Review focus 1: anon (and authenticated) reading, inserting, updating or deleting.
-- ============================================================================================================
select pg_temp.expect_rows('B1 anon reads articles', 'anon', 'select * from public.articles', 2);
select pg_temp.expect_rows('B2 authenticated reads articles', 'authenticated', 'select * from public.articles', 2);
select pg_temp.expect_error('B3 anon cannot read leads', 'anon', 'select * from public.leads', '42501');
select pg_temp.expect_error('B4 authenticated cannot read leads', 'authenticated', 'select * from public.leads', '42501');
select pg_temp.expect_error('B5 anon cannot read the migrations registry', 'anon', 'select * from private.schema_migrations', '42501');
select pg_temp.expect_error('B6 anon cannot insert into articles', 'anon', $q$
  insert into public.articles (url, title, source, language) values ('https://example.test/anon', 'x', 'devto', 'pt')
$q$, '42501');
select pg_temp.expect_error('B7 anon cannot insert into leads', 'anon', $q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('ANON-1', 'email', 'x', 'x', 'x')
$q$, '42501');
select pg_temp.expect_error('B8 anon cannot update articles', 'anon', $q$update public.articles set title = 'hacked'$q$, '42501');
select pg_temp.expect_error('B9 anon cannot delete from articles', 'anon', 'delete from public.articles', '42501');
select pg_temp.expect_error('B10 anon cannot delete from leads', 'anon', 'delete from public.leads', '42501');
select pg_temp.expect_error('B11 authenticated cannot insert into articles', 'authenticated', $q$
  insert into public.articles (url, title, source, language) values ('https://example.test/auth', 'x', 'devto', 'pt')
$q$, '42501');
select pg_temp.expect_error('B12 authenticated cannot insert into leads', 'authenticated', $q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('AUTH-1', 'email', 'x', 'x', 'x')
$q$, '42501');
select pg_temp.expect_error('B13 authenticated cannot delete from articles', 'authenticated', 'delete from public.articles', '42501');
select pg_temp.expect_error('B14 anon cannot create a table in public', 'anon', 'create table public.anon_table (id int)', '42501');
select pg_temp.expect_error('B15 anon cannot create a view over leads', 'anon', 'create view public.anon_view as select * from public.leads', '42501');

-- ============================================================================================================
-- C. Review focus 2, part one: news_writer writes articles and touches nothing else.
-- ============================================================================================================
select pg_temp.expect_ok('C1 news_writer inserts an article', 'news_writer', $q$
  insert into public.articles (url, title, summary, image, published_at, source, language)
  values ('https://example.test/written', 'Written', 'Summary', 'https://example.test/i.png', now(), 'tabnews', 'pt')
$q$);
select pg_temp.expect_ok('C2 news_writer upserts by url, the way the job does', 'news_writer', $q$
  insert into public.articles (url, title, source, language) values ('https://example.test/written', 'Written again', 'tabnews', 'pt')
  on conflict (url) do update set title = excluded.title, fetched_at = now()
$q$);
select pg_temp.expect_rows('C3 news_writer updates an article', 'news_writer', $q$
  update public.articles set summary = 'changed' where url = 'https://example.test/written'
$q$, 1);
select pg_temp.expect_rows('C3b news_writer updates an article that was published long ago (the future check does not trip on old rows)', 'news_writer', $q$
  update public.articles set summary = 'renewed', fetched_at = now() where url = 'https://example.test/stale'
$q$, 1);
select pg_temp.expect_rows('C4 news_writer deletes an article', 'news_writer', $q$
  delete from public.articles where url = 'https://example.test/written'
$q$, 1);
select pg_temp.expect_error('C5 news_writer cannot read leads', 'news_writer', 'select * from public.leads', '42501');
select pg_temp.expect_error('C6 news_writer cannot insert into leads', 'news_writer', $q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('NW-1', 'email', 'x', 'x', 'x')
$q$, '42501');
select pg_temp.expect_error('C7 news_writer cannot update leads', 'news_writer', $q$update public.leads set nome = 'x'$q$, '42501');
select pg_temp.expect_error('C8 news_writer cannot delete from leads', 'news_writer', 'delete from public.leads', '42501');
select pg_temp.expect_error('C9 news_writer cannot read the migrations registry', 'news_writer', 'select * from private.schema_migrations', '42501');
select pg_temp.expect_error('C10 news_writer cannot write the migrations registry', 'news_writer', $q$
  insert into private.schema_migrations (id) values ('9999_nw')
$q$, '42501');
select pg_temp.expect_error('C11 news_writer cannot create a table', 'news_writer', 'create table public.nw_table (id int)', '42501');
select pg_temp.expect_error('C12 news_writer cannot create a view over leads', 'news_writer', 'create view public.nw_view as select * from public.leads', '42501');

-- ============================================================================================================
-- D. Review focus 2, part two: n8n_leads inserts leads and nothing else, and cannot read back.
-- ============================================================================================================
select pg_temp.expect_ok('D1 n8n_leads inserts a lead (the plain insert of the n8n node)', 'n8n_leads', $q$
  insert into public.leads (protocolo, canal, nome, email, whatsapp, servico, mensagem, enviado_em)
  values ('N8N-1', 'whatsapp', 'Bia', null, '5511912345678', 'Agente de IA', 'Oi', now())
$q$);
select pg_temp.expect_error('D2 n8n_leads cannot read leads', 'n8n_leads', 'select * from public.leads', '42501');
select pg_temp.expect_error('D3 n8n_leads cannot read articles', 'n8n_leads', 'select * from public.articles', '42501');
select pg_temp.expect_error('D4 n8n_leads cannot insert into articles', 'n8n_leads', $q$
  insert into public.articles (url, title, source, language) values ('https://example.test/n8n', 'x', 'devto', 'pt')
$q$, '42501');
select pg_temp.expect_error('D5 n8n_leads cannot update leads', 'n8n_leads', $q$update public.leads set nome = 'x'$q$, '42501');
select pg_temp.expect_error('D6 n8n_leads cannot delete from leads', 'n8n_leads', 'delete from public.leads', '42501');
select pg_temp.expect_error('D7 n8n_leads cannot read the migrations registry', 'n8n_leads', 'select * from private.schema_migrations', '42501');
select pg_temp.expect_error('D8 n8n_leads cannot delete from articles', 'n8n_leads', 'delete from public.articles', '42501');
select pg_temp.expect_error('D9 n8n_leads cannot create a table', 'n8n_leads', 'create table public.n8n_table (id int)', '42501');
select pg_temp.expect_error('D9b n8n_leads cannot create a view over leads', 'n8n_leads', 'create view public.n8n_view as select * from public.leads', '42501');

-- The statement shapes of the n8n node, pinned (see the comment of 0003_leads.sql and the n8n step by step).
select pg_temp.expect_error('D10 an insert with RETURNING fails: the node must leave Output Columns empty', 'n8n_leads', $q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('N8N-10', 'email', 'x', 'x', 'x') returning id
$q$, '42501');
select pg_temp.expect_error('D11 an insert with ON CONFLICT (protocolo) fails: a conflict target needs select', 'n8n_leads', $q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('N8N-11', 'email', 'x', 'x', 'x')
  on conflict (protocolo) do nothing
$q$, '42501');
select pg_temp.expect_rows('D12 an insert with ON CONFLICT DO NOTHING and no target skips a repeated protocolo without an error', 'n8n_leads', $q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('N8N-1', 'email', 'x', 'x', 'x') on conflict do nothing
$q$, 0);
select pg_temp.expect_rows('D12b the same shape inserts a new protocolo', 'n8n_leads', $q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('N8N-12', 'email', 'x', 'x', 'x') on conflict do nothing
$q$, 1);
select pg_temp.expect_error('D13 a repeated protocolo without ON CONFLICT is a unique violation, which the node continues past', 'n8n_leads', $q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('N8N-1', 'email', 'x', 'x', 'x')
$q$, '23505');
select pg_temp.expect_error('D14 n8n_leads cannot set the id of a lead', 'n8n_leads', $q$
  insert into public.leads (id, protocolo, canal, nome, servico, mensagem) values (gen_random_uuid(), 'N8N-14', 'email', 'x', 'x', 'x')
$q$, '42501');
select pg_temp.expect_error('D15 n8n_leads cannot set the moment of the copy', 'n8n_leads', $q$
  insert into public.leads (criado_em, protocolo, canal, nome, servico, mensagem) values (now() - interval '1 year', 'N8N-15', 'email', 'x', 'x', 'x')
$q$, '42501');
select pg_temp.expect_equal('D16 the id and the moment are set by the database anyway', $q$
  select (id is not null and criado_em > now() - interval '1 minute')::text from public.leads where protocolo = 'N8N-12'
$q$, 'true');

-- ============================================================================================================
-- E. The size and shape limits: rows that break them are rejected even for the role that may write.
-- ============================================================================================================
select pg_temp.expect_error('E1 a lead with a channel that is not email or whatsapp is rejected', 'n8n_leads', $q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('E-1', 'sms', 'x', 'x', 'x')
$q$, '23514');
select pg_temp.expect_error('E2 a lead without a channel is rejected', 'n8n_leads', $q$
  insert into public.leads (protocolo, nome, servico, mensagem) values ('E-2', 'x', 'x', 'x')
$q$, '23502');
select pg_temp.expect_error('E3 a lead message of 5001 characters is rejected', 'n8n_leads', format($q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('E-3', 'email', 'x', 'x', %L)
$q$, repeat('m', 5001)), '23514');
select pg_temp.expect_ok('E4 a lead message of exactly 5000 characters is accepted', 'n8n_leads', format($q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('E-4', 'email', 'x', 'x', %L)
$q$, repeat('m', 5000)));
select pg_temp.expect_error('E5 a lead name of 201 characters is rejected', 'n8n_leads', format($q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('E-5', 'email', %L, 'x', 'x')
$q$, repeat('n', 201)), '23514');
select pg_temp.expect_error('E6 a repeated lead protocol is rejected', 'n8n_leads', $q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('N8N-1', 'email', 'x', 'x', 'x')
$q$, '23505');
select pg_temp.expect_error('E7 a lead whatsapp of 33 characters is rejected', 'n8n_leads', format($q$
  insert into public.leads (protocolo, canal, nome, whatsapp, servico, mensagem) values ('E-7', 'whatsapp', 'x', %L, 'x', 'x')
$q$, repeat('1', 33)), '23514');

-- E20: control characters in the single line fields of a lead (a CR LF then "Bcc:" in a name is a header injection).
select pg_temp.expect_error('E20 a lead name with a CR LF and a Bcc header is rejected', 'n8n_leads', format($q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('E-20', 'email', %L, 'x', 'x')
$q$, 'Ana' || chr(13) || chr(10) || 'Bcc: attacker@example.test'), '23514');
select pg_temp.expect_error('E21 a lead email with a line feed is rejected', 'n8n_leads', format($q$
  insert into public.leads (protocolo, canal, nome, email, servico, mensagem) values ('E-21', 'email', 'x', %L, 'x', 'x')
$q$, 'a@example.test' || chr(10) || 'Bcc: b@example.test'), '23514');
select pg_temp.expect_error('E22 a lead whatsapp with a tab is rejected', 'n8n_leads', format($q$
  insert into public.leads (protocolo, canal, nome, whatsapp, servico, mensagem) values ('E-22', 'whatsapp', 'x', %L, 'x', 'x')
$q$, '5511' || chr(9) || '912345678'), '23514');
select pg_temp.expect_error('E23 a lead service with a C1 control character (NEL) is rejected', 'n8n_leads', format($q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('E-23', 'email', 'x', %L, 'x')
$q$, 'Agente' || chr(133) || 'de IA'), '23514');
select pg_temp.expect_error('E24 a lead protocol with a line feed is rejected', 'n8n_leads', format($q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values (%L, 'email', 'x', 'x', 'x')
$q$, 'E-24' || chr(10)), '23514');
select pg_temp.expect_error('E25 a lead name with a Unicode line separator is rejected', 'n8n_leads', format($q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('E-25', 'email', %L, 'x', 'x')
$q$, 'Ana' || chr(8232) || 'Bcc: x'), '23514');
select pg_temp.expect_ok('E26 a lead message with line breaks and a tab is accepted', 'n8n_leads', format($q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('E-26', 'email', 'x', 'x', %L)
$q$, 'linha 1' || chr(13) || chr(10) || 'linha 2' || chr(9) || 'fim'));
select pg_temp.expect_ok('E27 a lead with accents and an emoji in the name is accepted', 'n8n_leads', format($q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('E-27', 'email', %L, 'x', 'x')
$q$, 'João Conceição ' || chr(128512)));

-- Articles: the address.
select pg_temp.expect_error('E8 an article url with javascript: is rejected', 'news_writer', $q$
  insert into public.articles (url, title, source, language) values ('javascript:alert(1)', 'x', 'devto', 'pt')
$q$, '23514');
select pg_temp.expect_error('E9 an article url with data: is rejected', 'news_writer', $q$
  insert into public.articles (url, title, source, language) values ('data:text/html,<b>x</b>', 'x', 'devto', 'pt')
$q$, '23514');
select pg_temp.expect_error('E10 an article url that carries a user and a password is rejected', 'news_writer', $q$
  insert into public.articles (url, title, source, language) values ('https://user:pass@example.test/a', 'x', 'devto', 'pt')
$q$, '23514');
select pg_temp.expect_error('E11 an article url with a space is rejected', 'news_writer', $q$
  insert into public.articles (url, title, source, language) values ('https://example.test/a b', 'x', 'devto', 'pt')
$q$, '23514');
select pg_temp.expect_error('E12 an article title of 301 characters is rejected', 'news_writer', format($q$
  insert into public.articles (url, title, source, language) values ('https://example.test/e12', %L, 'devto', 'pt')
$q$, repeat('t', 301)), '23514');
select pg_temp.expect_ok('E13 an article title of exactly 300 characters is accepted', 'news_writer', format($q$
  insert into public.articles (url, title, source, language) values ('https://example.test/e13', %L, 'devto', 'pt')
$q$, repeat('t', 300)));
select pg_temp.expect_error('E14 an article summary of 601 characters is rejected', 'news_writer', format($q$
  insert into public.articles (url, title, summary, source, language) values ('https://example.test/e14', 'x', %L, 'devto', 'pt')
$q$, repeat('s', 601)), '23514');
select pg_temp.expect_error('E15 an article url of 2001 characters is rejected', 'news_writer', format($q$
  insert into public.articles (url, title, source, language) values (%L, 'x', 'devto', 'pt')
$q$, 'https://example.test/' || repeat('u', 2001 - length('https://example.test/'))), '23514');
select pg_temp.expect_ok('E15b an article url of exactly 2000 characters is accepted', 'news_writer', format($q$
  insert into public.articles (url, title, source, language) values (%L, 'x', 'devto', 'pt')
$q$, 'https://example.test/' || repeat('u', 2000 - length('https://example.test/'))));
select pg_temp.expect_error('E16 an article language other than pt or en is rejected', 'news_writer', $q$
  insert into public.articles (url, title, source, language) values ('https://example.test/e16', 'x', 'devto', 'fr')
$q$, '23514');
select pg_temp.expect_error('E17 an article image with javascript: is rejected', 'news_writer', $q$
  insert into public.articles (url, title, source, language, image) values ('https://example.test/e17', 'x', 'devto', 'pt', 'javascript:alert(1)')
$q$, '23514');
select pg_temp.expect_error('E18 a repeated article url is rejected', 'news_writer', $q$
  insert into public.articles (url, title, source, language) values ('https://example.test/seed', 'again', 'devto', 'en')
$q$, '23505');
select pg_temp.expect_ok('E19 an http and an https article url are both accepted', 'news_writer', $q$
  insert into public.articles (url, title, source, language) values ('http://example.test/e19', 'x', 'devto', 'pt'), ('https://example.test/e19', 'x', 'devto', 'pt')
$q$);

-- E30: an address in bytes. 700 CJK characters are 2100 bytes: under the character limit, over the byte limit that keeps
-- the unique index from failing with 54000 (a hostile article must be refused by a check, not abort a whole batch).
select pg_temp.expect_error('E30 an article url of 700 distinct CJK characters (2100 bytes) is rejected by the size check', 'news_writer', format($q$
  insert into public.articles (url, title, source, language) values (%L, 'x', 'devto', 'pt')
$q$, 'https://example.test/' || pg_temp.cjk(700)), '23514');
select pg_temp.expect_error('E31 an article url of 900 CJK characters (2700 bytes, which the unique index alone would refuse with 54000) is rejected by the size check', 'news_writer', format($q$
  insert into public.articles (url, title, source, language) values (%L, 'x', 'devto', 'pt')
$q$, 'https://example.test/' || pg_temp.cjk(900)), '23514');
select pg_temp.expect_ok('E32 an article url of 600 CJK characters (1800 bytes) is accepted and indexed', 'news_writer', format($q$
  insert into public.articles (url, title, source, language) values (%L, 'x', 'devto', 'pt')
$q$, 'https://example.test/' || pg_temp.cjk(600)));
select pg_temp.expect_error('E33 an article image of 700 distinct CJK characters (2100 bytes) is rejected', 'news_writer', format($q$
  insert into public.articles (url, title, source, language, image) values ('https://example.test/e33', 'x', 'devto', 'pt', %L)
$q$, 'https://example.test/' || pg_temp.cjk(700)), '23514');
select pg_temp.expect_error('E34 an article image with a space is rejected', 'news_writer', $q$
  insert into public.articles (url, title, source, language, image) values ('https://example.test/e34', 'x', 'devto', 'pt', 'https://example.test/a b.png')
$q$, '23514');

-- E40: the shape of the address. Every character below must be refused inside an address, in the url and in the image.
select pg_temp.expect_error('E40 an article url with ' || v.label || ' is rejected', 'news_writer', format($q$
  insert into public.articles (url, title, source, language) values (%L, 'x', 'devto', 'pt')
$q$, 'https://example.test/a' || chr(v.code) || 'b'), '23514')
from (values
  ('a space', 32), ('SOH', 1), ('a tab', 9), ('a line feed', 10), ('a carriage return', 13), ('DEL', 127),
  ('NEL (U+0085)', 133), ('a no-break space (U+00A0)', 160), ('a soft hyphen (U+00AD)', 173), ('an ogham space (U+1680)', 5760),
  ('an en quad (U+2000)', 8192), ('a zero width space (U+200B)', 8203), ('a right to left mark (U+200F)', 8207),
  ('a line separator (U+2028)', 8232), ('a right to left override (U+202E)', 8238), ('a narrow no-break space (U+202F)', 8239),
  ('a medium mathematical space (U+205F)', 8287), ('a word joiner (U+2060)', 8288), ('an isolate (U+2066)', 8294),
  ('an ideographic space (U+3000)', 12288), ('a byte order mark (U+FEFF)', 65279), ('a fullwidth @ (U+FF20)', 65312),
  ('a fullwidth apostrophe (U+FF07)', 65287), ('a double quote', 34), ('a less than sign', 60), ('a greater than sign', 62),
  ('an apostrophe', 39), ('a backslash', 92)
) as v(label, code);

select pg_temp.expect_error('E41 an article image with ' || v.label || ' is rejected', 'news_writer', format($q$
  insert into public.articles (url, title, source, language, image) values (%L, 'x', 'devto', 'pt', %L)
$q$, 'https://example.test/e41-' || v.code, 'https://example.test/a' || chr(v.code) || 'b.png'), '23514')
from (values ('a no-break space', 160), ('a zero width space', 8203), ('a double quote', 34), ('a less than sign', 60), ('a fullwidth @', 65312), ('a line feed', 10), ('a backslash', 92)) as v(label, code);

select pg_temp.expect_error('E42 an article url with ' || v.label || ' is rejected', 'news_writer', format($q$
  insert into public.articles (url, title, source, language) values (%L, 'x', 'devto', 'pt')
$q$, v.url), '23514')
from (values
  ('no host (https://)', 'https://'), ('no host before a path', 'https:///path'), ('no host before a query', 'https://?x=1'),
  ('no host before a fragment', 'https://#top'), ('a fullwidth @ for the credentials', 'https://user' || chr(65312) || 'host.example.test/a'),
  ('a capital scheme (the job must lower case it)', 'HTTPS://example.test/a'), ('a ftp scheme', 'ftp://example.test/a'),
  ('a protocol relative address', '//example.test/a')
) as v(label, url);

select pg_temp.expect_ok('E43 an article url with accents, a query and a fragment is accepted', 'news_writer', $q$
  insert into public.articles (url, title, source, language, image)
  values ('https://example.test/ação?x=1&y=2#frag', 'x', 'devto', 'pt', 'https://example.test/imagem-ç.png')
$q$);
select pg_temp.expect_ok('E44 an article url with a port and an IDN host is accepted', 'news_writer', $q$
  insert into public.articles (url, title, source, language) values ('https://exemplo.com.br:8443/artigo', 'x', 'devto', 'pt'), ('http://localhost:3000/a', 'x', 'devto', 'pt')
$q$);

-- E50: published_at cannot pin an article at the top.
select pg_temp.expect_error('E50 an article published one hour in the future is rejected', 'news_writer', $q$
  insert into public.articles (url, title, source, language, published_at) values ('https://example.test/e50', 'x', 'devto', 'pt', now() + interval '1 hour')
$q$, '23514');
select pg_temp.expect_error('E51 an upsert that moves an article to the future is rejected', 'news_writer', $q$
  insert into public.articles (url, title, source, language, published_at) values ('https://example.test/seed', 'x', 'devto', 'en', now() + interval '1 day')
  on conflict (url) do update set published_at = excluded.published_at
$q$, '23514');
select pg_temp.expect_ok('E52 an article published 5 minutes ahead (a clock a little fast) is accepted', 'news_writer', $q$
  insert into public.articles (url, title, source, language, published_at) values ('https://example.test/e52', 'x', 'devto', 'pt', now() + interval '5 minutes')
$q$);
select pg_temp.expect_ok('E53 an article without a publication date is accepted', 'news_writer', $q$
  insert into public.articles (url, title, source, language) values ('https://example.test/e53', 'x', 'devto', 'pt')
$q$);

-- ============================================================================================================
-- F. Second line of defense: the policies alone. We hand out the table privileges the migrations took away, inside a
-- savepoint, and the rows must stay closed. (A table privilege is the first lock, the policy is the second.)
-- ============================================================================================================
savepoint without_the_first_lock;
grant usage on schema private to anon, authenticated, news_writer, n8n_leads;
grant select, insert, update, delete on public.leads to anon, authenticated, news_writer, n8n_leads;
grant select, insert, update, delete on public.articles to anon, authenticated, n8n_leads;
grant select, insert, update, delete on private.schema_migrations to anon, authenticated, news_writer, n8n_leads;

select pg_temp.expect_rows('F1 anon sees no lead even with select granted', 'anon', 'select * from public.leads', 0);
select pg_temp.expect_rows('F2 authenticated sees no lead even with select granted', 'authenticated', 'select * from public.leads', 0);
select pg_temp.expect_rows('F3 news_writer sees no lead even with select granted', 'news_writer', 'select * from public.leads', 0);
select pg_temp.expect_rows('F4 n8n_leads sees no lead even with select granted (it has no select policy)', 'n8n_leads', 'select * from public.leads', 0);
select pg_temp.expect_rows('F5 n8n_leads sees no article even with select granted', 'n8n_leads', 'select * from public.articles', 0);
select pg_temp.expect_error('F6 anon cannot insert a lead even with insert granted', 'anon', $q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('F-6', 'email', 'x', 'x', 'x')
$q$, '42501');
select pg_temp.expect_error('F7 news_writer cannot insert a lead even with insert granted', 'news_writer', $q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('F-7', 'email', 'x', 'x', 'x')
$q$, '42501');
select pg_temp.expect_error('F8 n8n_leads cannot insert an article even with insert granted', 'n8n_leads', $q$
  insert into public.articles (url, title, source, language) values ('https://example.test/f8', 'x', 'devto', 'pt')
$q$, '42501');
select pg_temp.expect_error('F9 anon cannot insert an article even with insert granted', 'anon', $q$
  insert into public.articles (url, title, source, language) values ('https://example.test/f9', 'x', 'devto', 'pt')
$q$, '42501');
select pg_temp.expect_rows('F10 anon deletes no article even with delete granted', 'anon', 'delete from public.articles', 0);
select pg_temp.expect_rows('F11 anon updates no article even with update granted', 'anon', $q$update public.articles set title = 'x'$q$, 0);
select pg_temp.expect_rows('F12 anon deletes no lead even with delete granted', 'anon', 'delete from public.leads', 0);
select pg_temp.expect_rows('F13 news_writer deletes no lead even with delete granted', 'news_writer', 'delete from public.leads', 0);
select pg_temp.expect_rows('F14 n8n_leads updates no lead even with update granted', 'n8n_leads', $q$update public.leads set nome = 'x'$q$, 0);
select pg_temp.expect_rows('F15 anon sees no row of the migrations registry even with select and usage granted', 'anon', 'select * from private.schema_migrations', 0);
select pg_temp.expect_error('F16 anon cannot write the migrations registry even with insert and usage granted', 'anon', $q$
  insert into private.schema_migrations (id) values ('9999_anon')
$q$, '42501');
select pg_temp.expect_rows('F18 news_writer sees no row of the migrations registry even with select and usage granted', 'news_writer', 'select * from private.schema_migrations', 0);
rollback to savepoint without_the_first_lock;

-- The savepoint took the extra grants back: the shape of A holds again.
select pg_temp.expect_equal('F17 after the savepoint anon holds only select on articles again', $q$
  select coalesce(string_agg(n.nspname || '.' || c.relname || ':' || p.priv, ',' order by n.nspname, c.relname, p.priv), '')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('select'), ('insert'), ('update'), ('delete')) p(priv)
  where n.nspname in ('public', 'private') and c.relkind in ('r', 'p') and has_table_privilege('anon', c.oid, p.priv)
$q$, 'public.articles:select');

select 'rls tests passed';
rollback;
