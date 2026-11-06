# Supabase da VN One: notícias do blog e cópia dos leads, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pôr no Supabase próprio (`https://db.vnone.com.br`) uma tabela `articles` renovada por um job agendado e lida pelo blog, e uma tabela `leads` gravada pelo n8n, com RLS provado por teste.

**Architecture:** Migrações SQL versionadas em `supabase/migrations`, aplicadas por um script que fala com a rota `/pg/query` do pg-meta. O job de notícias roda no GitHub Actions (não há `pg_cron` nem comando de envio de edge function nesse Supabase) e escreve pela API REST com um token de papel restrito. O blog lê `articles` pela chave pública e cai nos caminhos de hoje se falhar. O n8n grava `leads` com um papel só de inserção, em série logo depois do nó que monta os dados e antes das esperas do fluxo.

**Tech Stack:** Postgres 15.8 e PostgREST do Supabase auto-hospedado, Node 22 (scripts `.mjs`), Vitest 5, GitHub Actions, React/Vite do site.

**Spec:** `docs/superpowers/specs/2026-11-06-vn-one-supabase-news-and-leads-design.md`

## Global Constraints

- Nenhuma credencial no repositório, no site, nos logs, nos testes nem no chat. Credenciais ficam em `Acessos/` (ignorada pelo git) e, para o job, num segredo do GitHub. A chave de serviço nunca vai para o código nem para o GitHub.
- O formulário do site não muda: mesmo destino (n8n direto do navegador), mesmas chaves do payload `{nome, email|whatsapp, servico, mensagem, timestamp}`, sem proxy e sem envio extra. Arquivos protegidos (hash em `src/test/frozenFiles.test.ts`): `src/lib/contact.ts`, `src/lib/phone.ts`, `src/components/contact/*`, `src/components/ContactForm.tsx`, `src/pages/PrivacyPage.tsx`, `src/pages/LgpdPage.tsx`.
- Perder um lead é o pior resultado: o Supabase fora do ar nunca atrasa nem derruba a entrega no n8n.
- O blog nunca fica pior do que hoje: Supabase fora, lento (mais de 8 s) ou vazio cai em Dev.to e TabNews pelo navegador e depois na lista fixa (`FALLBACK_ARTICLES`, dados intocados).
- RLS ligado em toda tabela do esquema `public`. `anon` lê só `articles`. Nada mais é público.
- Papéis: `news_writer` (inserir, atualizar e apagar só em `articles`) e `n8n_leads` (inserir só em `leads`).
- Voz "a gente", sem travessão (— –), sem " / " como separador, nunca a palavra "chatbot", nunca número ou resultado inventado, em qualquer texto novo para o público.
- Orçamento de bundle do site: 160 kB gzip no caminho crítico (`npm run budget -- --enforce`).
- Nenhum teste do CI toca o banco de produção nem usa segredo. Dependabot e forks precisam passar.
- Commits convencionais terminados com `Co-Authored-By: <modelo> <noreply@anthropic.com>`. Ninguém dá push em `main`. Tudo vai por branch e PR.

## Review Focus

1. `anon` tentando ler `leads`, inserir ou apagar em qualquer tabela: tudo negado (testes da Task 2).
2. `news_writer` tentando tocar `leads`: negado. `n8n_leads` tentando ler qualquer tabela ou inserir em `articles`: negado (Task 2).
3. Artigo vindo de fonte externa com `javascript:`, `data:`, endereço com credencial, título gigante ou `url` repetida: nunca entra na tabela, e o blog também não o renderiza (Tasks 4 e 5). Um artigo ruim também nunca derruba o lote: o job insere linha por linha (ou captura o erro de cada linha), porque uma linha que o banco recusa, por exemplo um endereço grande demais em bytes, aborta o envio inteiro se vier num lote só. O job escreve o esquema do endereço em minúsculas, porque `HTTPS://` é recusado pelo banco e não corrigido.
4. O job rodando duas vezes ao mesmo tempo, ou as fontes devolvendo zero artigos: nunca apaga a tabela inteira (Task 4).
5. Supabase devolvendo vazio, erro, resposta lenta ou lista velha demais (mais de 7 dias sem renovar): o blog mostra o caminho de hoje e diz a origem certa (Task 5).

