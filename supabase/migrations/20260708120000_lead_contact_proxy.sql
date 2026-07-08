-- Colunas do formulário de contato do site na tabela lead existente.
-- Migração ADITIVA: a automação de WhatsApp também escreve nesta tabela —
-- nunca renomear ou remover colunas existentes.
alter table public.lead
  add column if not exists mensagem text,
  add column if not exists consent boolean not null default false,
  add column if not exists ip_hash text,
  add column if not exists user_agent text,
  add column if not exists forwarded boolean not null default false,
  add column if not exists forward_error text;

-- Índice para o rate limiting por IP (contagens por janela de tempo)
create index if not exists lead_ip_hash_created_idx
  on public.lead (ip_hash, created_at desc);

-- Leads contêm dados pessoais: só o service_role (edge function e automações)
-- pode ler/escrever. Sem policies — anon e authenticated ficam bloqueados.
alter table public.lead enable row level security;
