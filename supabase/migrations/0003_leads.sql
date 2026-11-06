-- A copy of the leads of the site forms, written by the n8n flow (role n8n_leads). It holds personal data, so it is closed:
-- row level security is on, the only policy lets n8n_leads insert, and no role (anon included) can read, update or delete.
-- The service role of the Supabase bypasses row level security and is the owner's way to read it in the Studio.
--
-- WHAT n8n_leads CAN RUN, exactly (supabase/tests/rls.sql pins each shape):
--   works   insert into public.leads (protocolo, canal, nome, email, whatsapp, servico, mensagem, enviado_em) values (...)
--   works   the same with `on conflict do nothing` WITHOUT a conflict target (a repeated protocolo is silently skipped)
--   fails   any RETURNING (it needs select): in the n8n Postgres node leave "Output Columns" empty, nothing is read back
--   fails   `on conflict (protocolo) ...` (a conflict target reads the index, which needs select)
--   fails   naming id or criado_em in the column list (the grant is on those eight columns only): the database sets them
-- So there is no "ignore duplicates" option in the n8n node: the second insert of a protocolo fails with a unique violation,
-- and the node continues on error, which is the behaviour wanted for a copy that must never block the flow.
--
-- ALL FIELDS ARE STORED RAW: anything the visitor typed is here as typed (HTML, links, odd characters). They must be escaped
-- at every place that prints them (an e-mail, a page, a sheet), never trusted. What the table does refuse is the part that
-- breaks a downstream header or a line: the single line fields cannot hold a control character (a CR LF followed by "Bcc:"
-- in a name would otherwise become a header of an e-mail built from it). Only `mensagem` may hold line breaks. The n8n
-- expressions strip control characters before the insert, so an odd but honest input is saved cleaned, not lost.
--
-- The size limits only protect the table from absurd sizes. They are generous on purpose: a lead that the table refuses is a
-- lost copy, so there is no rule about which of email or whatsapp is filled, nor about the text of `servico`.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,
  canal text not null,
  nome text not null,
  email text,
  whatsapp text,
  servico text not null,
  mensagem text not null,
  enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  constraint leads_canal_known check (canal in ('email', 'whatsapp')),
  constraint leads_protocolo_size check (char_length(protocolo) between 1 and 100),
  constraint leads_nome_size check (char_length(nome) <= 200),
  constraint leads_email_size check (char_length(email) <= 320),
  constraint leads_whatsapp_size check (char_length(whatsapp) <= 32),
  constraint leads_servico_size check (char_length(servico) <= 200),
  constraint leads_mensagem_size check (char_length(mensagem) <= 5000),
  -- Control characters: C0 (CR, LF, TAB, ESC...), DEL, C1 (NEL...) and the Unicode line and paragraph separators. Written with
  -- \u escapes so the check does not depend on the locale of the database.
  constraint leads_single_line check (
    protocolo !~ '[\u0001-\u001f\u007f-\u009f  ]'
    and canal !~ '[\u0001-\u001f\u007f-\u009f  ]'
    and nome !~ '[\u0001-\u001f\u007f-\u009f  ]'
    and (email is null or email !~ '[\u0001-\u001f\u007f-\u009f  ]')
    and (whatsapp is null or whatsapp !~ '[\u0001-\u001f\u007f-\u009f  ]')
    and servico !~ '[\u0001-\u001f\u007f-\u009f  ]'
  )
);

create index if not exists leads_criado_em_idx on public.leads (criado_em desc);

alter table public.leads enable row level security;

revoke all on table public.leads from public, anon, authenticated, news_writer, n8n_leads;
-- At the level of the COLUMN: n8n_leads cannot set the id nor the moment of the copy, so a client cannot forge them.
grant insert (protocolo, canal, nome, email, whatsapp, servico, mensagem, enviado_em) on table public.leads to n8n_leads;

drop policy if exists leads_insert_n8n on public.leads;
create policy leads_insert_n8n on public.leads for insert to n8n_leads with check (true);

-- Undo: drop table public.leads;
