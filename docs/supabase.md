# Supabase da VN One

Este arquivo diz onde cada coisa vive no Supabase próprio da VN One, como a gente mexe nele sem risco e o que ainda falta decidir. Nenhuma credencial entra aqui, nem no repositório: elas ficam na pasta `Acessos/`, que o git ignora, e o token do job das notícias fica num segredo do GitHub.

## Onde cada coisa vive

- As migrações ficam em `supabase/migrations`, numeradas, e são aplicadas por `scripts/db-migrate.mjs`.
- Os testes do RLS ficam em `supabase/tests`, e `scripts/run-rls-tests.mjs` roda tudo num Postgres descartável.
- A auditoria de leitura fica em `scripts/db-audit.mjs`.
- O registro das migrações aplicadas é `private.schema_migrations`, num esquema que a API não expõe.
- As tabelas são `public.articles` (o público lê, o job de notícias escreve) e `public.leads` (fechada: só o n8n insere).
- Os papéis são `news_writer` (só escreve em `articles`) e `n8n_leads` (só insere em `leads`). O Postgres do Supabase não é alcançável de fora do EasyPanel, então tudo passa pela rota `/pg/query` ou pela API.

## Aplicar as migrações

O servidor de destino é sempre nomeado. A chave de serviço só sai do computador para o servidor que a gente digitou, nunca para o que estiver escrito no ambiente ou no arquivo.

```bash
npm run db:plan -- --host db.vnone.com.br
npm run db:migrate -- --host db.vnone.com.br --yes
node scripts/db-audit.mjs --host db.vnone.com.br
```

O plano só lê o registro. O `db:migrate` mostra o servidor e as migrações pendentes e só executa com `--yes`. Se alguém editar uma migração que já foi aplicada, o plano falha: a correção vai numa migração nova. Depois de aplicar, o `db-audit` mostra o dono de cada tabela, quem executa que função, quem cria objeto em `public` e os privilégios padrão. Confira ali que `anon` e `authenticated` não aparecem em lugar nenhum além da leitura de `articles`. O privilégio de criar tabelas temporárias (`temp_on_database`) vem do papel público do Postgres e fica como está: tirar dele afetaria os outros serviços do Supabase, e uma tabela temporária só existe na sessão de quem a criou.

## Provar o RLS

O teste precisa de um Postgres descartável e do `psql`. Ele recusa qualquer banco que não seja desta máquina e qualquer banco que já tenha cara de Supabase.

```bash
docker run -d --rm --name vnone-rls-test -p 55432:5432 -e POSTGRES_PASSWORD=test postgres:15
DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm run db:test
docker rm -f vnone-rls-test
```

No CI o job `db-rls` faz o mesmo, em dois bancos de collation diferente, sem segredo.

## Trocar o token do `news_writer`

O token vale 365 dias por padrão e nunca mais de 1825. Ele expira de propósito: anote a data de renovação no calendário do dono. Para gerar outro, use `mintRoleToken` de `scripts/db-credentials.mjs` com o segredo JWT do projeto, grave o resultado em `Acessos/news-writer.md` e troque o segredo `NEWS_WRITER_TOKEN` do repositório com `gh secret set`. O valor nunca aparece em log, commit ou conversa.

## Trocar a senha do `n8n_leads`

Gere a senha com `generatePassword` e o verificador com `scramSha256Verifier`, os dois em `scripts/db-credentials.mjs`. Defina o papel com o verificador (`alter role n8n_leads with login password '<verificador>'`), para a senha em texto puro nunca ir numa instrução que o servidor possa registrar. Grave a senha em `Acessos/n8n-leads-role.md` e cole na credencial do n8n.

## Pendências de privacidade

Isto ainda não está resolvido. Nada abaixo é um defeito escondido: são decisões e ajustes que dependem do dono ou do servidor dele.

- **Consentimento e finalidade.** A tabela `leads` não guarda se a pessoa marcou a caixa de consentimento do formulário, nem para que finalidade deu os dados. Hoje ela guarda só nome, contatos, serviço, mensagem e horário.
- **Retenção e apagamento.** Não existe prazo de guarda nem rotina para apagar os dados de alguém que peça. É decisão do dono, junto com o ajuste dos textos de privacidade e LGPD.
- **Cópias no n8n.** Os mesmos dados ficam nas execuções e nos logs do n8n. Falta configurar a poda automática das execuções.
- **Registro de instruções no Postgres.** Se o `log_statement` estiver ligado, o servidor pode registrar as instruções que recebe. Por isso a senha do `n8n_leads` vai como verificador SCRAM. Falta conferir como o log do Postgres está configurado.
- **Cadastros no GoTrue.** Enquanto a VN One não usar contas de usuário, os novos cadastros (sign-ups) devem ficar desligados.
- **Limite de linhas da API.** Falta definir `PGRST_DB_MAX_ROWS` no PostgREST, para nenhuma resposta devolver linhas demais.
- **Proteção da branch.** Falta exigir o check `db-rls` como obrigatório para entrar na `main`, nas regras de proteção do GitHub.
- **Texto guardado cru.** Os campos dos leads ficam como a pessoa digitou. Quem mostrar esses dados (e-mail, página, planilha) precisa escapar cada campo.