---

### Task 1: Executor de migrações

**Files:**
- Create: `scripts/db-migrate.mjs`, `scripts/db-migrate.d.mts`, `scripts/dbMigrate.test.ts`, `supabase/migrations/0000_schema_migrations.sql`
- Modify: `package.json` (scripts `db:plan` e `db:migrate`)

**Interfaces:**
- Produces: `listMigrations(dir: string): Promise<Migration[]>` com `Migration = { id: string; file: string; sql: string }` em ordem do nome do arquivo (`NNNN_nome.sql`); `pendingMigrations(all: Migration[], appliedIds: string[]): Migration[]`; `renderPlan(pending: Migration[]): string` (id e instruções, sem valores secretos); `runMigrations(options: { query: (sql: string) => Promise<unknown>; dir: string; apply: boolean }): Promise<{ applied: string[]; planned: string[] }>`.
- A CLI lê `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do ambiente, e se faltarem lê `Acessos/Supabase.md` (linhas `Rótulo: valor`). Nunca imprime chave. Por padrão só mostra o plano; `--apply` executa. Depois da revisão de segurança, o que ficou valendo: o servidor de destino é fixado com `--host <servidor>` (ou `SUPABASE_EXPECTED_HOST`) antes de qualquer pedido, inclusive o do plano; `--apply` exige também `--yes`, depois de mostrar o servidor e as migrações pendentes; redirecionamentos são recusados e `NODE_TLS_REJECT_UNAUTHORIZED=0` também; o registro fica em `private.schema_migrations` (um esquema que a API não expõe) com o sha256 de cada arquivo aplicado, e editar uma migração já aplicada faz o plano falhar; uma migração não pode ter `begin`, `commit` ou `rollback` próprios, nem comandos que não rodam dentro de transação (`create index concurrently`, `vacuum`, `alter type ... add value`).

- [ ] **Step 1: Escrever os testes que falham** em `scripts/dbMigrate.test.ts`: `listMigrations` ordena e ignora arquivos que não casam `^\d{4}_.+\.sql$`; `pendingMigrations` devolve só as que faltam e mantém a ordem; `runMigrations` com `apply:false` não chama `query`; com `apply:true` chama `query` uma vez por migração pendente, na ordem, e o registro do id em `public.schema_migrations` vai na mesma chamada da migração; uma migração que falha para a execução e não registra as seguintes; rodar de novo não repete as já aplicadas; `renderPlan` nunca contém a chave de serviço (teste com uma chave sintética no ambiente).
- [ ] **Step 2: Rodar e ver falhar:** `npx vitest run scripts/dbMigrate.test.ts` (falha: módulo não existe).
- [ ] **Step 3: Implementar** os quatro itens de Interfaces. `0000_schema_migrations.sql` cria `public.schema_migrations(id text primary key, applied_at timestamptz not null default now())` com RLS ligado e sem política.
- [ ] **Step 4: Rodar e ver passar:** o mesmo comando, tudo verde.
- [ ] **Step 5: Commit** `feat: migration runner for the self-hosted Supabase`.

### Task 2: Papéis, tabelas e RLS, com teste num Postgres descartável

**Files:**
- Create: `supabase/migrations/0001_roles.sql`, `0002_articles.sql`, `0003_leads.sql`, `supabase/tests/00_supabase_roles.sql`, `supabase/tests/rls.sql`, `scripts/run-rls-tests.mjs`
- Modify: `.github/workflows/ci.yml` (job novo `db-rls`), `package.json` (script `db:test`)

**Interfaces:**
- Produces: tabela `public.articles(id uuid pk default gen_random_uuid(), url text not null unique, title text not null, summary text not null default '', image text, published_at timestamptz, source text not null, language text not null check (language in ('pt','en')), fetched_at timestamptz not null default now())` com limites de tamanho por `check` (`title` até 300, `summary` até 600, `url` até 2048) e `url ~ '^https?://'`; tabela `public.leads(id uuid pk default gen_random_uuid(), protocolo text not null unique, canal text not null check (canal in ('email','whatsapp')), nome text not null, email text, whatsapp text, servico text not null, mensagem text not null, enviado_em timestamptz, criado_em timestamptz not null default now())` com limites de tamanho (`nome` 200, `email` 320, `whatsapp` 32, `servico` 200, `mensagem` 5000); papéis `news_writer` e `n8n_leads` (sem senha na migração; a senha vem na Task 3); `grant news_writer to authenticator`.
- RLS: `articles` com `enable row level security`, política `select` para `anon` e `authenticated`, políticas de escrita só para `news_writer`; `leads` com RLS ligado, uma política de `insert` para `n8n_leads` e nenhuma outra; `revoke all` de `public`, `anon` e `authenticated` em `leads`.
- Depois da revisão de segurança: os testes fixam a lista exata de relações de qualquer tipo (tabela, view, sequência) e de funções em `public` e `private`, e exigem que `anon` e `authenticated` não executem função nem tenham privilégio em sequência, inclusive no nível da coluna e nos privilégios padrão (`pg_default_acl`), porque uma view ou uma função `security definer` nova passaria por cima do RLS. As migrações limpam os privilégios padrão do Supabase em `public` para quem roda a migração (esses privilégios são por papel dono: depois do primeiro `--apply`, `node scripts/db-audit.mjs --host <servidor>` mostra o dono de cada tabela e os `pg_default_acl`, e o dono confere). `n8n_leads` tem `insert` só nas oito colunas do formulário. Os campos de uma linha só recusam caracteres de controle (menos `mensagem`), os endereços de artigo têm limite em bytes e uma lista de caracteres invisíveis, e `published_at` não passa de 10 minutos no futuro. O mesmo teste roda em um banco com a collation `C` e em outro com `en_US.UTF-8`.

- [ ] **Step 1: Escrever `supabase/tests/rls.sql`** (falha enquanto as migrações não existirem). Cada verificação usa `set role <papel>` e um bloco `do $$ … exception when insufficient_privilege then … end $$` que levanta erro se a operação **não** for negada (ou, para as permitidas, se for negada). Casos obrigatórios, um por linha da Review Focus 1 e 2: `anon` lê `articles` (permitido), `anon` lê `leads`, `anon` insere em `articles` e em `leads`, `anon` apaga em `articles`; `news_writer` insere, atualiza e apaga em `articles` (permitido) e lê ou insere em `leads` (negado); `n8n_leads` insere em `leads` (permitido) e lê `leads`, lê `articles` e insere em `articles` (negados); uma linha de `leads` sem `canal` válido, uma `url` com `javascript:` e um `title` de 301 caracteres são rejeitados pelos `check`.
- [ ] **Step 2: `00_supabase_roles.sql`** cria os papéis que o Supabase já tem (`anon`, `authenticated`, `service_role`, `authenticator`) para o Postgres descartável.
- [ ] **Step 3: `scripts/run-rls-tests.mjs`** aplica `00_supabase_roles.sql`, depois as migrações em ordem (reaproveitando `listMigrations`), depois `rls.sql`, usando o `psql` com a variável `DATABASE_URL`; sai com código diferente de zero no primeiro erro.
- [ ] **Step 4: Rodar e ver falhar** com um Postgres local descartável: `docker run -d --rm -p 55432:5432 -e POSTGRES_PASSWORD=test postgres:15` e `DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm run db:test` (falha por falta das tabelas).
- [ ] **Step 5: Escrever as três migrações** (idempotentes: `if not exists`, `do $$ … if not exists (select from pg_roles …)`), conforme Interfaces.
- [ ] **Step 6: Rodar e ver passar** o mesmo comando.
- [ ] **Step 7: Job `db-rls` no `ci.yml`:** `runs-on: ubuntu-24.04`, `services.postgres: postgres:15` com health check, `timeout-minutes: 10`, roda `npm run db:test` com `DATABASE_URL` apontando para o serviço. Sem segredos. Fica dentro do gate que bloqueia merge.
- [ ] **Step 8: Commit** `feat: roles, articles and leads tables with row level security, proved in a throwaway Postgres`.

### Task 3: Aplicar no Supabase do dono e verificar

**Files:**
- Create: `scripts/db-verify.mjs`, `scripts/db-credentials.mjs`, `scripts/dbVerify.test.ts`
- Local, nunca commitado: `Acessos/n8n-leads-role.md`, `Acessos/news-writer.md`

**Interfaces:**
- Consumes: `runMigrations` da Task 1.
- Produces: `verifyAsAnon(options: { url: string; anonKey: string; fetch?: typeof fetch }): Promise<Check[]>` com `Check = { name: string; ok: boolean }`, que prova na produção, só com a chave anon, que `articles` é legível, `leads` não é, e inserir ou apagar falha; `generatePassword(): string` (32 caracteres aleatórios do `crypto`); `mintRoleToken(options: { jwtSecret: string; role: 'news_writer'; days?: number }): string` (JWT HS256 com `role`, `iss: 'supabase'`, `iat`, `exp`; validade curta, 365 dias por padrão, no máximo 1825); `scramSha256Verifier(password: string): string` (formato do PostgreSQL, para a senha nunca viajar em texto puro pela rota `/pg/query`). As três já existem, com testes, em `scripts/db-credentials.mjs` (`scripts/dbCredentials.test.ts`, com o verificador conferido contra um PostgreSQL real e um login SCRAM de verdade); falta só o `verifyAsAnon` em `scripts/db-verify.mjs`.

- [ ] **Step 1: Testes que falham** em `scripts/dbVerify.test.ts` com `fetch` simulado: `verifyAsAnon` marca `ok:false` quando `leads` responde 200 com linhas; `generatePassword` tem 32 caracteres e dois valores seguidos diferem; `mintRoleToken` gera um JWT com três partes, `role` certo e `exp` no futuro, e a assinatura confere com o segredo sintético.
- [ ] **Step 2: Rodar e ver falhar,** depois **implementar** as três funções (HS256 com `node:crypto`, sem dependência nova), e ver passar.
- [ ] **Step 3: Mostrar o plano** (`npm run db:plan -- --host db.vnone.com.br`) e **aplicar** (`npm run db:migrate -- --host db.vnone.com.br --yes`) no Supabase do dono. O plano mostrado antes é só leitura. **Depois de aplicar, rodar `node scripts/db-audit.mjs --host db.vnone.com.br`** (só leitura) e conferir com o dono: quem é o dono de `articles` e `leads`, que `pg_default_acl` não entrega nada de `public` a `anon` nem a `authenticated`, que nenhum dos quatro papéis executa função alguma fora do catálogo e que nenhum cria objeto em `public`.
- [ ] **Step 4: Definir as senhas e o token.** `alter role n8n_leads with login password '<verificador SCRAM>'` (o verificador de `scramSha256Verifier`, nunca a senha em texto puro) pela rota `/pg/query`; gravar a senha e os dados de conexão do n8n (host interno `utilitarios-supabase-pooler`, porta 6543, banco `postgres`, usuário `n8n_leads.vnone`, SSL desligado) em `Acessos/n8n-leads-role.md`; gerar o token do `news_writer` com validade de 5 anos, gravar em `Acessos/news-writer.md` e guardar no segredo `NEWS_WRITER_TOKEN` do repositório (`gh secret set`). Nada disso aparece em log, commit ou chat.
- [ ] **Step 5: Verificar na produção:** `node scripts/db-verify.mjs` com a chave anon: todas as verificações `ok:true`.
- [ ] **Step 6: Commit** `feat: apply the foundation and verify it with the public key`.

### Task 4: Job agendado que renova as notícias

**Files:**
- Create: `scripts/news-sync.mjs`, `scripts/news-sync.d.mts`, `scripts/newsSync.test.ts`, `.github/workflows/news-sync.yml`

**Interfaces:**
- Consumes: as funções que validam endereços e artigos de `src/utils/newsService.ts` (ou do módulo de sanitização que a reforma do site criou) e a busca de Dev.to e TabNews do site. O construtor escolhe o mecanismo para reaproveitar código TypeScript num script (compilar com o esbuild que o Vite já traz, ou um módulo `.mjs` compartilhado), sem copiar a lógica.
- Produces: `syncNews(deps: { fetchSources: () => Promise<SourceArticle[]>; upsert: (rows: ArticleRow[]) => Promise<void>; deleteOlderThan: (days: number) => Promise<number>; now: () => Date }): Promise<{ fetched: number; kept: number; removed: number }>`. Regras: só entram artigos que passam na validação do site; `url` repetida vira uma linha só; `published_at` no futuro além de 5 minutos é descartado; **se a validação devolver zero artigos, não grava nem apaga nada e o job falha** (Review Focus 4); só apaga artigos com mais de 30 dias e só depois do upsert dar certo. **Uma linha que o banco recusa não derruba as outras:** o job insere linha por linha (ou, se fizer em lote, repete linha por linha quando o lote falhar) e conta as recusadas. O banco recusa, entre outras coisas, endereço com mais de 2000 caracteres **ou** 2000 bytes (CJK conta 3 bytes por caractere), esquema em maiúsculas (`HTTPS://`: o job escreve o esquema em minúsculas) e `published_at` mais de 10 minutos no futuro.

