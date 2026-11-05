# VN One v2 · Plano 4: SEO, aparência no Google, copy final e QA, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o `vnone.com.br` aparecer no Google com o título, a descrição, o ícone e o nome certos, e aparecer mais: HTML estático por rota para quem não roda JavaScript, favicon que o Google aceita, títulos e descrições por rota, dados estruturados, sitemap e robots corretos, www resolvido, Core Web Vitals no celular e um portão de QA final.

**Architecture:**
- Uma **fonte única de metadados por rota** em `src/seo/routeMeta.ts` (dados puros, sem React). Dela saem: o `SEO.tsx` em runtime, o HTML pré-renderizado, o `sitemap.xml` e os testes. Adicionar uma rota ou trocar um título vira mudança de dado, e sobrevive à reescrita das páginas do Plano 3.
- Um passo de build leve, `scripts/build-seo.mjs`, roda depois do `vite build`: grava `dist/<rota>/index.html` com a cabeça certa de cada rota (title, description, canonical, og, twitter, JSON-LD, marcados `data-static-seo`), `dist/404.html` com `noindex` e `dist/sitemap.xml`. Sem dependência nova: usa o `vite` que já existe (`createServer` + `ssrLoadModule`) e o `sharp` que já existe. O nginx passa a servir `$uri/index.html` e a responder 404 de verdade.
- O corpo continua sendo o SPA (sem SSR, sem hidratação): o `SEO.tsx` segue removendo as tags `data-static-seo` ao montar e recoloca as dele, então nada duplica.

**Tech Stack:** React 19, Vite 6, Tailwind v4, TypeScript strict, Vitest, Playwright 1.58 (projetos `desktop` e `mobile`), `@axe-core/playwright`, `sharp`, nginx (Docker), EasyPanel. Lighthouse 13.6.0 só via `npx` (não entra no `package.json`).

**Spec:** não há spec novo. O pedido do dono ("rever a nossa aparência no Google e aparecermos mais") e a auditoria da seção seguinte são a base. Plano 3 (`docs/superpowers/plans/2026-11-01-vn-one-v2-paginas-internas.md`, branch `plan/inner-pages`) cobre as páginas internas e deixa "Plano 4, copy final, SEO por página, sitemap lastmod e QA final" para este.

## Auditoria (somente leitura, feita em 2026-11-01 sobre o site no ar e o repo em `b439532`)

### O que o Google mostra hoje contra o que o repo diz

| Item | No Google hoje (print do dono) | No site no ar (curl cru) e no repo |
|---|---|---|
| Título | `Victor Nogueira \| Automação Inteligente & IA` | `VN One \| Automação e IA para empresas` já está no HTML servido (`index.html`) |
| Descrição | "Automações inteligentes com IA ... sem equipe de TI ..." com travessão | Descrição nova já está no HTML servido |
| Ícone | Globo genérico | `<link rel=icon png 32x32>` só. `/favicon.ico` responde **404**. Não existe `site.webmanifest` (404) |

**Leitura:** título e descrição são um snippet **velho** (o Google ainda não recrawleou o site novo), não um erro do repo. O ícone é problema real do repo.

### Por que o ícone foi recusado (causa mais provável, não há como o Google confirmar)
1. O único ícone declarado é um PNG de **32x32**. O Google exige um tamanho **múltiplo de 48 px** (ou SVG) e usa o ícone declarado na cabeça da home.
2. `/favicon.ico` (o fallback que o Google tenta sozinho) devolve 404.
3. A marca é larga (2:1) e o favicon usa 4% de margem: em 32 px o "VN" fica miúdo e ilegível em 16 px.
4. O Google guarda favicons por semanas: mesmo corrigido, a troca leva dias a poucas semanas.

### Achados técnicos (raw HTML do site no ar)
- As 6 rotas públicas (`/`, `/sobre`, `/servicos`, `/projetos`, `/contato`, `/blog`) devolvem **o mesmo HTML de 3.240 bytes**: mesmo title, mesma descrição, nenhum canonical, nenhum JSON-LD. WhatsApp, LinkedIn, Facebook e bots sem JS só enxergam a home, para qualquer URL.
- Rota inexistente responde **200** (soft 404). O `noindex` só existe depois do JavaScript.
- `sitemap.xml` com `lastmod` 2026-07-08 (cinco páginas), `changefreq` e `priority` (o Google ignora os dois). Está certo em listar `/blog` e as legais.
- `https://www.vnone.com.br/` **está quebrado**: o certificado não vale para o host (curl sai com erro de certificado) e `http://www` redireciona para `https://www`. O apex funciona (`http` redireciona 308 para `https`). O DNS do `www` é um CNAME para o apex, então falta só o domínio no proxy.
- Títulos internos curtos e sem palavra-chave: `Serviços | VN One` (17), `Sobre | VN One` (14), `Contato | VN One` (16), `Blog | VN One` (13). Descrições de `/servicos` (91) e `/blog` (96) abaixo de 120.
- Rodapé e dados estruturados: `Organization` e `WebSite` só existem depois do JS, sem `alternateName`, sem `contactPoint`, com `logo` em `.webp` de 2:1 (o Google quer ao menos 112x112).
- Palavra "chatbot" aparece só em testes de guarda (`data.test.ts`, `copy-rules.test.ts`). Nenhuma string visível usa.
- A pesquisa web disponível (ferramenta dos EUA, não é o Google) não achou o `vnone.com.br` por `site:`, pelo domínio nem pelo nome da marca. Isso confirma pouca visibilidade, mas **não é prova do ranking real**: a conferência definitiva é o Search Console.

### Lighthouse 13.6.0, build de produção local (`vite preview` na porta 4510), Chrome headless, sem rede real

| Rota e perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT | FCP |
|---|---|---|---|---|---|---|---|---|
| `/` celular | **86** | 100 | 100 | 100 | **3,29 s** | 0,000 | **299 ms** | 0,92 s |
| `/` desktop | 100 | 100 | 100 | 100 | 0,74 s | 0,000 | 1 ms | 0,26 s |
| `/servicos` celular | 95 | 100 | 100 | 100 | 2,82 s | 0,000 | 120 ms | 0,91 s |
| `/servicos` desktop | 100 | 100 | 100 | 100 | 0,61 s | 0,043 | 0 ms | 0,25 s |

- INP não existe em laboratório: só com dado de campo (CrUX, Search Console), depois que houver tráfego.
- Elemento do LCP no celular: o **parágrafo do hero** (`p.mt-6`). É texto, então o LCP espera CSS, fontes e JavaScript montarem a página (CSR).
- Causas medidas na home celular: CSS que bloqueia a renderização (`index-*.css`, 23,5 kB, economia estimada de 290 a 312 ms); `react-vendor` com 35% sem uso na carga (26 KiB); reflow forçado em `react-vendor` e em `UseCaseTabs`; 4,9 s de trabalho de thread principal sob a simulação.
- Caminho crítico de JS: **156,1 kB gzip**, teto 160 kB (`npm run budget`).
- O "SEO 100" do Lighthouse não olha favicon, JSON-LD nem canonical por rota: não substitui as checagens deste plano.

### As 10 correções mais valiosas, em ordem

1. HTML estático por rota (title, description, canonical, og, JSON-LD) e 404 de verdade (Batch R).
2. Favicon múltiplo de 48 px, `/favicon.ico` e manifest (Batch F).
3. Sitemap gerado no build, com `lastmod` real e só rotas indexáveis, mais Search Console e "Solicitar indexação" (Batch R e passos do dono).
4. `Organization` + `WebSite` (`name` e `alternateName`) no HTML cru, para o nome do site "VN One" (Batch M e R).
5. Títulos e descrições por rota com as palavras que o cliente pesquisa (Batch M).
6. `www` funcionando e redirecionando para o apex (EasyPanel + nginx, Batch R).
7. LCP e TBT do celular na home (Batch Q, V1 a V3).
8. `/blog` fora do índice e do sitemap enquanto só agrega texto de terceiros (Batch M).
9. Dados estruturados honestos nas páginas internas: `BreadcrumbList` e `Service` (Batch M).
10. Conteúdo próprio e links do dono (Google Business Profile, LinkedIn, Hub081, DizPara) e uma página por serviço (Plano 5, depois deste).

## Global Constraints (vinculantes)

