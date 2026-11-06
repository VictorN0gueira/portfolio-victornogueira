-- The news of the blog. The public reads, the scheduled job (role news_writer) writes. Nobody else touches it.
-- The limits are here, not only in the job, so a bad row cannot get in by another way: an address must be http or https,
-- without a user and a password and without a space (it ends up in a link), and the texts have a size.
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
  constraint articles_url_shape check (
    char_length(url) <= 2048
    and url ~ '^https?://'
    and url !~ '^https?://[^/?#]*@'
    and url !~ '\s'
  ),
  constraint articles_title_size check (char_length(title) between 1 and 300),
  constraint articles_summary_size check (char_length(summary) <= 600),
  constraint articles_image_shape check (
    image is null or (char_length(image) <= 2048 and image ~ '^https?://' and image !~ '^https?://[^/?#]*@' and image !~ '\s')
  ),
  constraint articles_source_size check (char_length(source) between 1 and 100),
  constraint articles_language_known check (language in ('pt', 'en'))
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