- [ ] **Step 1: Testes que falham** em `scripts/newsSync.test.ts`: artigo com `javascript:`, `data:`, endereço com usuário e senha, título de 301 caracteres e data 1 hora no futuro **não** chegam ao `upsert`; `url` repetida entra uma vez; fontes devolvendo zero artigos: `upsert` e `deleteOlderThan` não são chamados e a função rejeita; `deleteOlderThan` só roda depois de um `upsert` bem-sucedido, e não roda se o `upsert` rejeitar; duas execuções com os mesmos dados resultam nas mesmas linhas.
- [ ] **Step 2: Rodar, ver falhar, implementar `syncNews` e a CLI** (`SUPABASE_URL` e `NEWS_WRITER_TOKEN` do ambiente; upsert por `url` via `POST /rest/v1/articles?on_conflict=url` com `Prefer: resolution=merge-duplicates`; nunca imprime o token), ver passar.
- [ ] **Step 3: `.github/workflows/news-sync.yml`:** `schedule: cron "0 */3 * * *"` e `workflow_dispatch`, `permissions: contents: read`, `concurrency: group news-sync, cancel-in-progress: false`, `timeout-minutes: 5`, `actions/checkout` e `setup-node` com os mesmos SHAs fixados do `ci.yml`, passo que roda `node scripts/news-sync.mjs` com `NEWS_WRITER_TOKEN: ${{ secrets.NEWS_WRITER_TOKEN }}` e `SUPABASE_URL` como variável do repositório. Falha visível em vez de silêncio.
- [ ] **Step 4: Rodar uma vez** (`gh workflow run news-sync.yml`) depois que o PR entrar na `main`, e conferir a tabela com `db-verify` (leitura anon).
- [ ] **Step 5: Commit** `feat: scheduled job that renews the blog articles`.

