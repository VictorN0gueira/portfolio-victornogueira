-- Proof of the row level security of the VN One tables. It runs after supabase/tests/00_supabase_roles.sql and every
-- migration, as a superuser, in a throwaway Postgres (see scripts/run-rls-tests.mjs). It switches into each role with
-- `set local role`, tries an operation and checks the answer. Everything happens inside one transaction that ends in a
-- rollback, so it leaves nothing behind. The first check that fails stops the script with a non zero exit code.
--
-- A denied operation must fail with sqlstate 42501 (insufficient_privilege, which Postgres also uses for a row that
-- breaks a row level security policy). Any other error, or no error, is a failure.
--
-- Section F removes the first line of defense on purpose (it grants the table privileges the migrations took away) and
-- shows that the policies alone still keep the rows closed.
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

-- Rows to play with, written by the superuser (which bypasses row level security).
insert into public.articles (url, title, summary, source, language)
values ('https://example.test/seed', 'Seed article', 'Seed summary', 'devto', 'en');
insert into public.leads (protocolo, canal, nome, email, servico, mensagem)
values ('SEED-1', 'email', 'Seed Lead', 'seed@example.test', 'Agente de IA', 'Seed message');

-- ============================================================================================================
-- A. The shape of the grants: what each role may touch at all.
-- ============================================================================================================
select pg_temp.expect_equal('A1 every table of public has row level security on', $q$
  select (count(*) = 0)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
$q$, 'true');

select pg_temp.expect_equal('A2 the public tables are exactly the ones we know', $q$
  select string_agg(c.relname, ',' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
$q$, 'articles,leads,schema_migrations');

select pg_temp.expect_equal('A3 ' || r.role_name || ' holds exactly these privileges on public tables', format($q$
  select coalesce(string_agg(c.relname || ':' || p.priv, ',' order by c.relname, p.priv), '')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('select'), ('insert'), ('update'), ('delete'), ('truncate'), ('references'), ('trigger')) p(priv)
  where n.nspname = 'public' and c.relkind in ('r', 'p') and has_table_privilege(%L, c.oid, p.priv)
$q$, r.role_name), r.expected)
from (values
  ('anon', 'articles:select'),
  ('authenticated', 'articles:select'),
  ('news_writer', 'articles:delete,articles:insert,articles:select,articles:update'),
  ('n8n_leads', 'leads:insert')
) as r(role_name, expected);

select pg_temp.expect_equal('A4 n8n_leads and news_writer start without a login', $q$
  select string_agg(rolname || ':' || rolcanlogin::text, ',' order by rolname) from pg_roles where rolname in ('news_writer', 'n8n_leads')
$q$, 'n8n_leads:false,news_writer:false');

select pg_temp.expect_equal('A5 neither of our roles bypasses row level security or is a superuser', $q$
  select (count(*) = 0)::text from pg_roles where rolname in ('news_writer', 'n8n_leads') and (rolbypassrls or rolsuper)
$q$, 'true');

-- ============================================================================================================
-- B. Review focus 1: anon (and authenticated) reading, inserting, updating or deleting.
-- ============================================================================================================
select pg_temp.expect_rows('B1 anon reads articles', 'anon', 'select * from public.articles', 1);
select pg_temp.expect_rows('B2 authenticated reads articles', 'authenticated', 'select * from public.articles', 1);
select pg_temp.expect_error('B3 anon cannot read leads', 'anon', 'select * from public.leads', '42501');
select pg_temp.expect_error('B4 authenticated cannot read leads', 'authenticated', 'select * from public.leads', '42501');
select pg_temp.expect_error('B5 anon cannot read the migrations registry', 'anon', 'select * from public.schema_migrations', '42501');
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
select pg_temp.expect_rows('C4 news_writer deletes an article', 'news_writer', $q$
  delete from public.articles where url = 'https://example.test/written'
$q$, 1);
select pg_temp.expect_error('C5 news_writer cannot read leads', 'news_writer', 'select * from public.leads', '42501');
select pg_temp.expect_error('C6 news_writer cannot insert into leads', 'news_writer', $q$
  insert into public.leads (protocolo, canal, nome, servico, mensagem) values ('NW-1', 'email', 'x', 'x', 'x')
$q$, '42501');
select pg_temp.expect_error('C7 news_writer cannot update leads', 'news_writer', $q$update public.leads set nome = 'x'$q$, '42501');
select pg_temp.expect_error('C8 news_writer cannot delete from leads', 'news_writer', 'delete from public.leads', '42501');
select pg_temp.expect_error('C9 news_writer cannot read the migrations registry', 'news_writer', 'select * from public.schema_migrations', '42501');
select pg_temp.expect_error('C10 news_writer cannot write the migrations registry', 'news_writer', $q$
  insert into public.schema_migrations (id) values ('9999_nw')
$q$, '42501');
select pg_temp.expect_error('C11 news_writer cannot create a table', 'news_writer', 'create table public.nw_table (id int)', '42501');

-- ============================================================================================================
-- D. Review focus 2, part two: n8n_leads inserts leads and nothing else, and cannot read back.
-- ============================================================================================================
select pg_temp.expect_ok('D1 n8n_leads inserts a lead', 'n8n_leads', $q$
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
select pg_temp.expect_error('D7 n8n_leads cannot read the migrations registry', 'n8n_leads', 'select * from public.schema_migrations', '42501');
select pg_temp.expect_error('D8 n8n_leads cannot delete from articles', 'n8n_leads', 'delete from public.articles', '42501');
select pg_temp.expect_error('D9 n8n_leads cannot create a table', 'n8n_leads', 'create table public.n8n_table (id int)', '42501');

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
select pg_temp.expect_error('E15 an article url of 2049 characters is rejected', 'news_writer', format($q$
  insert into public.articles (url, title, source, language) values (%L, 'x', 'devto', 'pt')
$q$, 'https://example.test/' || repeat('u', 2049 - length('https://example.test/'))), '23514');
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

-- ============================================================================================================
-- F. Second line of defense: the policies alone. We hand out the table privileges the migrations took away, inside a
-- savepoint, and the rows must stay closed. (A table privilege is the first lock, the policy is the second.)
-- ============================================================================================================
savepoint without_the_first_lock;
grant select, insert, update, delete on public.leads to anon, authenticated, news_writer, n8n_leads;
grant select, insert, update, delete on public.articles to anon, authenticated, n8n_leads;
grant select, insert, update, delete on public.schema_migrations to anon, authenticated, news_writer, n8n_leads;

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
select pg_temp.expect_rows('F15 anon sees no row of the migrations registry even with select granted', 'anon', 'select * from public.schema_migrations', 0);
select pg_temp.expect_error('F16 anon cannot write the migrations registry even with insert granted', 'anon', $q$
  insert into public.schema_migrations (id) values ('9999_anon')
$q$, '42501');
rollback to savepoint without_the_first_lock;

-- The savepoint took the extra grants back: the shape of A holds again.
select pg_temp.expect_equal('F17 after the savepoint anon holds only select on articles again', $q$
  select coalesce(string_agg(c.relname || ':' || p.priv, ',' order by c.relname, p.priv), '')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('select'), ('insert'), ('update'), ('delete')) p(priv)
  where n.nspname = 'public' and c.relkind in ('r', 'p') and has_table_privilege('anon', c.oid, p.priv)
$q$, 'articles:select');

select 'rls tests passed';
rollback;