- **Branch e produção:** `main` é o site no ar. Trabalho em `batch/p4-<letra>`, nunca push em `main`. PR com CI verde no GitHub e **aprovação do dono antes do merge**.
- **Copy (humanizer):** pt-BR, voz "a gente", imperativo informal. **Proibido** travessão (U+2014), meia-risca (U+2013) e " / " como separador. **Nunca** a palavra "chatbot": a VN One vende **agentes de IA**. Nunca inventar número, cliente, prêmio ou resultado. Sem `&` nos textos de SEO (já é regra de `src/pages/seo-copy.test.ts`).
- **Título:** padrão `<Tópico> | VN One` nas páginas internas e `VN One | <proposta>` na home. Páginas indexáveis de conteúdo: **50 a 60 caracteres**. **Descrição: 120 a 160.** Exceção declarada: as duas páginas legais (texto congelado, ver abaixo).
- **Arquivos protegidos, byte a byte:** `src/lib/contact.ts`, `src/lib/phone.ts`, `src/components/contact/{useContactForm.ts, ContactConsent.tsx, ContactErrorAlert.tsx, whatsappInput.ts, pastedNumber.ts}`, `src/components/ContactForm.tsx`, texto de `src/pages/PrivacyPage.tsx` e `src/pages/LgpdPage.tsx` (inclui as props do `<SEO>` deles). O Plano 3 (Task A5) cria `src/test/frozenFiles.test.ts` com os hashes: este plano **não** edita nenhum deles.
- **Telefone e contato:** WhatsApp `(81) 98445-1243` (`5581984451243`) só via `src/lib/constants.ts` e `SITE.telephone`. Nunca chamar o n8n real nem enviar o formulário em teste (`e2e/n8nGuard.ts`).
- **Orçamento de bundle:** caminho crítico ≤ **160 kB gzip** (hoje 156,1). Nada deste plano pode entrar no bundle do navegador além do que já existe: `src/seo/headHtml.ts`, `sitemap.ts` e o script de build **não** são importados pelo app.
- **Portas:** só 4510 a 4519 para este plano (variável `E2E_PORT`). Nunca 3000. Todo processo iniciado é encerrado ao fim.
- **GitHub Pages:** `deploy.yml` builda com `GITHUB_PAGES=true` e base `/portfolio-victornogueira/`. `scripts/build-seo.mjs` não faz nada nesse modo.
- **`.dockerignore` exclui `.git`:** o build do EasyPanel não tem histórico git. Por isso o `lastmod` é dado no repo, não data de commit calculada no build.
- Commits convencionais, terminados com `Co-Authored-By: <modelo> <noreply@anthropic.com>`. Nada de `console.log`, nada de `.superpowers/`, `e2e/__shots__/`, `test-results/`.
- **Definition of done por batch:** lint 0 (`npm run lint`), `npm test`, `npm run e2e` (desktop e mobile), `npm run build` e `npm run budget -- --enforce`, revisão de fechamento dedicada, PR com CI verde.

## Review Focus

Classes de entrada que nenhuma task testaria sozinha e que mais machucam:

1. **Rota que o app serve mas a lista não conhece** passa a ter 404 no nginx: teste lê `src/App.tsx` e exige que todo `<Route path>` esteja coberto por `routeMeta` (Task M1).
2. **Tags duplicadas** (a estática do HTML e a do React): e2e conta uma de cada depois do `useEffect` em cada rota pré-renderizada, e o JSON-LD também tem `data-static-seo` (Tasks R1 e Q1).
3. **Caractere especial em título ou descrição** (`"`, `<`, `&`, acento) quebrando o HTML pré-renderizado ou o JSON: `escapeHtml` e `serializeJsonLd` com teste de `</script>` (Task R1).
4. **Slug de projeto removido ou inexistente** (`/projetos/troco`, `/projetos/xyz`): continua 301 para `/projetos` e 404 com `noindex`, sem canonical e fora do sitemap (Tasks R3, R4).
5. **Dado estruturado que mente:** `FAQPage` numa página sem a FAQ visível, `sameAs` de perfil que o repo não cita, preço, `aggregateRating` ou `Review`: o teste de forma reprova (Task M3).

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Batch |
|---|---|---|
| `src/seo/routeMeta.ts` | Dado puro: título, descrição, indexável, lastmod, imagem, migalhas, FAQ, de cada rota pública | M |
| `src/seo/structuredData.ts` | Funções puras que montam `Organization`, `WebSite`, `Service`, `BreadcrumbList`, `FAQPage` | M |
| `src/components/SEO.tsx` | Usa `routeMeta` e `structuredData` como padrão; props continuam podendo sobrescrever | M |
| `src/lib/site.ts`, `index.html` (bloco de meta) | Título e descrição da home, marcadores `seo:start` e `seo:end` | M |
| `src/seo/headHtml.ts`, `src/seo/sitemap.ts` | Funções puras: HTML da cabeça, aplicar no template, sitemap | R |
| `scripts/build-seo.mjs`, `package.json`, `playwright.config.ts` | Passo pós-build | R |
| `nginx.conf`, `src/test/nginx-config.test.ts`, `scripts/smoke-container.mjs` | `try_files`, 404, bloco `www`, checagens da imagem | R |
| `public/robots.txt`, `public/sitemap.xml` (removido) | Robots estático, sitemap gerado | R |
| `scripts/build-favicons.mjs`, `public/favicon.ico`, `public/brand/favicon-{48,96,192,512}.png`, `public/site.webmanifest`, bloco de ícones do `index.html` | Ícones | F |
| `e2e/public-routes.axe.spec.ts`, `e2e/internal-links.spec.ts`, `scripts/lighthouse-gate.mjs`, `docs/seo-runbook.md` | QA final | Q |

## Lotes, dono de cada arquivo e ordem

Máximo de 4 implementadores ao mesmo tempo. Cada lote é um branch `batch/p4-<letra>`, na própria worktree e faixa de portas (F 4510-4512, M 4513-4515, R 4516-4518, Q 4519 e reuso).

| Onda | Lote | Escopo | Arquivos que só ele toca | Depende do Plano 3? |
|---|---|---|---|---|
| 1 (agora) | **F** ícones | favicon, manifest, links de ícone | `scripts/build-favicons.mjs`, `public/favicon.ico`, `public/brand/favicon-*.png`, `public/site.webmanifest`, **só o bloco `<!-- Favicon -->`** do `index.html`, `src/test/favicons.test.ts`, `e2e/favicons.spec.ts`, `src/test/ogBanner.test.ts`, `scripts/generate-og-banner.mjs`, `public/og-banner.png` (o Step 2 da F4, subir o `?v=`, só entra se a D8 pedir e é feito pelo lote M, dono de `site.ts` e do `index.html`) | Não |
| 1 (agora) | **M** metadados | `routeMeta`, JSON-LD, `SEO.tsx`, título da home, copy de SEO | `src/seo/{routeMeta,structuredData}*`, `src/components/SEO*`, `src/lib/site*`, **só o bloco de meta/og/twitter** do `index.html`, `e2e/{seo-tags,share-preview,navigation-focus}.spec.ts` (só o título da home) | Não (o "switch" nas páginas é a Task Q1) |
| 1 (agora) | **R** render e crawl | HTML por rota, sitemap, 404, www, robots | `src/seo/{headHtml,sitemap}*`, `scripts/build-seo.mjs`, `package.json` (script `build`), `playwright.config.ts` (comando), `nginx.conf`, `src/test/nginx-config.test.ts`, `scripts/smoke-container.mjs`, `public/robots.txt`, `src/data/projects.sitemap.test.ts`, `e2e/prerender.spec.ts` | Não |
| 2 (depois do Plano 3, merge Z feito) | **Q** fechamento | switch das páginas, perf, axe, internal links, copy, Lighthouse, runbook | `src/pages/*` e `src/App.tsx` (só as props de `<SEO>`), `index.html` (só `preload`), `e2e/public-routes.axe.spec.ts`, `e2e/internal-links.spec.ts`, `scripts/lighthouse-gate.mjs`, `docs/seo-runbook.md`, `README.md` (uma seção) | **Sim** |

**Arquivos compartilhados**
- `index.html`: três donos, cada um só no seu bloco (F ícones, M meta, Q preload). Ordem de merge F, M, R, Q, rebaseando antes.
- `src/data/projects.sitemap.test.ts` e `src/test/nginx-config.test.ts`: só o R mexe agora. O Plano 3 (Task P1 e Z1) toca outras linhas dos mesmos arquivos (`projects.ts` fora da exceção de palavras de venda; arquivo de amostra do nginx). Quem entrar depois rebaseia.
- `src/pages/seo-copy.test.ts`: só o Q (Task Q1).

**Ordem de merge:** F, M, R (os três podem ser desenvolvidos juntos, R só consome a interface de `routeMeta` fixada abaixo), depois o Plano 3 inteiro (A, S, U, P, C, N, B, L, Z), depois Q.
Se o Plano 3 atrasar, F, M e R vão para produção sozinhos: `SEO.tsx` só preenche o que a página não passa, então nada quebra.

**Fluxo de revisão por lote:** o implementador entrega relatório; o líder dispara em paralelo, sobre um snapshot do diff, `code-reviewer`, `typescript-reviewer` e `seo-specialist` (e `security-reviewer` no R por causa do nginx e do HTML gerado); revisão de fechamento dedicada confere item por item, inclusive os Minor. Nada fica adiado.

**Interface fixada entre M e R** (R desenvolve contra ela, com fixture própria, sem esperar o M):

```ts
// src/seo/routeMeta.ts
export type RouteKind = 'home' | 'page' | 'project' | 'legal';
export interface RouteImage { readonly url: string; readonly alt: string; readonly width: number; readonly height: number }
export interface RouteCrumb { readonly name: string; readonly path: string }
export interface RouteMeta {
  readonly path: string;            // '/', '/servicos', '/projetos/dizpara' (sem barra final, exceto '/')
  readonly kind: RouteKind;
  readonly title: string;           // <title> completo, já com a marca
  readonly description: string;
  readonly isIndexable: boolean;    // false: noindex, sem canonical, sem og:url, fora do sitemap
  readonly lastmod: string;         // 'YYYY-MM-DD'
  readonly image?: RouteImage;      // ausente: banner padrão do site
  readonly crumbs: readonly RouteCrumb[]; // [] na home; ['Início' e a própria rota] nas internas
  readonly hasFaq?: boolean;        // só onde a FAQ está visível na página
}
export const ROUTE_METAS: readonly RouteMeta[];
export function routeMetaFor(path: string): RouteMeta | undefined;
// src/seo/structuredData.ts
export function structuredDataFor(meta: RouteMeta): object[];
```