### Task 5: O blog lê `articles`

**Depende de:** a reforma do site estar na `main` (arquivos `src/sections/blog/*` e `src/utils/newsFeeds.ts`).

**Files:**
- Modify: `src/lib/constants.ts` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`), `src/utils/newsService.ts` (nova fonte entre o cache e as fontes públicas), `src/sections/blog/useBlogNews.ts`, `nginx/security-headers.conf` (regenerar com `npm run headers`), `src/test/securityHeaders.test.ts`
- Test: `src/utils/newsService.supabase.test.ts`, `src/sections/blog/useBlogNews.visibility.test.tsx`

**Interfaces:**
- Produces: `readSupabaseArticles(log: FailureLog): Promise<LiveList | null>` (GET `/rest/v1/articles?select=url,title,summary,image,published_at,source,language&order=published_at.desc&limit=60`, cabeçalhos `apikey` e `Authorization` com a chave anon, `AbortSignal.timeout(8000)`; passa o resultado pelo mesmo sanitizador do site; devolve `null` e registra a causa se vier vazio, com erro, ou se o artigo mais novo tiver mais de 7 dias); `STALE_TAB_RETURN_MS = 30 * 60 * 1000` (ao voltar para a aba depois disso, o hook chama `refresh()` uma vez).
- A ordem em `getNewsArticles` passa a ser: cache válido, `readSupabaseArticles`, fontes públicas, lista salva, lista fixa. A função `readEdgeFunction` antiga (projeto que não responde mais) é **removida**. O `origin` continua `live` quando vem do Supabase.

- [ ] **Step 1: Testes que falham:** `readSupabaseArticles` com `fetch` simulado: resposta com 60 artigos vira lista; resposta vazia, erro 500, tempo esgotado e lista com o mais novo de 8 dias devolvem `null` e o chain segue para as fontes públicas; um artigo com `javascript:` na resposta é descartado pelo sanitizador; a chave `anon` e a URL vêm das constantes, e um teste varre `src` garantindo que não há chave de serviço (um JWT cujo payload decodificado tenha `"role":"service_role"`). `useBlogNews`: voltar à aba antes de 30 minutos não recarrega, depois de 30 minutos recarrega uma vez; ficar oculta não dispara nada; limpeza do ouvinte ao desmontar.
- [ ] **Step 2: Rodar, ver falhar, implementar,** ver passar. A CSP troca `https://qpcwoioflaxiasmcdfbd.supabase.co` por `https://db.vnone.com.br` (e mantém o resto); `npm run headers` regenera o arquivo e `npm run headers:check` confirma.
- [ ] **Step 3: Rodar** `npm run lint`, `npx vitest run`, `npm run build`, `npm run budget -- --enforce` e os e2e do blog (`e2e/page-blog.spec.ts`, `e2e/blog.spec.ts`) com rota simulada para o Supabase: nenhum teste alcança a rede real.
- [ ] **Step 4: Commit** `feat: the blog reads the renewed articles from the Supabase and comes back to the tab with fresh news`.

