# VN One no Supabase próprio: notícias do blog e cópia dos leads

Data: 2026-11-06. Dono: Victor Nogueira. Estado: desenho para aprovação, nada construído ainda.

## Por que

O blog não atualiza sozinho. A lista é buscada uma vez, quando a página abre, e o navegador guarda por 6 horas. A fonte principal (uma função no projeto Supabase antigo, `qpcwoioflaxiasmcdfbd`, que só hospeda o `gnews-proxy`) nem resolve mais na internet: o projeto parece pausado ou apagado. O blog hoje vive só de Dev.to e TabNews, direto do navegador do visitante.

O dono tem agora um Supabase próprio, hospedado no EasyPanel dele, que vai servir a "muita coisa na VN One". Ele autorizou: "vamos sim" e "pode criar edge functions e etc", incluindo "criar tabela para armazenar os leads".

## O que existe (medido em 2026-11-06, só com leituras)

- URL pública: `https://db.vnone.com.br` (Supabase auto-hospedado, não o da nuvem).
- API REST (PostgREST), login (GoTrue 2.186) e o runtime de funções respondem. O Postgres é o 15.8.
- Extensões instaladas: plpgsql, uuid-ossp, pgcrypto, pgjwt, pg_net, pg_stat_statements, supabase_vault, pg_graphql. **Não há `pg_cron`.**
- O SQL pode ser executado pela rota `/pg/query` do pg-meta com a chave de serviço. Pelo n8n e por outros serviços do EasyPanel, o Postgres fica no host interno `utilitarios-supabase-pooler`, portas 6543 e 5432, sem SSL. Esse host não é alcançável de fora do EasyPanel.
- Credenciais em `Acessos/Supabase.md`, que o git ignora. **Elas nunca entram no repositório, no site nem no chat.**
- O projeto antigo do blog fica como está. O dono o aposenta quando quiser.

## Objetivos

1. **Notícias do blog que se renovam sozinhas**, mesmo sem ninguém visitando, guardadas numa tabela do Supabase e lidas de lá pelo blog.
2. **Cópia dos leads** dos formulários numa tabela fechada ao público, gravada pelo n8n depois que ele recebe o formulário.
3. **Fundação para o resto**: migrações em arquivos no repositório, aplicadas por um script, e RLS ligado em toda tabela.

## Fora do escopo

- Mudar o formulário do site: mesmo destino (o n8n direto do navegador), mesmas chaves do payload, sem envio extra e sem proxy. Isso só muda com ok explícito do dono, em outra rodada.
- Login de usuários, análises de acesso, o texto jurídico (revisado depois, quando os dados existirem), o projeto antigo do blog.

## O que seria um fracasso mesmo que "funcionasse"

- Perder um lead, ou atrasar o formulário por causa do Supabase.
- Dado pessoal legível pelo público, ou uma chave de administrador no site, no repositório ou no chat.
- O blog ficar pior do que hoje: se o Supabase cair, o blog segue com Dev.to, TabNews e a lista fixa, como agora.

## Decisões do dono

- O Supabase é o dele, no EasyPanel, e eu posso criar tabelas e funções nele.
- Os leads vão para uma tabela, sem tocar no canal do formulário.
- O blog atualiza sozinho.

## Minhas escolhas (o dono confere)

Cada item abaixo é palpite meu, não decisão dele.

1. **Quem roda a atualização das notícias: um job agendado no GitHub Actions, não uma edge function.** Motivo: sem `pg_cron` o banco não agenda nada, e uma função nova nesse Supabase precisa ser copiada como arquivo para o volume de funções no servidor, sem comando de envio. O job fica no repositório, versionado e testado, e reaproveita o código que já valida as notícias no site. Roda a cada 3 horas. A chave de serviço fica num segredo do GitHub (`gh secret set`), nunca no código. Uma edge function pode vir depois, se o dono quiser colocar o arquivo no servidor.
2. **Fontes:** Dev.to e TabNews, sempre. O GNews só entra se o dono tiver a chave; ela iria para o segredo do GitHub.
3. **Tabela `articles`:** `url` única, título, resumo, imagem, data de publicação, fonte, idioma, quando foi buscada. O público só lê. Quem escreve é o job, com a chave de serviço. Artigos com mais de 30 dias saem.
4. **O blog** lê `articles` pela API REST com a chave pública (anon), que é pública por desenho, com a mesma validação de endereços que já existe. Se a leitura falhar ou vier vazia, cai no caminho de hoje (Dev.to e TabNews pelo navegador, depois a lista fixa). Quando o visitante volta para a aba depois de 30 minutos, a lista recarrega. O botão "Atualizar" continua. A política de segurança do nginx (`connect-src`) passa a permitir `https://db.vnone.com.br`, e o teste que guarda isso acompanha.
5. **Tabela `leads`:** fechada (RLS ligado, nenhuma política pública). Campos que o formulário já manda: nome, e-mail ou WhatsApp, serviço, mensagem, horário, mais o canal (`email` ou `whatsapp`) e quando foi gravado. Sem hash de IP nem user agent por enquanto. O n8n grava com um papel do Postgres próprio, que só consegue inserir nessa tabela, em vez do superusuário. O n8n é do dono: eu entrego o passo a passo e o JSON do nó, e ele (ou o n8n, se ligarem o conector) aplica no fluxo dele.
6. **Retenção dos leads** fica em aberto: precisa de decisão do dono junto com o ajuste do texto jurídico.
7. **Migrações** em `supabase/migrations/*.sql` no repositório, aplicadas por um script (`/pg/query`) que mostra o que vai rodar antes e é idempotente. Rollback: cada migração tem seu desfazer.