---

## Batch F: ícones que o Google aceita

### Task F1: gerador de favicons

**Files:** Create `scripts/build-favicons.mjs`, `public/favicon.ico`, `public/brand/favicon-48.png`, `favicon-96.png`, `favicon-192.png`, `favicon-512.png`, `src/test/favicons.test.ts`.

**Interfaces:** Produz os arquivos acima (nomes estáveis: o Google guarda a URL). Consome `scripts/assets/vn-one-logo-chrome.png` (já commitado, 240 px de altura, **não** precisa do original privado) e `sharp`.

- [ ] **Step 1 (RED):** `favicons.test.ts` (`// @vitest-environment node`) lê os arquivos de `public/` e afirma: `favicon.ico` começa com `00 00 01 00`, tem 3 imagens de 16, 32 e 48; os PNGs 48, 96, 192, 512 têm exatamente essas dimensões (largura e altura lidas do chunk IHDR, bytes 16 a 23), são quadrados e têm menos de 60 kB; o 48 não é o 32. Rodar `npx vitest run src/test/favicons.test.ts`: FAIL (arquivos não existem).
- [ ] **Step 2:** Implementar `scripts/build-favicons.mjs` (`node scripts/build-favicons.mjs`, sem argumento). Quadrado `#0A0A0A` com a marca centralizada; margem 4% até 48 px e 10% de 96 px para cima (o ícone de 16 a 48 precisa do "VN" grande). O `.ico` é escrito à mão (cabeçalho de 6 bytes + 3 entradas de 16 bytes + os 3 PNGs embutidos): sem dependência nova. Registrar `"favicons": "node scripts/build-favicons.mjs"` no `package.json`.
- [ ] **Step 3:** Rodar o script e depois o teste: PASS. Gerar uma folha de contato em 16, 32, 48 e 96 px e **conferir a olho** (Read da imagem) que o "VN" é legível em 16 px. Anexar a folha ao PR para o dono ver.
- [ ] **Step 4:** Commit `feat: favicon set in multiples of 48 px and a multi size ico`.

**Aceite:** os arquivos existem, o teste passa, a folha de contato legível, nenhum original privado foi commitado.

### Task F2: ligar na cabeça, manifest e e2e

**Files:** Modify `index.html` (**só** o bloco `<!-- Favicon -->`). Create `public/site.webmanifest`, `e2e/favicons.spec.ts`. Modify `src/test/favicons.test.ts`.

- [ ] **Step 1 (RED):** estender `favicons.test.ts` com `index.html`: exige, nesta ordem, `rel="icon" href="/favicon.ico" sizes="any"`, `rel="icon" type="image/png" sizes="48x48" href="/brand/favicon-48.png"`, `sizes="96x96"`, `sizes="192x192"`, o `32x32` atual, `rel="apple-touch-icon" href="/brand/apple-touch-icon.png"` e `rel="manifest" href="/site.webmanifest"`. Todo `href` resolve para um arquivo de `public/` e o valor de `sizes` bate com as dimensões reais do arquivo. `public/robots.txt` não tem `Disallow` que cubra `/favicon.ico`, `/brand/` nem `/site.webmanifest`. FAIL.
- [ ] **Step 2:** Escrever o bloco do `index.html` e o `site.webmanifest`: `name` e `short_name` `VN One`, `lang` `pt-BR`, `start_url` `/`, `display` `browser`, `theme_color` e `background_color` `#0A0A0A`, ícones 192 e 512 (`purpose` `any`). O CSP já tem `manifest-src 'self'`.
- [ ] **Step 3 (e2e):** `e2e/favicons.spec.ts` (com `test` de `./n8nGuard`): `GET /favicon.ico` 200 e `content-type` contendo `icon`; `GET /brand/favicon-48.png` 200 `image/png`; `GET /site.webmanifest` 200 e JSON válido com os dois ícones existentes. Rodar com `E2E_PORT=4510 npx playwright test e2e/favicons.spec.ts`.
- [ ] **Step 4:** `npm run lint`, `npm test`, `npm run build`, `npm run budget -- --enforce` (os ícones não entram no JS). Commit `feat: declare the favicon set and a web manifest in the head`.

**Aceite:** `curl -I` no preview devolve 200 em `/favicon.ico` e `/site.webmanifest`; o bundle não mudou.

### Task F3 (só com o ok do dono, D3): `favicon.svg`
O logo da marca existe só em PNG. Redesenhar o "VN" à mão em SVG é mudar a marca. Padrão recomendado: **pular**. Se o dono entregar o vetor, gerar `public/favicon.svg`, adicionar `<link rel="icon" type="image/svg+xml">` antes dos PNGs e pinar no teste de F2.

### Task F4: guarda do banner de compartilhamento

O `public/og-banner.png` já está no sistema visual novo (conferido a olho: fundo `#0A0A0A`, grade, logo cromado, acento verde, 1200x630, 39 kB) e o `?v=3` já está no ar. Não regerar sem motivo: o WhatsApp guarda o cartão por URL, então regerar sem subir o `?v=` não mostra nada novo. O que falta é impedir que o banner e a URL se desencontrem.

**Files:** Create `src/test/ogBanner.test.ts`. Modify `scripts/generate-og-banner.mjs` (só a mensagem final: imprime "suba o ?v= de SITE.ogImage e do index.html").

- [ ] **Step 1 (RED, nasce verde se tudo estiver certo):** `ogBanner.test.ts` (`// @vitest-environment node`): o PNG tem 1200x630 (IHDR) e menos de 300 kB; `SITE.ogImage` termina em `?v=<n>`; `index.html` tem o mesmo `og:image` e `twitter:image` que `SITE.ogImage`; o recorte central de 630 px (o que o WhatsApp mostra) é o contrato de `scripts/generate-og-banner.mjs` (constante `SAFE_SIZE`). Rodar e confirmar PASS (se algo estiver torto, corrigir).
- [ ] **Step 2:** se a decisão D8 pedir texto novo no banner, `npm run og`, conferir `e2e/__shots__/og-square.png` (Read da imagem), subir `?v=` em `src/lib/site.ts` e no `index.html` (o teste acima pega o esquecimento) e atualizar `e2e/share-preview.spec.ts` e `src/lib/site.test.ts`, que hoje pinam `v=3`. Commit `test: pin the share banner and the version in its url`.

---

## Batch M: metadados, títulos, descrições e dados estruturados

### Task M1: `routeMeta.ts` e seus testes

**Files:** Create `src/seo/routeMeta.ts`, `src/seo/routeMeta.test.ts`.

**Interfaces:** Produz o contrato fixado acima. Consome `projects`, `coverOf`, `getProjectBySlug` de `src/data/projects.ts`, `SITE` de `src/lib/site.ts`. Home usa `SITE.title` e `SITE.description` como valor (uma fonte só).

**Rascunhos de copy (marcar como RASCUNHO no PR, o dono revisa no chat; contagens verificadas):**

| Rota | Título (caracteres) | Descrição (caracteres) |
|---|---|---|
| `/` | `VN One \| Automação de processos e agentes de IA sob medida` (58) | a atual aprovada, 145 (não muda) |
| `/servicos` | `Serviços de automação, agentes de IA e sites \| VN One` (53) | `Automação de processos, agentes de IA, sites e sistemas web sob medida. Cada serviço tem o que está incluso, escopo claro e prazo combinado.` (140) |
| `/sobre` | `Sobre a VN One e Victor Nogueira, em Recife \| VN One` (52) | `Conheça Victor Nogueira e como a gente trabalha na VN One: conversa, diagnóstico e entrega em ciclos semanais, com as ferramentas que você já usa.` (146) |
| `/projetos` | `Projetos de automação, agentes de IA e sistemas web \| VN One` (60) | a atual `PROJECTS_PAGE_DESCRIPTION` (156) |
| `/contato` | `Contato: consulta gratuita de automação e IA \| VN One` (53) | `Conta o que a sua empresa faz à mão hoje e pede uma consulta gratuita de 30 minutos, por videochamada ou WhatsApp. A gente aponta por onde começar.` (147) |
| `/blog` | `Blog de IA e automação, artigos de fontes públicas \| VN One` (59) | `Artigos sobre inteligência artificial e automação, em português e em inglês, de fontes públicas. Cada texto abre na fonte original, fora do site.` (145) (**verificar** no `BlogPage` que cada texto abre na fonte; se não, cortar a última frase) |
| `/projetos/dizpara` | `DizPara: leads do Google Maps e envios no WhatsApp \| VN One` (59) | `Painel para captar leads no Google Maps, importar de CSV e do Google Sheets e disparar campanhas por e-mail e por WhatsApp. Veja as telas e o que cada uma faz.` (159) |
| `/projetos/hub081` | `Hub081: atendimento no WhatsApp e agentes de IA \| VN One` (56) | `Painel com as conversas do WhatsApp, contatos, agentes de IA, pipelines, propostas, produtos e financeiro. Veja as telas e o que cada uma faz.` (142) |
| `/projetos/diagnostico-empresarial` | `Diagnóstico Empresarial: teste online e leads \| VN One` (54) | `Página com um diagnóstico de 5 minutos para o dono da empresa e painel de leads com login, indicadores e funil. Veja as telas e o que cada uma faz.` (147) |
| `/projetos/dashboard-consumo-crm` | `Dashboard de Consumo CRM com agente de IA \| VN One` (50) | `Formulário em que se informa o CNPJ e o e-mail de uma empresa. Um agente de IA consulta as compras no Supabase e monta o dashboard do cliente.` (142) |
| `/projetos/portal-link-in-bio` | `Portal Link-in-Bio: páginas de links para celular \| VN One` (58) | `Páginas de links para o celular, com botões de contato, endereço, horários e destaques de ofertas. Aqui estão a da VN One, a de um mercadinho e a de uma loja.` (158) |
| `/projetos/ai-playlist-maker` | `AI Playlist Maker: playlists do Spotify com IA \| VN One` (55) | `Formulário em que a pessoa descreve a playlist, escolhe o número de faixas e informa o e-mail do Spotify. A playlist chega por e-mail, com o botão para ouvir.` (158) |
| `/projetos/travel-ia` | `Travel IA: roteiro de viagem por e-mail, dia a dia \| VN One` (59) | `Formulário em que se escolhe o destino, a duração e o estilo da viagem. O roteiro chega por e-mail, dia a dia, com a previsão do tempo.` (135) |
| `/privacidade`, `/lgpd` | os de hoje, dentro do arquivo congelado (32 e 13) | os de hoje (118 e 125) |