### Task 6: Passo a passo do n8n e documentação

**Files:**
- Create: `docs/n8n/lead-supabase-insert.md`, `docs/supabase.md`, `src/test/n8nDocs.test.ts`
- Modify: `README.md` (link para `docs/supabase.md`)

**Interfaces:**
- Produces: em `docs/n8n/lead-supabase-insert.md`, o JSON de **dois** nós `n8n-nodes-base.postgres` (um por webhook), operação `insert` na tabela `leads`, com `onError: continueRegularOutput`, colocados **em série logo depois** do nó "Mapper" de cada fluxo e **antes** das esperas ("Delay"). Como os nós seguintes leem `$json` do nó anterior, o passo a passo manda ligar o nó de inserção com a opção de devolver os dados de entrada (ou reajustar os nós que usam `$json`, o que o texto deve decidir e testar), para o e-mail e o alerta continuarem recebendo `Nome`, `Mensagem` e o resto. Mapeamento: `protocolo` = o valor gerado pelo nó de variáveis; `canal` fixo (`email` ou `whatsapp`); `nome`, `email`, `whatsapp` (no formato recebido), `servico` (`servico || 'Não informado'`), `mensagem`, `enviado_em` (`$json.body.timestamp`). Credencial nomeada `Postgres - VN One leads (n8n_leads)`, sem segredo no JSON.
- **A forma exata do comando (fixada por `supabase/tests/rls.sql`, casos D10 a D15):** o papel `n8n_leads` só pode inserir, nas colunas `protocolo, canal, nome, email, whatsapp, servico, mensagem, enviado_em`. Por isso o nó deve ter **Output Columns vazio** (qualquer `RETURNING` falha, porque exige `select`), **sem a opção de ignorar duplicados** (ela gera `ON CONFLICT (protocolo)`, que também falha), e sem mapear `id` nem `criado_em` (o banco preenche). Um `protocolo` repetido dá erro de chave única, e o `onError: continueRegularOutput` segue o fluxo mesmo assim. Como o nó não devolve linha, a ligação com "devolver os dados de entrada" continua obrigatória.
- **Caracteres de controle, expressão exata por campo.** A tabela recusa caractere de controle em `protocolo`, `canal`, `nome`, `email`, `whatsapp` e `servico` (um `\r\n` seguido de `Bcc:` num nome viraria cabeçalho de e-mail) e recusa texto maior que o limite; uma linha recusada é uma cópia perdida. Então cada expressão do nó limpa antes de gravar, para uma entrada estranha mas honesta ser salva limpa em vez de perdida. Campos de uma linha, trocando só o nome do campo e o tamanho (`nome` 200, `email` 320, `whatsapp` 32, `servico` 200, `protocolo` 100):
  `{{ String($json.body.nome ?? '').replace(/[\u0000-\u001f\u007f-\u009f  ]/g, ' ').replace(/ +/g, ' ').trim().slice(0, 200) }}`
  Para `mensagem` (pode ter quebras de linha, mas o Postgres não guarda o caractere nulo e o limite é 5000):
  `{{ String($json.body.mensagem ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '').slice(0, 5000) }}`
  Para `email` e `whatsapp` vazios, enviar `null` em vez de texto vazio: `{{ String($json.body.email ?? '').replace(/[\u0000-\u001f\u007f-\u009f  ]/g, '').trim().slice(0, 320) || null }}`. `enviado_em` recebe `$json.body.timestamp` só se for uma data válida: `{{ Number.isNaN(Date.parse($json.body.timestamp)) ? null : new Date($json.body.timestamp).toISOString() }}`.