## Escolhas que o revisor do desenho pediu (minhas, o dono confere)

8. **URL e chave pública (anon) no site: constantes no código**, em `src/lib/constants.ts`. A chave anon é pública por desenho (qualquer navegador a vê) e o que protege os dados é o RLS. Isso funciona em todos os builds (EasyPanel, CI, testes) sem passo novo do dono. A chave de serviço nunca vai para o código.
9. **Menor privilégio também no job das notícias.** Um papel `news_writer`, só com inserir, atualizar e apagar em `articles`, e a chave do job é um token desse papel, não a chave de serviço. O token é gerado a partir do segredo JWT do projeto, com validade longa e anotado para troca. O Postgres não é alcançável do GitHub, então o job fala com a API REST.
10. **Testes do RLS:** num Postgres descartável dentro do CI (com os papéis `anon`, `authenticated`, `service_role` e `news_writer` simulados, rodando as mesmas migrações), sem nenhum segredo no CI, então Dependabot e forks funcionam. Depois de aplicar no banco real, rodo uma verificação manual com a chave anon que prova o mesmo (lê `articles`, não lê `leads`, não escreve em nada). Nenhum teste de CI toca produção.
11. **Os caminhos de código citados são os da branch da reforma do site** (`src/sections/blog`, `src/utils/newsFeeds.ts`), que ainda não entrou na `main`. A fundação (migrações, tabelas, papéis) não depende dela. A leitura no blog só entra depois que a reforma estiver na `main`.
12. **Passo do n8n:** se eu não puder ver os fluxos `portfolio-vn-email` e `portfolio-vn-whatsapp`, entrego o nó genérico com "continuar em caso de erro" e a ligação marcada como não verificada. O WhatsApp é guardado como o formulário o manda (formato Evolution), `servico` é texto livre, sem restrição de valores, e o nó fica numa ramificação paralela, para nunca atrasar nem derrubar a entrega do lead.

## Respostas do dono e o fluxo do n8n (2026-11-06)

O dono respondeu "faça o que for melhor" sobre o texto jurídico e enviou o fluxo `Site VN One - Resposta Automática` (não vai para o repositório: tem IDs internos, a planilha e o grupo de alertas).

**Decisão minha (13):** a gravação dos leads no Supabase começa já, junto com a tabela. Motivo: o n8n já guarda os mesmos dados (nome, e-mail, WhatsApp, mensagem) na planilha do Google e no grupo de alertas, então a cópia não cria um risco novo. O ajuste do texto jurídico e da retenção é uma tarefa separada, que fica anotada e depende do dono.

**O que o fluxo faz hoje.** Dois webhooks públicos (`portfolio-vn-email` e `portfolio-vn-whatsapp`) respondem na hora, e depois, em segundo plano: um nó de variáveis monta os dados, espera 1 minuto (e-mail) ou 2 minutos (WhatsApp), envia a resposta automática, salva na planilha do Google e manda o alerta para o grupo. O número do WhatsApp chega como `55DDNNNNNNNN` (sem o nono dígito) e o fluxo calcula também a versão com o 9.

**Onde entra o Supabase (14).** Um nó "Postgres: inserir lead" logo depois do webhook, em ramo próprio, **antes** das esperas, com "continuar em caso de erro". Assim o lead é salvo em milissegundos, mesmo que o e-mail ou a espera falhe, e o Supabase fora do ar nunca derruba a entrega. Ele lê direto de `$json.body.*` (não depende dos nós de variáveis). O nó usa o papel `n8n_leads`, só de inserção em `leads`, no host interno `utilitarios-supabase-pooler`. A senha desse papel eu gero e grava em `Acessos/` (não vai no chat nem no repositório), e o dono a cola na credencial do n8n. Campos: `protocolo` (gerado pelo n8n, ligando o lead à planilha e ao alerta), `canal`, `nome`, `email`, `whatsapp` (como o formulário mandou), `servico` (texto livre), `mensagem`, `enviado_em` (do formulário) e `criado_em`. Como a ordem dos ramos pode mudar no n8n, o passo a passo inclui um teste que confirma que a linha aparece antes do e-mail.

**Riscos que o fluxo já tem (fora desta rodada, mas o dono precisa saber):**
- O e-mail de resposta usa `{{ $json.Nome }}` e `{{ $json.Mensagem }}` sem escapar HTML, e o endereço de destino é o que a pessoa digitou. Qualquer um pode fazer o fluxo mandar um e-mail com o conteúdo que quiser, do domínio `contato@vnone.com.br`, para qualquer endereço (phishing e spam).
- O mesmo vale para o WhatsApp: o fluxo manda mensagem para qualquer número informado, o que pode levar ao bloqueio do número da empresa.
- Não há limite de envios nem validação de e-mail ou número no webhook.
- O modelo de e-mail usa a palavra "Chatbots" no cartão de serviço, que o dono pediu para não usar (a VN One vende agentes de IA).
Entrego, numa tarefa à parte e só com o ok do dono, uma versão com escape de HTML, validação de e-mail e número, e um limite de envios por número e por e-mail, usando a própria tabela `leads` para contar.

## Ordem

1. Fundação: pasta de migrações, script que aplica, tabelas e papéis, com testes que provam o RLS (o público lê só `articles`, não lê `leads`, e não escreve em nada).
2. Notícias: o job agendado e a leitura no blog. Entra num PR próprio, por ser a única parte que muda o site.
3. Leads: a tabela, o papel e o passo a passo do n8n.

## O que fica com quem constrói

O esquema exato das colunas e dos índices, o formato dos testes, o nome dos arquivos, como o script mostra o plano de migração, e a escolha entre uma view ou uma política de leitura para `articles`.