Restrições de desenho: todo título de conteúdo **começa com a mesma palavra** de hoje (`Serviços`, `Sobre`, `Projetos`, `Contato`, `Blog`, nome do projeto) para os contratos de e2e do Plano 3 (`/^Serviços/` e afins) continuarem verdes. As descrições dos projetos nascem das descrições existentes mais uma frase, sem fato novo. "Recife" vem do texto "Recife e remoto" que o site já diz.

`/blog` entra com `isIndexable: false` (recomendação, D2). `lastmod` das rotas é a data do commit que as cria (`2026-11-01`), exceto as de projeto, que ficam `2026-10-29` como hoje.

- [ ] **Step 1 (RED):** `routeMeta.test.ts` (`// @vitest-environment node`) com estes testes e asserções:
  - `covers every path the router serves`: lê `src/App.tsx`, extrai os `path="..."` das `<Route>` (menos `*` e `:slug`), exige que cada um esteja em `ROUTE_METAS` e que cada slug de `projects` tenha `/projetos/<slug>`.
  - `has a unique title and a unique description per route`.
  - `keeps titles and descriptions inside the snippet ranges`: `kind` `home`, `page`, `project` indexáveis ou não: título 50 a 60 e descrição 120 a 160; `kind: 'legal'`: título ≤ 60 e descrição 100 a 160.
  - `follows the brand pattern`: título termina com ` | VN One` (inner) ou começa com `VN One | ` (home).
  - `obeys the copy rules`: nenhum U+2014, U+2013, ` / `, `&`, `chatbot` (sem diferenciar caixa) em título, descrição ou `alt`.
  - `matches the frozen legal pages`: lê `PrivacyPage.tsx` e `LgpdPage.tsx`, extrai `title="..."` e `description="..."` do `<SEO>` e compara com `routeMeta` (`${title} | VN One`).
  - `dates every route in ISO form and never in the future`.
  - `leaves the removed projects and the 404 out`: `REMOVED_PROJECT_SLUGS` não aparecem.
  FAIL.
- [ ] **Step 2:** Implementar `ROUTE_METAS` (função `buildRouteMetas()` que expande `projects`) e `routeMetaFor(path)`, que aceita barra final e ignora `?` e `#`.
- [ ] **Step 3:** `npx vitest run src/seo/routeMeta.test.ts`: PASS. Commit `feat: one source of truth for the metadata of every public route`.

**Aceite:** os números da tabela batem com o teste; nenhuma rota pública sem entrada.

### Task M2: `SEO.tsx` usa `routeMeta`; título e descrição da home

**Files:** Modify `src/components/SEO.tsx`, `src/components/SEO.test.tsx`, `src/lib/site.ts`, `src/lib/site.test.ts`, `e2e/seo-tags.spec.ts`, `e2e/navigation-focus.spec.ts` (linha `HOME_TITLE`), `e2e/share-preview.spec.ts` (se citar o título antigo).

**Interfaces:** `SEO` mantém as props (`title` curto, `description`, `path`, `image`, `noindex`, `jsonLd`). Novo: quando faltam, preenche de `routeMetaFor(path)`: título completo (`title` curto continua passando por `pageTitle`), descrição, `isIndexable === false` vira `noindex`, imagem, `jsonLd` de `structuredDataFor` (Task M3). Prop explícita sempre vence.

- [ ] **Step 1 (RED):** em `SEO.test.tsx`: `<SEO path="/servicos" />` sem props rende o título e a descrição de `routeMetaFor('/servicos')`; `<SEO path="/blog" />` rende `noindex`, sem canonical e sem `og:url`; `<SEO path="/servicos" title="X" />` ainda rende `X | VN One`. Em `site.test.ts`: `SITE.title` é o da home da tabela M1 e `pageTitle()` o devolve. FAIL.
- [ ] **Step 2:** Implementar o preenchimento por `path`. Trocar `SITE.title` e atualizar `index.html` fica na Task M4. Atualizar as expectativas dos e2e (`/Automação de processos e agentes de IA/`, `HOME_TITLE_TEXT`).
- [ ] **Step 3:** `npx vitest run src/components src/lib/site.test.ts`; Commit `feat: SEO fills its tags from the route metadata`.

**Aceite:** nenhuma página precisa passar `title`/`description` para ter a cabeça certa; as que passam continuam iguais.

### Task M3: `structuredData.ts` (JSON-LD)

**Files:** Create `src/seo/structuredData.ts`, `src/seo/structuredData.test.ts`. Modify `src/components/SEO.tsx` (remove `organizationSchema` e `websiteSchema` daqui e usa as funções), `src/components/SEO.sameAs.test.tsx` (mantém o teste de `sameAs`, apontando para o novo módulo).

**Interfaces (produz):** `organizationNode()`, `websiteNode()`, `serviceNodes()`, `breadcrumbNode(crumbs: readonly RouteCrumb[])`, `faqNode(items: readonly Faq[])` (reusa `buildFaqJsonLd`), `structuredDataFor(meta: RouteMeta): object[]`. `@id` estáveis: `https://vnone.com.br/#organization`, `#website`, `#founder`.

**Conteúdo, só o que o repo afirma:**
- **Home:** `Organization` (`name` `VN One`, `url`, `logo` como `ImageObject` do `favicon-512.png` com `width` e `height` 512, `email` de `SITE.email`, `telephone` de `SITE.telephone`, `areaServed` `BR`, `address` com `addressLocality` `Recife` e `addressCountry` `BR` **sem rua, sem CNPJ**, `contactPoint` com `contactType` `customer service`, o mesmo telefone do WhatsApp, `availableLanguage` `pt-BR`, `sameAs` só de `SOCIAL_LINKS` da organização, `founder` Person `Victor Nogueira` com `@id` e `sameAs` do LinkedIn e do GitHub) e `WebSite` (`name` `VN One`, `alternateName` `["VN One Automação e IA", "vnone.com.br"]` (rascunho, D9), `url`, `inLanguage` `pt-BR`, `publisher` por `@id`). Sem `SearchAction` (o site não tem busca). `FAQPage` só se `hasFaq`.
- **A lista de serviços pode mudar a qualquer momento** (o Super Agente entrou na lista e um serviço saiu). Por isso nenhum teste, texto ou JSON-LD deste plano nomeia um serviço nem fixa a quantidade: tudo é **derivado de `services` em `src/data/services.ts`** na hora do build e dos testes. Quem mexer na lista não precisa mexer neste plano.
- **`/servicos`:** `BreadcrumbList` + um `Service` por item de `services.ts` (`name` do `nome`, `description` da `descricao`, `serviceType` da `categoria`, `url` `/servicos#<slug>`, `provider` por `@id`, `areaServed` `BR`). **Sem `Offer`, sem preço, sem desconto.**
- **`/sobre`, `/projetos`, `/contato`, legais e projetos:** `BreadcrumbList` (`Início` e a página; projeto tem 3 níveis, como hoje). `/contato` e a home levam `FAQPage`, porque a FAQ está visível nas duas.
- **Nunca:** `aggregateRating`, `Review`, `Offer`, `price`, `LocalBusiness` (exige endereço de rua).
- Observação honesta: desde 2023 o Google só mostra rich result de FAQ para sites de governo e saúde. O `FAQPage` fica por consistência e para outros leitores de máquina, **sem expectativa de estrelas ou caixas na busca**.