- **Tudo é guardado como veio.** Os campos ficam crus na tabela (HTML, links e símbolos incluídos) e precisam ser escapados em **cada** lugar que os mostra (e-mail, página, planilha), nunca confiados. O texto do passo a passo diz isso com todas as letras.
- Em `docs/supabase.md`: onde cada coisa vive, como aplicar migrações (`db:plan` e `db:migrate`), como rodar o teste de RLS, como trocar o token do `news_writer` e a senha do `n8n_leads`, e o aviso de trocar as chaves originais quando o dono quiser.

- [ ] **Step 1: Escrever os dois documentos** com o passo a passo para o dono aplicar no n8n e o **teste de aceitação**: enviar um lead de teste marcado como teste pelo site, no n8n de produção, **só com o ok do dono**; conferir no Studio que a linha aparece **antes** do e-mail de resposta; desligar a credencial do `n8n_leads` (simulando o Supabase fora do ar) e conferir que o e-mail, a planilha e o alerta continuam saindo.
- [ ] **Step 2: Teste de conteúdo** em `src/test/n8nDocs.test.ts`: o JSON do nó parseia, tem `onError: continueRegularOutput`, não contém nenhum valor de senha ou token (varredura por JWT e por 32 ou mais caracteres aleatórios) e usa só chaves do payload do formulário (`nome`, `email`, `whatsapp`, `servico`, `mensagem`, `timestamp`).
- [ ] **Step 3: Commit** `docs: n8n step by step to save the lead in the Supabase, and the Supabase runbook`.

---

## Self-Review (feito)

- **Cobertura do desenho:** fundação e migrações (Tasks 1 e 2), tabelas e papéis (Task 2), aplicar e verificar (Task 3), notícias renovadas (Task 4), blog lendo e voltando à aba (Task 5), leads pelo n8n e documentação (Task 6). A retenção dos leads, o ajuste do texto jurídico e o endurecimento do fluxo do n8n (escape de HTML, validação e limite de envios) ficam fora, anotados no desenho, e só entram com o ok do dono.
- **Consistência de tipos:** `Migration` e `runMigrations` (Task 1) são usados na Task 2 (`listMigrations`) e na Task 3 (`runMigrations`); `syncNews` (Task 4) e `readSupabaseArticles` (Task 5) usam o mesmo sanitizador do site; os nomes dos papéis e das colunas são os mesmos nas Tasks 2, 3, 5 e 6.
- **Proporção:** o plano descreve decisões, assinaturas e testes, sem corpos de função.
