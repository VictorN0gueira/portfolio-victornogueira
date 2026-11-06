-- The news of the blog. The public reads, the scheduled job (role news_writer) writes. Nobody else touches it.
-- The limits are here, not only in the job, so a bad row cannot get in by another way:
--   * an address (url, image) is http or https with a host, has no user and password before the host, no space, no control
--     character, none of the characters that close an attribute or a tag (" ' < > and the backslash), and none of the
--     invisible or look alike Unicode characters (no break and zero width spaces, line and paragraph separators, the
--     fullwidth @ and apostrophe). It ends up in a link, so what is in doubt stays out.
--   * a size of at most 2000 characters AND 2000 bytes: the unique index on url is a btree, which refuses a key near 2.7 kB,
--     and a url of CJK characters counts 3 bytes each. The byte check turns a failure of the index (54000) into a plain check.
--   * the texts have a size, and published_at cannot be more than 10 minutes in the future (a writer could pin an article at
--     the top of the list for years). A check that reads now() is safe here: a row that passed at insert only gets older.
-- The scheme is matched case sensitively: the writer must lower case it (HTTPS:// is refused, not rewritten).
-- The character classes are written with \u escapes, so they do not depend on the locale of the database (the [:space:] and
-- [:cntrl:] classes only know the characters their locale knows, which in the C locale is ASCII only).
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  title text not null,
  summary text not null default '',
  image text,
  published_at timestamptz,
  source text not null,
  language text not null,
  fetched_at timestamptz not null default now(),
  constraint articles_url_size check (char_length(url) <= 2000 and octet_length(url) <= 2000),
  constraint articles_url_shape check (
    url ~ '^https?://[^/?#[:space:][:cntrl:]"<>\\]+'
    and url !~ '^https?://[^/?#]*@'
  ),
  constraint articles_url_chars check (
    url !~ '[\u0001-\u0020\u007f-\u00a0\u00ad\u1680\u2000-\u200f\u2028-\u202f\u205f-\u206f\u3000\ufeff\uff20\uff07"<>''\\]'
  ),
  constraint articles_image_size check (image is null or (char_length(image) <= 2000 and octet_length(image) <= 2000)),
  constraint articles_image_shape check (
    image is null or (image ~ '^https?://[^/?#[:space:][:cntrl:]"<>\\]+' and image !~ '^https?://[^/?#]*@')
  ),
  constraint articles_image_chars check (
    image is null or image !~ '[\u0001-\u0020\u007f-\u00a0\u00ad\u1680\u2000-\u200f\u2028-\u202f\u205f-\u206f\u3000\ufeff\uff20\uff07"<>''\\]'
  ),
  constraint articles_title_size check (char_length(title) between 1 and 300),
  constraint articles_summary_size check (char_length(summary) <= 600),
  constraint articles_source_size check (char_length(source) between 1 and 100),
  constraint articles_language_known check (language in ('pt', 'en')),
  constraint articles_published_not_future check (published_at is null or published_at <= now() + interval '10 minutes')
);

-- The blog asks for the newest first, and the job removes the old ones.
create index if not exists articles_published_at_idx on public.articles (published_at desc nulls last);
create index if not exists articles_fetched_at_idx on public.articles (fetched_at);

alter table public.articles enable row level security;

-- Supabase hands every new table of public to anon and authenticated. Take all of it back, then give back only what is meant.
revoke all on table public.articles from public, anon, authenticated, news_writer;
grant select on table public.articles to anon, authenticated;
-- news_writer also needs select: an upsert (insert ... on conflict do update) and a delete with a condition read the rows.
grant select, insert, update, delete on table public.articles to news_writer;

drop policy if exists articles_read on public.articles;
create policy articles_read on public.articles for select to anon, authenticated, news_writer using (true);

drop policy if exists articles_writer_insert on public.articles;
create policy articles_writer_insert on public.articles for insert to news_writer with check (true);

drop policy if exists articles_writer_update on public.articles;
create policy articles_writer_update on public.articles for update to news_writer using (true) with check (true);

drop policy if exists articles_writer_delete on public.articles;
create policy articles_writer_delete on public.articles for delete to news_writer using (true);

-- Undo: drop table public.articles;