- [ ] **Step 1 (RED):** `structuredData.test.ts`: (a) `organizationNode().telephone` é `SITE.telephone` e o `contactPoint` não tem outro número; (b) todo `sameAs` ∈ `SOCIAL_LINKS` e nenhum é vazio; (c) nenhum nó, em profundidade, tem as chaves `aggregateRating`, `review`, `offers`, `price`, `priceCurrency`; (d) `serviceNodes()` tem exatamente `services.length` itens, um por `services[i].slug`, com `description` igual à `descricao` (nenhum nome de serviço escrito no teste); (e) todo `@id` referenciado (`provider`, `publisher`, `founder`) existe em algum nó da home; (f) `structuredDataFor` de uma rota com `hasFaq` inclui `FAQPage` com as mesmas perguntas de `faqs`, e de uma sem `hasFaq` não inclui; (g) `JSON.parse(serializeJsonLd(x))` devolve `x` e um título com `</script>` não fecha o elemento; (h) nenhum valor de texto tem travessão, meia-risca, ` / ` ou `chatbot`. FAIL.
- [ ] **Step 2:** Implementar o módulo; `SEO.tsx` passa a emitir `structuredDataFor(meta)` quando a página não passa `jsonLd`; emitir `Organization` e `WebSite` só na home como hoje (sem entidade duplicada).
- [ ] **Step 3:** `npx vitest run src/seo src/components/SEO`; Commit `feat: structured data for the organization, the site, the services and the breadcrumbs`.
- [ ] **Step 4 (manual, no PR):** colar o JSON-LD da home e de `/servicos` em `https://validator.schema.org/` e anexar o resultado (sem erros).

### Task M4: bloco de meta do `index.html`

**Files:** Modify `index.html` (**só** título, `description`, `og:*`, `twitter:*`), `e2e/share-preview.spec.ts`.

- [ ] **Step 1 (RED):** `share-preview.spec.ts` já compara com `SITE.*`; com `SITE.title` novo (M2) ele falha enquanto o HTML não mudar.
- [ ] **Step 2:** Atualizar o título, o `og:title` e o `twitter:title`. Envolver o bloco do título até o `twitter:image:alt` com `<!-- seo:start -->` e `<!-- seo:end -->` (o R usa esses marcadores para trocar o bloco por rota). Manter `?v=3` no banner (D8).
- [ ] **Step 3:** `E2E_PORT=4513 npx playwright test e2e/share-preview.spec.ts e2e/seo-tags.spec.ts`. Commit `feat: new home title in the static head, with markers for the build step`.

---

## Batch R: HTML por rota, sitemap, 404, www e robots

**Recomendação (trade-offs):**

| Opção | Ganho | Custo e risco | Veredito |
|---|---|---|---|
| **A. Prerender da cabeça por rota no build** (este plano) | Title, description, canonical, og, JSON-LD certos no HTML cru de cada URL; 404 real; zero mudança no app; build +2 s; nenhuma dependência nova; bundle intacto | O corpo continua vazio até o JS rodar: o ganho de LCP é nenhum | **Escolhida** |
| B. SSG/SSR completo (`renderToString` + `hydrateRoot`) | Corpo no HTML, LCP e FCP melhores | Muda `main.tsx`, risco de hidratação com motion `LazyMotion`, `window` e animações em dezenas de componentes, testes de a11y e de foco para reescrever, bundle de hidratação | Não agora. Reavaliar se o Search Console mostrar atraso de indexação |
| C. Serviço de prerender externo | Pouco código | Custo, terceiro no caminho do HTML, risco de cloaking | Não |

O Google renderiza JavaScript (mais devagar), então a opção A resolve o que importa para **WhatsApp, LinkedIn, Facebook, Slack e bots sem JS**, e dá ao Google a cabeça certa já na primeira leitura. Não há `hreflang` (idioma único), `lang="pt-BR"` fica.

**Como as marcas `data-static-seo` e o `SEO.tsx` convivem:** o HTML pré-renderizado marca **todas** as tags da cabeça da rota (inclusive os `<script type="application/ld+json">`) com `data-static-seo`. Ao montar, `useDropStaticTags` remove todas e o React recoloca as dele, com os mesmos valores (garantido pelo teste de paridade da Task Q1). Nunca há duas de cada.

### Task R1: `headHtml.ts` (funções puras)

**Files:** Create `src/seo/headHtml.ts`, `src/seo/headHtml.test.ts`.

**Interfaces:** `escapeHtml(value: string): string`; `renderSeoHead(meta: RouteMeta, jsonLd: readonly object[]): string` (todas as tags com `data-static-seo`; `isIndexable: false` gera `<meta name="robots" content="noindex, nofollow">` e **não** gera canonical nem `og:url`/`twitter:url`); `applyHeadToTemplate(template: string, head: string): string` (troca o que está entre `<!-- seo:start -->` e `<!-- seo:end -->`; falha alto se faltar um marcador); `renderNoscript(meta: RouteMeta, links: readonly RouteCrumb[]): string`.

- [ ] **Step 1 (RED):** `headHtml.test.ts` com fixture de `RouteMeta`: o `<title>` é `meta.title` escapado; há uma e só uma `meta name="description"`, `link rel="canonical"` com `https://vnone.com.br<path>` (a home com `/` final), `og:url`, `og:title`, `og:image` (padrão `SITE.ogImage` ou `meta.image.url`), `og:image:width` e `height`, `twitter:image`; toda tag tem `data-static-seo`; título com `"`, `<` e `&` sai escapado e o HTML parseia (`DOMParser` do jsdom) para o texto original; um JSON-LD com `</script>` não fecha o elemento; `isIndexable: false` não tem canonical; `applyHeadToTemplate` lança erro sem marcadores; o resultado de duas rotas diferentes tem títulos diferentes. FAIL.
- [ ] **Step 2:** Implementar. Sem import de React. **Step 3:** PASS. Commit `feat: pure functions that render the head of a route`.
- [ ] **Step 4 (opcional, `renderNoscript`):** um `<noscript>` no fim do `body` com o `h1` (o título sem a marca), a descrição e `<ul>` com links descritivos para as rotas públicas indexáveis. Serve a quem não roda JS e à descoberta de links; o efeito de ranking é pequeno (o Google renderiza JS). Teste: só links internos, texto sem travessão.

### Task R2: `sitemap.ts` e o fim do `public/sitemap.xml`

**Files:** Create `src/seo/sitemap.ts`, `src/seo/sitemap.test.ts`. Modify `src/data/projects.sitemap.test.ts`. Delete `public/sitemap.xml` (o build gera).

**Interfaces:** `renderSitemap(metas: readonly RouteMeta[]): string`.

- [ ] **Step 1 (RED):** `sitemap.test.ts`: só rotas com `isIndexable`; um `<loc>` absoluto por rota (sem barra final, exceto a home); `<lastmod>` igual ao do dado; **sem** `changefreq` e `priority` (o Google ignora); XML escapado; `/blog` ausente (D2) e as legais presentes; sem duplicata. `projects.sitemap.test.ts` passa a testar `renderSitemap(ROUTE_METAS)` (lista a página de projetos e cada projeto, nenhum removido). FAIL.
- [ ] **Step 2:** Implementar, apagar o arquivo estático, ajustar o teste. **Step 3:** PASS. Commit `feat: generate the sitemap from the route metadata`.

### Task R3: `scripts/build-seo.mjs` e ligação no build

**Files:** Create `scripts/build-seo.mjs`, `e2e/prerender.spec.ts`. Modify `package.json` (`"build": "vite build && node scripts/build-seo.mjs"`), `playwright.config.ts` (o comando do `webServer` acrescenta `&& node scripts/build-seo.mjs --outDir ${BUILD_DIR}` antes do `vite preview`).

**Comportamento:** `node scripts/build-seo.mjs [--outDir dist]`. Se `GITHUB_PAGES === 'true'`, imprime "skipped" e sai com 0. Senão: cria um servidor Vite em modo `middlewareMode` (`appType: 'custom'`, `logLevel: 'silent'`), `ssrLoadModule('/src/seo/routeMeta.ts')`, `headHtml.ts`, `structuredData.ts`, `sitemap.ts`; lê `<outDir>/index.html` (o que o Vite gerou, com os `modulepreload` e o script hasheado), e para cada `ROUTE_METAS` escreve `<outDir>/<path>/index.html` (a home sobrescreve `index.html` com a mesma função); escreve `<outDir>/404.html` (cabeça `noindex`, título `Página não encontrada | VN One`, sem canonical); escreve `<outDir>/sitemap.xml`; fecha o servidor no `finally`; sai com código 1 e mensagem clara se uma rota falhar. O script é só I/O: a lógica está em R1 e R2.

- [ ] **Step 1 (RED):** `e2e/prerender.spec.ts` (sem JavaScript: `page.request.get`): para cada rota indexável de `ROUTE_METAS` o HTML cru tem o `<title>` e a descrição daquela rota, `link rel="canonical"`, `og:url` e um `application/ld+json` que parseia; os títulos de todas as rotas são distintos; `/servicos` tem JSON-LD com um `Service` por item de `services`; `/blog` tem `noindex` e não tem canonical; `/sitemap.xml` não tem `/blog` nem data de julho; `GET /404.html` tem `noindex` (o `vite preview` serve o arquivo). FAIL sem o script.
- [ ] **Step 2:** Implementar o script e a ligação. **Step 3:** `E2E_PORT=4516 npx playwright test e2e/prerender.spec.ts e2e/seo-tags.spec.ts`: PASS nos dois projetos (o `seo-tags.spec.ts` existente prova que o `SEO.tsx` ainda deixa uma de cada tag).
- [ ] **Step 4:** `npm run build` mostra o passo e `ls dist/servicos/index.html`; `npm run budget -- --enforce` continua em 156,1 kB. Verificar que `GITHUB_PAGES=true npm run build` pula o passo. Commit `feat: prerender the head of every public route and the sitemap at build time`.

