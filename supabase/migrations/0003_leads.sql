-- A copy of the leads of the site forms, written by the n8n flow (role n8n_leads). It holds personal data, so it is closed:
-- row level security is on, the only policy lets n8n_leads insert, and no role (anon included) can read, update or delete.
-- The service role of the Supabase bypasses row level security and is the owner's way to read it in the Studio.
-- The limits only protect the table from absurd sizes. They are generous on purpose: a lead that the table refuses is a
-- lost lead, so there is no rule here about which of email or whatsapp is filled, nor about the text of `servico`.
-- n8n_leads cannot select, so the n8n node must insert without asking the row back (no RETURNING).
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
  constraint leads_mensagem_size check (char_length(mensagem) <= 5000)
);

create index if not exists leads_criado_em_idx on public.leads (criado_em desc);

alter table public.leads enable row level security;

revoke all on table public.leads from public, anon, authenticated, news_writer, n8n_leads;
grant insert on table public.leads to n8n_leads;

drop policy if exists leads_insert_n8n on public.leads;
create policy leads_insert_n8n on public.leads for insert to n8n_leads with check (true);

-- Undo: drop table public.leads;