### Task R4: nginx, `www` e a imagem Docker

**Files:** Modify `nginx.conf`, `src/test/nginx-config.test.ts`, `scripts/smoke-container.mjs`.

**Mudanças:**
- `location /` passa a `try_files $uri $uri/index.html =404;` e `error_page 404 /404.html;`, com `location = /404.html { internal; add_header Cache-Control "no-cache" always; include ...security-headers.conf; }`. Rota desconhecida: **status 404** com o corpo do SPA (a página `NotFound` renderiza). Os `301` de `/projetos/troco` e `/projetos/importacao-massiva-nfe` ficam.
- Novo `server` **depois** do atual (o atual segue sendo o padrão) com `server_name www.vnone.com.br;` e `return 301 https://vnone.com.br$request_uri;`, incluindo o snippet de segurança. O proxy já termina o TLS; o redirect é por `Host`.

- [ ] **Step 1 (RED):** em `nginx-config.test.ts`: `location /` termina em `=404`; existe `error_page 404 /404.html`; o bloco `/404.html` é `internal`, tem `no-cache` e o include de segurança; existe um `server` com `server_name www.vnone.com.br` e `return 301 https://vnone.com.br$request_uri`; o `server` padrão continua sendo o primeiro. Em `smoke-container.mjs` (as checagens rodam contra a imagem real): `/servicos` devolve o título de `/servicos` e não o da home; `/rota-que-nao-existe` devolve **404** com `noindex`; `/projetos/troco` 301 para `/projetos`; `GET /` com `Host: www.vnone.com.br` devolve 301 para `https://vnone.com.br/`; `/favicon.ico` e `/site.webmanifest` 200 com `Cache-Control` de uma semana; `/sitemap.xml` 200 `xml` sem `blog`; `/robots.txt` 200. FAIL.
- [ ] **Step 2:** Ajustar `nginx.conf`. **Step 3:** `npm test -- src/test/nginx-config.test.ts`. Como não há `nginx` no PC, a prova real é a imagem: `docker build -t vnone:p4 .`, `docker run --rm vnone:p4 nginx -t`, `docker run -d -p 4517:80 vnone:p4` e `node scripts/smoke-container.mjs http://localhost:4517`; parar e remover o contêiner. (Se o Docker não estiver disponível no PC, o job de CI `docker` já roda estes mesmos passos.)
- [ ] **Step 4:** Commit `feat: serve the prerendered routes, answer 404 for unknown paths and redirect www to the apex`.

**Passo do dono (www), ver a lista do dono no fim:** o redirect do código só funciona depois que o EasyPanel recebe o domínio `www.vnone.com.br` e emite o certificado.

### Task R5: `robots.txt`

**Files:** Modify `public/robots.txt`. Create `src/test/robots.test.ts`.

Conteúdo: `User-agent: *`, `Allow: /`, `Sitemap: https://vnone.com.br/sitemap.xml`. **Nunca** `Disallow: /blog` nem `/assets/`: o Google precisa **rastrear** `/blog` para ver o `noindex`, e precisa dos arquivos de JS e CSS para renderizar.

- [ ] **Step 1 (RED):** o teste afirma que o `Sitemap` aponta para `SITE.url`, não há `Disallow` que cubra `/blog`, `/assets`, `/brand`, `/favicon.ico`, e a linha de sitemap é absoluta. Já passa com o arquivo atual: então o commit é só o teste (garantia contra regressão). Commit `test: pin the robots rules that keep the noindex and the favicon crawlable`.

---

## Batch Q: fechamento (depois do Plano 3)

### Task Q1: o "switch" das páginas e a paridade

**Files:** Modify `src/pages/{ServicesPage,AboutPage,ProjectsPage,ProjectDetailPage,ContactPage,HomePage}.tsx` (ou os equivalentes que o Plano 3 criar) e `src/App.tsx` (só o `<SEO>` do blog): cada `<SEO>` passa a ter só `path` (e `noindex` onde já havia) e `image`/`imageAlt`/`imageWidth`/`imageHeight` nos projetos. **Não** tocar `PrivacyPage.tsx` nem `LgpdPage.tsx`. Modify `src/pages/seo-copy.test.ts`. Create `e2e/seo-parity.spec.ts`.

- [ ] **Step 1 (RED):** `seo-copy.test.ts` ganha: nenhum `<SEO>` de `src/pages` (fora os dois legais) tem `title=` nem `description=` nem `jsonLd=`. `e2e/seo-parity.spec.ts`: para cada rota indexável, o conjunto (title, description, canonical, `og:title`, `og:description`, `og:image`, JSON-LD parseado e ordenado) lido do HTML cru é **igual** ao lido do DOM depois que a página montou e as `data-static-seo` sumiram; e a FAQ só tem `FAQPage` nas rotas cujo DOM mostra todas as perguntas. FAIL.
- [ ] **Step 2:** Remover as props. **Step 3:** `E2E_PORT=4519 npx playwright test e2e/seo-parity.spec.ts e2e/seo-tags.spec.ts` nos dois projetos: PASS. Commit `refactor: pages take their head from the route metadata`.

### Task Q2: axe nas rotas públicas

**Files:** Create `e2e/public-routes.axe.spec.ts`.

Copia o molde de `e2e/home.axe.spec.ts` (`AxeBuilder` com as tags WCAG 2.0 a 2.2 AA, `reducedMotion: 'reduce'`, 390 e 1440 px, fonte normal e maior onde já existe o helper) para `/servicos`, `/sobre`, `/projetos`, `/projetos/dizpara`, `/contato`, `/blog`, `/privacidade`, `/lgpd`, `/rota-que-nao-existe`. Roda só no projeto `desktop` (as larguras são dele). Usa `test` de `./n8nGuard`.

- [ ] **Step 1 (RED):** escrever a spec e rodar: qualquer violação é achado. **Step 2:** corrigir cada achado no arquivo dono (nunca nos congelados: se for neles, vira pergunta ao dono). **Step 3:** PASS. Commit `test: axe audit of every public route`.

**Aceite:** zero violações; os `incomplete` do axe vão anexados ao relatório e triados à mão.

### Task Q3: portão de Lighthouse

**Files:** Create `scripts/lighthouse-gate.mjs`. Modify `package.json` (`"lighthouse": "node scripts/lighthouse-gate.mjs"`).

`node scripts/lighthouse-gate.mjs --port 4510 --routes / /servicos /sobre /projetos /contato`: sobe `vite preview` na porta dada (4510 a 4519, recusa 3000), roda `npx --yes lighthouse@13.6.0` em celular e desktop, imprime a tabela e **sai com 1** se algum limite falhar; encerra o preview no `finally`. Limites: SEO 100; acessibilidade ≥ 95; boas práticas ≥ 95; performance desktop ≥ 95 e celular ≥ 90; LCP celular ≤ 2,5 s; CLS ≤ 0,1; TBT celular ≤ 200 ms. Lighthouse **não** entra nas dependências (npx sob demanda). Não roda no CI por padrão (lento e instável por runner): é o portão manual do líder, com os números no PR.

- [ ] **Step 1:** teste unitário `src/test/lighthouseGate.test.ts` da função pura `evaluate(summary, thresholds)` (lista de falhas), RED e GREEN. **Step 2:** implementar o script. **Step 3:** rodar contra a branch final e colar a tabela. Commit `feat: a Lighthouse gate with the thresholds of the SEO plan`.

### Tasks Q4 a Q6: Core Web Vitals do celular (a partir da linha de base)

Alvo: home no celular com LCP ≤ 2,5 s, TBT ≤ 200 ms e performance ≥ 90 **no mesmo método da auditoria** (Lighthouse 13.6.0, build de produção, porta 4510), bundle ≤ 160 kB. Cada task parte de uma medida e termina com a medida nova no PR. Se a medida não melhorar, desfaz (nada fica "por precaução").

- **Q4: fonte do hero.** Descobrir com `npm run lcp` (`scripts/measure-lcp.mjs`) e um trace do `chrome-devtools` qual peso de Space Grotesk o parágrafo do LCP usa; hoje só o `Bold` tem `preload`. Acrescentar o `preload` do peso certo (`index.html`, só a linha de preload) **se** o trace mostrar atraso de fonte. Teste: `src/test/headIcons.test.ts` (ou `fontPreload.test.ts`) exige que todo `preload` de fonte aponte para um arquivo existente de `public/fonts` e que sejam no máximo 2.
- **Q5: CSS que bloqueia a renderização.** O `index-*.css` de 23,5 kB bloqueia (economia de 290 a 312 ms). Medir quanto dele a home usa (Coverage do DevTools); se a maior parte é da home, ele fica; se é de outras rotas, mover o que for de página para o CSS da rota lazy (os componentes já são chunks). Sem inlinar CSS à mão.
- **Q6: JavaScript do caminho crítico e TBT.** `react-vendor` tem 35% sem uso na carga e `motion-vendor` (34,7 kB gzip) está no caminho crítico. Verificar se as `features` do `LazyMotion` já carregam por `import()`; se não, carregar. Atacar os dois maiores ofensores do trace (reflow forçado em `react-vendor` e em `UseCaseTabs`). Cada correção com um teste de regressão onde der (unidade ou e2e) e `npm run budget -- --enforce`.

### Task Q7: links internos com âncora descritiva

**Files:** Create `e2e/internal-links.spec.ts`.

- [ ] **Step 1 (RED):** a spec (sem clicar em nada que envie formulário) afirma: toda rota indexável de `ROUTE_METAS` é alcançável a partir de `/` em no máximo 2 cliques por `<a href>` (menu, rodapé, cartões); nenhum `<a>` interno tem texto genérico (`aqui`, `clique aqui`, `saiba mais`, `veja mais`, `leia mais`) fora de uma lista de exceções com comentário; os cartões de serviço da home levam a `/servicos#<slug>` e o texto da âncora é o nome do serviço; os cartões de projeto têm o nome do projeto no nome acessível do link. FAIL onde houver "Ver detalhes" sem nome (o `CARD_CTA_TEXT` de hoje é "Ver detalhes": o `aria-label` ou o texto visível precisa do nome do projeto).
- [ ] **Step 2:** Corrigir nos arquivos donos. **Step 3:** PASS nos dois projetos. Commit `test: every public route is two clicks away and links say where they go`.

### Task Q8: passe final de copy (modo humanizer)

**Files:** os `*Copy.ts` do Plano 3, `src/data/{homeCopy,shellCopy,faqs,services,process,useCases,stats}.ts`, `src/data/projects.ts` e `projectLabels.ts` (só texto), `src/seo/{routeMeta,structuredData}.ts`. **Não** `testimonials.ts` (5 e 6 são rascunho sem confirmação: só listar), **não** os protegidos.

- [ ] **Step 1:** listar toda string visível ao usuário e as de `<title>`, `meta`, `alt`, `aria-label` e JSON-LD (um `grep` por `'` e `"` nos arquivos de dados, mais a varredura do DOM de cada rota via Playwright salva em `e2e/__shots__/` fora do commit).
- [ ] **Step 2:** passar cada trecho pelo `humanizer:humanizer` (contraste "não é X, é Y", tríade forçada, frase de efeito no fim, palavras de venda, travessão, ` / `, "chatbot") e corrigir **sem mudar o fato** e sem inventar número, cliente ou resultado. Texto novo ou reescrito vai marcado como RASCUNHO no PR e o dono aprova no chat.
- [ ] **Step 3:** estender `src/test/copy-rules.test.ts` (uma linha na lista de arquivos varridos: `src/seo/`) para o guarda cobrir `routeMeta` e `structuredData`. **Step 4:** `npm test`. Commit `docs: final copy pass`.

### Task Q9: runbook e portões finais

**Files:** Create `docs/seo-runbook.md`. Modify `README.md` (uma seção curta).

- [ ] `docs/seo-runbook.md`: como adicionar uma rota (um objeto em `routeMeta.ts` e a linha em `App.tsx`; o teste M1 falha se faltar um dos dois), como trocar título e descrição, como atualizar `lastmod` (editar o dado no mesmo commit que muda o conteúdo da página), como regerar ícones (`npm run favicons`) e o banner (`npm run og` e subir `?v=` em `SITE.ogImage` e no `index.html`), os passos do dono (cópia da lista abaixo).
- [ ] **Portões finais (evidência no PR):** `npm run lint` (0), `npm test`, `npm run e2e` (desktop e mobile), `npm run build`, `npm run budget -- --enforce` (≤ 160 kB), `node scripts/lighthouse-gate.mjs`, `docker build` + `scripts/smoke-container.mjs`, `git diff main...HEAD -- <arquivos protegidos>` vazio, revisão final com `code-reviewer`, `typescript-reviewer`, `a11y-architect` e `seo-specialist`, CI do GitHub verde, **aprovação do dono antes do merge**.

---

## Mapa de palavras-chave e intenção (pt-BR)

Limite honesto: não há acesso a Search Console, Planejador de Palavras-chave nem dado de volume nesta auditoria. O mapa abaixo usa **intenção e composição das páginas de resultado** (pesquisa web feita em 2026-11-01). Os volumes entram quando o Search Console (aba Desempenho) acumular 4 a 8 semanas de dados.

O que a pesquisa mostrou: "automação de processos com IA para pequenas empresas" é dominada por blogs de ERP e entidades (Omie, Sebrae, Mailchimp, DIO): intenção **informativa**. "Agente de IA no WhatsApp com n8n" é dominada por tutoriais e cursos (Hora de Codar): intenção de **aprender**, não de contratar. "Consultoria de automação com IA em Recife" não mostrou nenhuma empresa local: concorrência **fraca** e volume provavelmente baixo, mas é a consulta com intenção comercial mais clara.

| URL | Palavra-chave principal | Apoio | Intenção | Observação |
|---|---|---|---|---|
| `/` | automação de processos e agentes de IA | automação para empresas, VN One | marca e comercial amplo | vence a marca; é o título novo |
| `/servicos` | serviços de automação e agentes de IA | automação de WhatsApp, site e sistema web sob medida | comercial | lista de serviços; não disputa a home porque o título começa por "Serviços" |
| `/sobre` | Victor Nogueira automação IA Recife | consultor de automação em Recife | confiança e local | só afirma o que o site já diz |
| `/projetos` e `/projetos/:slug` | exemplos de automação e IA, nome de cada produto | agente de IA com WhatsApp, painel de leads | prova | cada caso é único; DizPara e Hub081 são nomes de marca |
| `/contato` | consulta gratuita de automação | falar com a VN One, WhatsApp | transacional | conversão |
| `/blog` | (nenhuma) | | | fora do índice |

**Canibalização:** home e `/servicos` poderiam disputar "automação de processos". Regra: a home carrega a proposta e a marca; `/servicos` carrega o termo de serviço no plural e a lista. Cada título começa por uma palavra diferente, cada descrição tem uma frase diferente (teste de unicidade em M1). Nenhum termo principal se repete em duas URLs.

**n8n:** o site mostra o n8n como integração, mas a pesquisa é de tutorial. Não é palavra principal de nenhuma URL; fica como menção natural no texto.

**Conteúdo que falta (vira Plano 5, depende de fatos do dono):**
1. Uma página por serviço (`/servicos/<slug>`) com texto próprio: para quem serve, o que entra, como é o processo, prazo (já existe em `services.ts`), perguntas reais. Hoje todos os serviços moram na mesma página, e uma página só não rankeia para vários assuntos diferentes. Começar pelos dois de maior demanda (automação de processos e agente de IA), com a lista atual de `services.ts` na mão (ela está mudando em outro branch). A infraestrutura deste plano (dado em `routeMeta`, prerender, sitemap, JSON-LD de `Service`) já comporta: cada página nova é um objeto de dado mais o componente.
2. FAQ que responda perguntas que o cliente faz de verdade (custo de manter, LGPD, o que acontece se o fluxo quebrar), com a resposta do dono.
3. Casos como evidência: DizPara e Hub081 já são páginas; faltam resultados **que o dono confirme** (nunca inventar número).
4. Quando houver conteúdo próprio no blog, voltar `/blog` ao índice.

**`/blog` (decisão recomendada, D2):** `noindex` e fora do sitemap. Hoje a página só agrega, no navegador, títulos de terceiros (dev.to, TabNews): texto que não é nosso, sem conteúdo original. Indexar isso dilui a qualidade percebida do site e disputa com as próprias fontes. Mantém o link no menu para quem visita. **Não** bloquear no `robots.txt` (o Google precisa rastrear para ver o `noindex`).

## Ações fora do site (só o dono pode fazer), passo a passo

**1. Search Console (a mais importante)**
1. Acesse https://search.google.com/search-console com a conta Google do negócio e clique em **Adicionar propriedade**.
2. Escolha **Domínio** e digite `vnone.com.br`. Ele cobre `http`, `https`, apex e `www`.
3. O Google mostra um registro **TXT**. No painel onde o DNS do domínio é gerenciado (se o domínio é `.com.br`, normalmente o Registro.br ou o provedor de DNS), crie um registro do tipo TXT, host `@`, com o valor exato que o Google mostrou. Volte e clique em **Verificar** (pode levar de minutos a algumas horas).
4. Em **Sitemaps**, adicione `sitemap.xml` e envie. Só depois que o deploy do Batch R estiver no ar.
5. Em **Inspeção de URL**, cole `https://vnone.com.br/`, aguarde e clique em **Solicitar indexação**. Repita para `/servicos`, `/projetos`, `/sobre`, `/contato`, `/projetos/dizpara` e `/projetos/hub081`. Há um limite diário de pedidos: faça alguns por dia.
6. Depois de alguns dias, veja **Páginas** (indexação) e **Experiência > Core Web Vitals**. Em **Desempenho**, anote as consultas reais: elas substituem o chute do mapa de palavras-chave.
7. Alternativa à DNS (só se não houver acesso ao DNS): propriedade de **Prefixo de URL** com arquivo HTML. O Google dá um arquivo `googleXXXX.html`; peça ao time para colocá-lo em `public/` (um commit, sem outra mudança). A verificação por DNS é preferível.

**2. Bing Webmaster Tools:** em https://www.bing.com/webmasters escolha **Importar do Google Search Console** e autorize. Isso traz o site e o sitemap sem verificar de novo (o Bing alimenta também DuckDuckGo e o Copilot).

**3. Domínio `www` (EasyPanel):** no EasyPanel, abra o serviço do site, aba **Domínios**, adicione `www.vnone.com.br` apontando para a mesma porta (80) com **HTTPS** ligado (certificado Let's Encrypt). O DNS do `www` já é um CNAME para o apex. Se a tela do EasyPanel oferecer "redirecionar para outro domínio", escolha `https://vnone.com.br`; se não, o nginx da imagem (Task R4) já responde 301. Teste: `https://www.vnone.com.br/` deve abrir `https://vnone.com.br/` sem aviso de certificado.

**4. Google Business Profile:** em https://www.google.com/business crie o perfil **VN One**, categoria **Consultor de TI** ou **Serviço de desenvolvimento de software** (a que o Google oferecer mais próxima). Se a VN One atende clientes **presencialmente** em Recife, cadastre como **negócio com área de atuação** (esconda o endereço, defina Recife e região). **Atenção:** o Google só aceita negócios que têm contato presencial com clientes; se tudo é remoto, o perfil pode ser recusado ou suspenso. Confira a regra antes de gastar tempo. Telefone e site iguais aos do site. A verificação é por vídeo ou telefone.

**5. Nome, endereço e telefone consistentes (NAP):** a mesma grafia `VN One`, o mesmo WhatsApp `(81) 98445-1243`, o mesmo e-mail `contato@vnone.com.br` e a cidade `Recife` no LinkedIn (crie uma **página da empresa** "VN One"), na bio do Instagram, no GitHub, no WhatsApp Business (categoria, descrição, site) e no perfil do Google. Depois que a página do LinkedIn existir, mande o endereço: ele entra em `SOCIAL_LINKS` e no `sameAs`.

**6. Links dos produtos do dono:** no rodapé do Hub081 e do DizPara, um link para `https://vnone.com.br` com texto descritivo, por exemplo "Feito pela VN One, automação e agentes de IA". Link de um site real do próprio dono, em texto descritivo, é o backlink mais limpo que existe.

**7. Pré-visualização de compartilhamento depois do deploy:** o WhatsApp, o Facebook e o LinkedIn guardam o cartão antigo. Em https://developers.facebook.com/tools/debug/ cole a URL e clique em **Scrape Again** (vale para WhatsApp e Facebook); em https://www.linkedin.com/post-inspector/ cole a URL e inspecione.

**Prazos realistas, sem garantia:** o snippet do Google costuma trocar de **alguns dias a cerca de 3 semanas** depois do pedido de indexação; o ícone pode levar **semanas** depois de recrawlear; o nome do site, semanas. Aparecer para termos amplos ("automação de processos") leva **meses** e depende de conteúdo e de links: nenhum ajuste técnico garante posição. A marca "VN One" é curta e ambígua, então o resultado mais rápido deve vir de "VN One automação" e do nome do Victor.

## Checagens do dono em aparelho real (antes do merge)

- Safari no iPhone: home, `/servicos`, `/contato`, o teclado do formulário (campo de WhatsApp com máscara), o menu e a rolagem.
- Chrome no Android: o mesmo, mais o botão de acessibilidade e o botão do WhatsApp.
- Abrir `https://vnone.com.br/favicon.ico` e `https://vnone.com.br/site.webmanifest` no celular.
- Mandar o link da home e o de `/projetos/dizpara` para si mesmo no WhatsApp e conferir título, descrição e imagem do cartão.
- Conferir no Google, em modo anônimo, `site:vnone.com.br` uma semana depois do pedido de indexação.

## Perguntas para o dono (decisões D1 a D12) (cada uma com o padrão recomendado)

- **D1.** Trocar o título da home para `VN One | Automação de processos e agentes de IA sob medida`? **Padrão: sim** (carrega as palavras que o cliente pesquisa). Muda o texto aprovado do `SITE.title`.
- **D2.** `/blog` fora do índice e do sitemap? **Padrão: sim**, até haver texto próprio.
- **D3.** Favicon em SVG? **Padrão: não** (só há o logo em PNG). Se tiver o vetor, mande.
- **D4.** O Instagram `@victornogueira._` é da empresa ou pessoal? **Padrão: manter como está** (já está no ar como `sameAs` da organização).
- **D5.** `Organization.address` com `addressLocality: Recife` e `addressCountry: BR`, sem rua? **Padrão: sim.**
- **D6.** As props de `<SEO>` das duas páginas legais ficam congeladas com o texto atual (títulos e descrições abaixo da faixa)? **Padrão: sim.** Mudar exige o seu ok.
- **D7.** URL canônica sem barra final (exceto a home)? **Padrão: sim.**
- **D8.** Manter `og-banner.png?v=3`? O banner já está no sistema visual novo (preto, grade, logo cromado, acento verde). **Padrão: manter.** Se quiser trocar o texto "AUTOMAÇÃO E IA PARA EMPRESAS" por "AUTOMAÇÃO E AGENTES DE IA", rodar `npm run og` e subir para `?v=4`.
- **D9.** `alternateName` do `WebSite`: `VN One Automação e IA` e `vnone.com.br`. **Padrão: esses dois** (rascunho).
- **D10.** Plano 5 com uma página por serviço e FAQ real? **Padrão: sim**, depois deste plano, com os fatos que só o senhor tem.
- **D11.** Lighthouse no CI? **Padrão: não** (portão manual do líder).
- **D12.** O Google Business Profile é viável (há contato presencial em Recife)? **Padrão: conferir a regra antes de criar.**

## Riscos

| Risco | Efeito | Mitigação |
|---|---|---|
| Rota que o app serve e a lista não conhece | 404 de status para um usuário real (a página ainda renderiza) | Teste M1 lê o `App.tsx`; o `NotFound` do SPA continua no corpo do `404.html` |
| `useDropStaticTags` e HTML por rota divergirem | Dois de cada tag, ou o JSON-LD some | Marcação `data-static-seo` em tudo, `seo-tags.spec.ts` e `seo-parity.spec.ts` |
| Plano 3 reescrever a copy da página | Título que não bate com a página | O título vive em `routeMeta`; a Task Q1 revisa os dois juntos; títulos começam com a mesma palavra |
| `try_files` novo servir diretório sem `index.html` | 404 onde havia página | `smoke-container.mjs` abre cada rota da lista na imagem real |
| Google demorar a trocar o snippet e o ícone | Dono acha que "não funcionou" | Passos de indexação e prazos honestos no runbook |
| Build do Pages (`GITHUB_PAGES`) quebrar | Deploy do Pages falha | O script pula nesse modo; teste manual `GITHUB_PAGES=true npm run build` |
| `lastmod` esquecido | Sitemap com datas velhas | Ponto fixo na lista do PR e no runbook |

## Definition of Done

- Cada batch com lint 0, vitest, e2e dos dois projetos, `npm run build`, bundle ≤ 160 kB, revisão de fechamento dedicada e achados corrigidos (inclusive Minor).
- HTML cru de cada rota pública com título, descrição, canonical, og, twitter e JSON-LD próprios; rota desconhecida com 404 e `noindex`; sitemap gerado, sem `/blog`, com `lastmod` real.
- Favicon: `/favicon.ico`, PNGs 48, 96, 192 e 512, manifest, tudo com teste de links e tamanhos.
- Lighthouse nas rotas públicas: SEO 100, acessibilidade ≥ 95, boas práticas ≥ 95, performance desktop ≥ 95, celular ≥ 90 na home com LCP ≤ 2,5 s e TBT ≤ 200 ms (ou o número medido e justificado no PR).
- axe sem violação nas rotas públicas, `git diff main...HEAD` sem tocar os arquivos protegidos.
- PR com CI do GitHub verde e **aprovação do dono antes do merge** (a `main` é produção). Depois do deploy: os passos do dono acima.

## Self-review

- **Cobertura do pedido:** 1 favicon (F), 2 títulos e descrições (M1, M2, Q1), 3 dados estruturados (M3), 4 rastreamento e indexação (R1 a R5, www em R4 mais o passo do dono, canonical por rota em R1, sitemap em R2, 404 e 301 em R4), 5 banner (D8: já está no sistema novo, regerar só se o texto mudar), 6 visibilidade (mapa de palavras, canibalização, conteúdo que falta, links internos Q7, `/blog`, CWV Q4 a Q6, ações do dono), 7 copy e QA (Q2, Q3, Q8, Q9, lista do dono), 8 lotes (tabela de lotes).
- **Consistência de nomes:** `RouteMeta`, `ROUTE_METAS`, `routeMetaFor`, `structuredDataFor`, `renderSeoHead`, `applyHeadToTemplate`, `renderSitemap` aparecem iguais em todas as tasks.
- **Mudança concorrente em outro branch (lista de serviços e opção `servico` do formulário):** nenhum teste, texto ou JSON-LD deste plano nomeia um serviço nem fixa a quantidade; tudo deriva de `services` em `src/data/services.ts`. O plano não toca `serviceOptions` nem os arquivos protegidos do formulário.
- **Revisão de proporção:** o plano é maior que o pedido do dono porque cobre infraestrutura (build, nginx), conteúdo e passos fora do site; cada task tem arquivos, teste e aceite, e o código vem só como assinatura e como asserção. As Tasks Q2, Q3 e Q9 não dependem do Plano 3 e podem começar antes se houver vaga.
- **Pontos que o plano não resolve sozinho:** a frase final do `/blog` depende de conferir o `BlogPage`; a categoria do Google Business Profile e a regra de presença física dependem do dono; o redirect do `www` depende do painel do EasyPanel.
