# VN One v2 · Plano 3: Páginas internas, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir todas as páginas internas no sistema visual VN One, sobre a fundação e a home que já estão em `main` (commit `b439532`, o site no ar):
- `PageHero` e `CtaBand` compartilhados;
- `/servicos`, `/sobre`, `/projetos` e `/projetos/:slug`, `/contato`;
- `/privacidade` e `/lgpd` (layout editorial, texto jurídico intocado);
- `/blog` dentro do `SiteLayout`;
- 404.

**Architecture:**
- Cada página vira uma composição fina de seções em `src/sections/<página>/`, mais `PageHero` e `CtaBand` de `src/sections/shared/`. As seções já existentes da home (`MethodSteps`, `FaqSection`, `RoiSimulator`) são reusadas como estão, sem edição.
- Toda cópia nova mora em `src/data/*Copy.ts` (ou no módulo de labels que já existe), para o guarda `copy-rules.test.ts` ler.
- Todas as páginas continuam rotas `lazyWithRetry` em `src/App.tsx`. Só a `HomePage` é eager. `PageHero`, `CtaBand` e tudo de `src/sections/<página>/` só podem ser importados por páginas lazy, nunca pelo entry, pelo `SiteLayout`, pelo `Header` ou pelo `Footer`.
- Não entra dependência npm nova.
- O formulário de contato (canal de leads) é reusado intacto.

**Tech Stack:** React 19, Vite 6, Tailwind v4 (`@theme` em `src/styles/tokens.css`), motion 12 com `LazyMotion` strict (`m`, nunca `motion`), react-router 7, Radix (dialog, popover, slot), class-variance-authority, Vitest 3 + Testing Library + jsdom, Playwright 1.58 (projetos `desktop` e `mobile`), `@axe-core/playwright`, sharp.

**Spec:** `docs/superpowers/specs/2026-10-26-redesign-vn-one-design.md` (seção "Páginas internas" e "Sistema visual").
**Plano anterior:** `docs/superpowers/plans/2026-10-26-vn-one-v2-fundacao-home.md` (formato, granularidade e regras que este plano imita).
**Plano seguinte (fora deste):** Plano 4, copy final, SEO por página (OG por projeto já existe), sitemap `lastmod` e QA final.

---

## Estado real do código em 2026-11-01 (diverge do spec, vale o código)

O spec é de 26/10. Entre ele e `b439532` houve os lotes de correção (A a H6). Estes são os fatos que mudam o plano. Cada um foi conferido no código.

| Tema | Spec diz | Código hoje | O plano faz |
|---|---|---|---|
| `/projetos`, abas | "as abas atuais redesenhadas" | **Não há abas.** A página tem 2 cards grandes (`FeaturedProjectCard`: DizPara e Hub081) e 5 cards pequenos (`ProjectCard`), em `src/components/Projects.tsx`, com 3 screenshots reais por projeto (`src/data/projects.ts`, `shots`). `ProjectsPage.test.tsx` até afirma "has no tabs". | Redesenha os dois cards e a grade. Nada de abas. |
| `/projetos/:slug`, impacto | "impacto como frase de destaque, valores em texto" | **`projects.ts` não tem campo de impacto.** Tem `highlight` (só nos 2 destaques, uma frase curta) e `features` (só nos destaques). | A "frase de destaque" é o `highlight` dos 2 destaques, sem count-up. Os outros 5 projetos não têm frase: não se inventa uma. |
| Foto do fundador | `public/victor-photo.jpg` | A fonte está em `scripts/assets/victor-photo.jpg` (982x1024, fora do build). `public/victor-photo.webp` (288x300) é usado só por `About.tsx` e como arquivo de amostra em `src/test/nginx-config.test.ts`. | O script lê de `scripts/assets/`. O `.webp` antigo fica até a limpeza final (Task Z1). |
| Blog | "entra no SiteLayout" | `/blog` está **fora** do `SiteLayout` (rota própria `BlogRoute` em `App.tsx`, com `<main>`, skip link, botão "Voltar" e rodapé próprios, fundo `zinc-950`, brilhos roxo e ciano, texto em gradiente). Tem 40 testes de comportamento e de a11y. | Mantém todo o comportamento e a a11y, troca o visual, divide o arquivo de 696 linhas e move para dentro do `SiteLayout` na última task do lote (Task B6), separável. |
| Legais | "layout editorial" | `PrivacyPage.tsx` e `LgpdPage.tsx` são **byte idênticos** à cópia auditada e nenhum teste ou lote pode alterá-los. O texto cita Supabase e hash de IP, que o código não faz (item O-S1, bloqueador de lançamento). | Plano em duas vias. Via 1, sem aprovação: um `LegalFrame` que embrulha as páginas por fora (rota) e as reestiliza por CSS. Via 2, só com o ok do Victor: edição só de layout dos 2 arquivos. |
| `/contato` | simulador, formulário, FAQ | Usa `ROICalculator.tsx` (311 linhas, legado, com `.roi-slider*` e `p.tabular-nums`) e `Contact.tsx` com WhatsApp **hardcoded** e ícone verde fora da paleta. A home tem `RoiSimulator` novo com a mesma fórmula (`lib/roi.ts`). | A página passa a usar `RoiSimulator` e o número vem só de `lib/constants.ts`. O ROICalculator, o Contact e o FAQ legados saem. |
| Combos | desconto 10, 12, 15% | `combos` em `src/data/services.ts` tinha `desconto: '10% de desconto'` etc. Não eram verificados (item O-K11). | **Decisão do dono (Q3): os percentuais saem.** O lote S apagou o campo `desconto` do dado e do tipo, e o card de combo mostra só nome, composição e descrição. |
| CSS legado | Q-25 | `.roi-slider*` e `--roi-slider-*`, `glitch-1` e `glitch-2` (`index.css`), `.custom-scrollbar`. `dark:` é inerte (`@custom-variant dark`), e `--color-brand-white` é alias do creme. | Task Z1 remove `.roi-slider*` e os `glitch-*`. `.custom-scrollbar` **fica** (o `ServiceSelect`, parte do formulário, continua). O alias `--color-brand-white` e o `@custom-variant dark` ficam enquanto as duas páginas legais congeladas os usarem. |
| Guardas que o plano precisa respeitar | | `src/test/copy-rules.test.ts` (sem travessão, sem " / ", sem palavras de venda, imperativo informal, "a gente", sem a palavra proibida do produto antigo), `exportsPolicy.test.ts` (default export só onde há `lazy` ou `import()`), `motionUsage.test.ts` (só `m`), `tokenLiterals.test.ts` (tokens em vez de literais), `rawDashes.test.ts`, `lazyPages.test.tsx` (lista de preload igual aos `import()` da página), `repoHygiene.test.ts`, `bundleBudget.test.ts` | Cada task diz qual guarda toca. |
| Helpers de e2e que já existem | | `e2e/homeSupport.ts` exporta `walkPage`, `measureOverflow`, `measureSmallTargets`, `brokenWordsIn`, `countAccentBySection`, `enableLargeFont`, `ACCENT_RGB`, `MIN_TOUCH_PX`. `e2e/n8nGuard.ts` (`test` e `expect` que bloqueiam qualquer request ao n8n real) e `e2e/home.axe.spec.ts` (modelo do audit). | A Task A4 empacota isso num contrato por página. |

---

## Global Constraints (vinculantes, copiadas dos planos e do spec)

- **Sistema visual oficial:**
  - paleta única: `#FFFFFF` white, `#F2F2F2` cream, `#C7C7C7` gray-light, `#8A8A8A` gray-mid, `#4D4D4D` gray-dark, `#1A1A1A` ink, `#0A0A0A` black, acento `#00E5A0`, e `--vn-chrome` (`linear-gradient(135deg,#fff 0%,#c7c7c7 45%,#8a8a8a 100%)`) só para o texto cromado (`.vn-chrome-text`);
  - **no máximo 1 elemento em `#00E5A0` por seção**; como texto só sobre `#0A0A0A`; sobre fundo claro só como preenchimento de forma com texto preto; CTAs nunca em acento;
  - Space Grotesk 400, 500, 700 e JetBrains Mono 400, 500, self-hosted. Nenhuma outra família;
  - títulos (`Heading`) em minúsculas por CSS, `tracking -0.03em`, `line-height` 0.92 a 0.98. Kicker em mono caixa alta com a régua 64x3px (`Kicker`);
  - sem toggle de tema, **sem gradiente decorativo**, sem `dark:`, sem `italic`, sem famílias de cor fora da paleta (`emerald`, `purple`, `cyan`, `zinc` e afins), sem `text-[10px]` (usar a escala de texto dos tokens);
  - easing `--ease-out`. Animar só `transform`, `opacity`, `clip-path`, `filter`, `stroke-dashoffset`. Um `useInView` por container (`RevealGroup` e `RevealItem`), nunca `whileInView` por item.
- **Responsivo em qualquer aparelho:** mobile-first de 280px a 2560px, sem scroll horizontal e sem texto cortado. Conferido em **320, 390, 768, 1024 e 1440**, mais celular deitado 844x390 e fonte a 120% (`a11y-font-large`). `100dvh`, safe-area, alvos de toque de 44px, o que depende de hover tem equivalente por toque e foco.
- **Copy (modo humanizer):** voz "a gente", imperativo informal ("conta", "escolhe", "agenda"), títulos em minúsculas por CSS (o texto no DOM mantém a caixa). **Proibido** o travessão (U+2014), a meia-risca (U+2013) e " / " como separador. **Nunca** a palavra proibida do produto antigo (a VN One vende agentes de IA, e a opção do formulário é "Agente de IA"). Sem "não é X, é Y", sem tríade forçada, sem frase de efeito no fim, sem palavras de venda ("revolucionário", "potencialize", "transforma", "escala"). **Nunca inventar** número, cliente, resultado, prêmio ou preço. Texto novo vai como rascunho marcado no PR e o Victor revisa no chat antes do merge.
- **Lead channel (protegido, byte idêntico):** `src/lib/contact.ts`, `src/lib/phone.ts`, `src/components/contact/{useContactForm.ts, ContactConsent.tsx, ContactErrorAlert.tsx, whatsappInput.ts, pastedNumber.ts}` e `src/components/ContactForm.tsx`. Webhooks n8n, chaves do payload (`nome`, `email` ou `whatsapp`, `servico`, `mensagem`, `timestamp`) e o formato Evolution do telefone não mudam. POST direto do navegador, sem proxy. **Todo teste que monta o formulário usa `test` de `e2e/n8nGuard.ts` e intercepta com `page.route`, nunca toca o n8n real.** Nenhum teste envia o formulário de verdade.
- **WhatsApp oficial** `5581984451243` (exibido `(81) 98445-1243`) só via `src/lib/constants.ts` (`WHATSAPP_NUMBER`, `WHATSAPP_DISPLAY`, `whatsappUrl()`, `WHATSAPP_GREETING`, `CONTACT_EMAIL`). Nenhuma string `wa.me/...` nova.
- **Congelados (texto):** `src/pages/PrivacyPage.tsx` e `src/pages/LgpdPage.tsx`. Nenhum caractere muda sem o ok do Victor (Q1 abaixo). Os dois estão fora do guarda de copy de propósito.
- **Orçamento de bundle:** caminho crítico (entry mais modulepreloads) hoje **156,1 kB gzip**, teto aplicado **160 kB** (`npm run budget -- --enforce`). Nenhuma página nova pode entrar nesse caminho.
- **Portas:** nenhum agente usa a porta 3000. Cada implementador recebe do líder uma faixa de portas e usa `E2E_PORT` (o `playwright.config.ts` já lê) e `SKELETON_PORT`.
- Sem `console.log`. Imagens e arquivos de `public/` referenciados em TS passam por `assetUrl()` (`src/lib/asset.ts`). Glifos (setas, check) são ícones `lucide-react` ou SVG, nunca caractere no texto (as fontes da marca não têm).
- Commits convencionais, terminados com `Co-Authored-By: <modelo do implementador> <noreply@anthropic.com>`. Nunca commitar `.superpowers/`, `e2e/__shots__/`, `test-results/`, `playwright-report/`. Ninguém dá push em `main`.

## Contrato por página (vale para toda página deste plano)

Cada lote prova isto com `describePageContract` (Task A4) mais os testes unitários do próprio lote.

1. **Estrutura:** exatamente um `h1`, e ele é o primeiro título do DOM. Nenhum nível pulado (h1, h2, h3). Um único `main` (o do `SiteLayout`). Todo `section` com `aria-labelledby` aponta para um id que existe.
2. **Responsivo** em 320, 390, 768, 1024, 1440, 844x390 e fonte a 120% em 320 e 390: sem scroll horizontal, nada passando da borda direita (`measureOverflow`), nenhuma palavra quebrada no meio nos títulos (`brokenWordsIn`).
3. **Toque:** nenhum alvo de toque abaixo de 44x44 nos contextos `hasTouch` (`measureSmallTargets`).
4. **Contraste e acento:** só tokens da paleta. `countAccentBySection` devolve no máximo 1 por seção, ignorando os botões flutuantes. Texto cinza usa `vn-gray-dark` no claro e `vn-gray-light` no escuro (nunca `gray-mid` em texto pequeno).
5. **Foco:** anel visível (`vn-focus-ring` no escuro, `vn-focus-ring-ink` no claro) em todo controle. A ordem do Tab é a ordem visual. Nada fica atrás dos botões flutuantes (WhatsApp e acessibilidade) em 320 e 390.
6. **Movimento reduzido:** com `prefers-reduced-motion: reduce` e com "pausar animações" do widget, nada some em `opacity: 0`, nada troca sozinho, e o que anima tem versão estática. Respeitar `useMotionAllowed`.
7. **axe** (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) sem violação em 390 e 1440.
8. **Cabeça da página:** `<title>`, descrição e canonical pelo `SEO` (um de cada tag, como `e2e/seo-tags.spec.ts` cobra). Sem travessão. Páginas "não encontrado" usam `noindex`.
9. **Capturas** para olhar a olho: `e2e/__shots__/<página>-<largura>x<altura>.png` (gitignored). O lote anota o que viu no relatório.

## Review Focus

1. **Texto jurídico:** os 2 arquivos congelados continuam com o mesmo hash e o texto renderizado dentro do `LegalFrame` continua com o mesmo `textContent`. Testes: A5 e L2.
2. **Combo sem desconto:** o combo não tem campo de desconto, o card fica inteiro com os três campos que tem, e nenhum preço ou percentual aparece na página. Teste: S4 e o guarda de `data.test.ts`.
3. **Formulário:** na `/contato` o `ContactForm` é o mesmo componente, com `initialMessage` e `prefillNonce`. O hash de `ContactForm.tsx` e dos 7 arquivos do canal de leads não muda. Teste: A5.
4. **Fundador:** os textos "Sobre mim", "Minhas Especialidades", os dois parágrafos e as três especialidades ficam **idênticos** aos de `About.tsx` (teste com os literais antigos). Teste: U1.
5. **Redirects e noindex:** `REMOVED_PROJECT_SLUGS` ainda redireciona para `/projetos`. Slug inexistente mostra o 404 com `noindex`, sem canonical e sem JSON-LD. Teste: P6.
6. **Âncoras:** `/servicos#<slug>` (links do rodapé), `/sobre#metodo`, `/#contato`. O card de serviço fica abaixo do header (`scroll-mt-28`). Testes: S3 e `e2e/services-anchor.spec.ts`, que continua valendo sem edição.
7. **Blog:** nenhuma regressão de a11y (região de status única, `aria-disabled` no Atualizar, chips com `aria-pressed`, foco, novas abas com `noopener`). Teste: B7.
8. **Preload de testes:** se a `AboutPage` deixar de ter `import()` lazy, `src/test/lazyPages.ts` e `lazyPages.test.tsx` mudam junto, senão o guarda quebra. Task U7.

---

## Estrutura de arquivos

```
src/sections/shared/               (novo)  PageHero, CtaBand, splitLastWord, ServiceCard (extraído da home)
src/sections/services/             (novo)  ServicesGrid, ComboCards, ComboCard (o `ComboDiscount` previsto foi apagado em 14dff03)
src/sections/about/                (novo)  founderVoice.ts, FounderIntro, FounderPhoto, founderPhoto.ts, Specialties,
                                           CompanySection, ToolsGrid, toolMarks.tsx
src/sections/projects/             (novo)  BrowserShot, ProjectFacts, ProjectHighlight, NextProject, nextProjectOf.ts
src/sections/contact/              (novo)  ContactChannels, ContactFormSection
src/sections/blog/                 (novo)  BlogHero, BlogFilters, ArticleCard, FeaturedArticle, BlogSkeletons,
                                           blogCopy.ts, blogMeta.ts
src/pages/legal/                   (novo)  LegalFrame, legalToc.ts, useLegalToc.ts, legal.css, PrivacyRoute, LgpdRoute
src/data/                          (novo)  servicesCopy.ts, aboutCopy.ts, contactCopy.ts, tools.ts
src/components/layout/NotFoundFallback.tsx (novo)
src/hooks/useScramble.ts           (novo, extraído do NotFound)
scripts/process-founder-photo.mjs  (novo)  AVIF e WebP em 2 tamanhos
public/founder/                    (novo, gerado) victor-480.{avif,webp}, victor-960.{avif,webp}
e2e/pageContract.ts                (novo)  describePageContract
e2e/page-{servicos,sobre,projetos,projeto,contato,legal,blog,404}.spec.ts (novos)
src/test/frozenFiles.test.ts       (novo)  hash do canal de leads e das 2 páginas legais
src/test/pageHygiene.test.ts       (novo, Z2) guarda de visual legado
(remover ao fim) About.tsx, Skills.tsx, Contact.tsx, FAQ.tsx, ROICalculator.tsx, AnimatedText.tsx (se sem uso),
                 src/lib/reveal.ts, .roi-slider* e glitch-* do index.css
```

---

## Lotes, dono de cada arquivo, paralelismo e ordem de merge

Máximo de 4 implementadores ao mesmo tempo. Cada lote é um branch (`batch/p3-<letra>`) a partir de `plan/inner-pages` atualizado, na própria worktree, com a própria faixa de portas.

| Onda | Lote | Escopo | Arquivos que só ele toca |
|---|---|---|---|
| 0 (sozinho) | **A** fundação | PageHero, CtaBand, NotFoundFallback, contrato de e2e, guarda dos congelados, varredura de `src/pages` no guarda de copy | `src/sections/shared/{PageHero,CtaBand,splitLastWord}*`, `src/components/layout/NotFoundFallback*`, `e2e/pageContract*`, `src/test/frozenFiles.test.ts`, `src/test/copy-rules.test.ts` (corpo) |
| 1 (4 em paralelo) | **S** `/servicos` | grade, combos, FAQ, CtaBand | `src/pages/ServicesPage*`, `src/sections/services/**`, `src/sections/shared/ServiceCard*`, `src/sections/home/ServicesCards.tsx` (só o import), `src/data/{services.ts,servicesCopy.ts}`, `e2e/page-servicos.spec.ts` |
| 1 | **U** `/sobre` | fundador, foto, VN One, método, ferramentas | `src/pages/AboutPage*`, `src/components/{About,Skills}*` (remoção), `src/sections/about/**`, `src/data/{aboutCopy,tools}.ts`, `scripts/process-founder-photo.mjs`, `public/founder/**`, `package.json` (script), `src/test/lazyPages*`, `e2e/page-sobre.spec.ts` |
| 1 | **P** `/projetos` e detalhe | cards, grade, caso, próximo projeto | `src/pages/{ProjectsPage,ProjectDetailPage}*`, `src/components/{Projects,ProjectCard,FeaturedProjectCard,ProjectDetail,ProjectDetailGallery}*`, `src/components/projectLabels.ts`, `src/sections/projects/**`, `src/data/projects.ts`, `e2e/page-{projetos,projeto}.spec.ts` |
| 1 | **C** `/contato` | hero, canais, simulador, formulário, FAQ | `src/pages/ContactPage*`, `src/components/{Contact,FAQ,ROICalculator}*` (remoção), `src/sections/contact/**`, `src/data/contactCopy.ts`, `e2e/page-contato.spec.ts`, `e2e/legacy-roi-figures.spec.ts` (vira `contact-roi-figures.spec.ts`) |
| 2 (entra quando houver vaga, nunca passando de 4) | **N** 404 | glitch cromado, cursor, scramble extraído | `src/components/NotFound*`, `src/hooks/useScramble*`, `src/styles/motion.css`, `e2e/page-404.spec.ts` |
| 2 | **B** `/blog` | divisão, cards, filtros, `SiteLayout` | `src/components/BlogPage*`, `src/sections/blog/**`, `src/utils/newsService.ts` (só os `catch`), `src/App.tsx` (corpo), `e2e/{blog.spec.ts,page-blog.spec.ts}` |
| 2 | **L** legais | `LegalFrame`, sumário, CSS por descendente | `src/pages/legal/**`, `src/App.tsx` (só as 2 linhas dos imports lazy de `/privacidade` e `/lgpd`), `e2e/page-legal.spec.ts` |
| 3 (sozinho, por último) | **Z** fecha | remover legado, guarda de higiene, docs, esqueletos, gates | `src/index.css`, `src/lib/reveal.ts`, `src/test/pageHygiene.test.ts`, `README.md`, `docs/**`, `src/styles/skeleton.css` |

**Arquivos compartilhados e a regra de cada um**
- `src/test/copy-rules.test.ts`: o **A** reescreve a lista de arquivos varridos. Depois do merge do A, o **U** troca **uma** linha (`VOICE_OWNER_DECISION`: sai `About.tsx`, entra `src/sections/about/founderVoice.ts`) e o **P** troca **uma** linha (sai `src/data/projects.ts` de `SALES_WORDS_EXEMPT`). Cada um só faz isso, como último commit, depois de rebasear.
- `src/App.tsx`: dono é o **B**. O **L** só troca as linhas dos dois `lazyWithRetry` das páginas legais, como último commit depois do merge do B.
- `src/index.css`: só o **Z**. Nenhum outro lote edita esse arquivo. O CSS novo das páginas fica em arquivo próprio (`legal.css`) importado pelo componente, ou em `motion.css` (só o N).
- `e2e/homeSupport.ts` e `e2e/n8nGuard.ts`: somente leitura para todos. O A só importa deles.
- `src/sections/home/**`: só o S toca `ServicesCards.tsx`, e só para importar o `ServiceCard` extraído. Se isso mexer na altura, o Z regenera os esqueletos.

**Ordem de merge** (um por vez, `--no-ff`, depois de rodar `npm run lint`, `npm test`, `npm run build` no branch rebaseado):
**A, S, U, P, C, N, B, L, Z.**
Motivo: o A é pré-requisito de todos. S, U, P, C não dividem arquivo (só as duas linhas do `copy-rules`). N vem antes do B porque ambos mexem no `App.tsx` de lados diferentes e o N não mexe nele. O B vem antes do L pelo `App.tsx`. O Z fecha porque só ele pode remover o legado depois que ninguém mais o usa.

**Fluxo de revisão por lote:** o implementador entrega relatório. O líder dispara em paralelo, sobre um snapshot do diff, o `code-reviewer`, o `react-reviewer`, o `a11y-architect` e, no lote C e no L, o `security-reviewer`. Depois, uma revisão de fechamento dedicada confere item por item que cada achado foi corrigido, inclusive os Minor. Nada fica adiado. Achados viram um lote de correção no mesmo branch.

---

## Batch A: fundação (serial, primeiro)

### Task A1: `splitLastWord` e `PageHero`

**Files:**
- Create: `src/sections/shared/splitLastWord.ts`, `src/sections/shared/splitLastWord.test.ts`, `src/sections/shared/PageHero.tsx`, `src/sections/shared/PageHero.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // splitLastWord.ts
  export function splitLastWord(text: string): { head: string; last: string }; // 'a b c' -> {head:'a b ', last:'c'}; 'a' -> {head:'', last:'a'}
  // PageHero.tsx
  interface PageHeroProps {
    kicker: string;
    title: string;            // o h1; o CSS põe em minúsculas
    lead?: string;
    hasCursor?: boolean;      // cursor piscando depois da última palavra, sempre em tinta (hero claro nunca usa acento)
    children?: ReactNode;     // depois do lead: ações, parágrafos
    aside?: ReactNode;        // segunda coluna a partir de lg (foto, canais de contato)
    id?: string;
  }
  export function PageHero(props: PageHeroProps): JSX.Element;
  ```
- Consumes: `Section`, `Container`, `Kicker`, `Heading`, `Cursor`, `ScanGrid`, e as constantes `HEADER_TOP_OFFSET`, `HEADER_HEIGHT`, `HEADER_HEIGHT_LANDSCAPE`, `HEADER_LANDSCAPE_LIFT` de `src/components/layout/headerMetrics.ts`.

**Design:**
- Faixa `cream` plana (sem o cartão inset da home, que é a assinatura da capa), `ScanGrid` claro atrás, borda inferior de 1px `vn-gray-light`.
- Topo = `calc(header + respiro)`, com as mesmas variáveis do `HeroSection` (`--hero-top` e `--hero-top-landscape`, copiadas e não refatoradas: o `HeroSection` fica fechado, 6 linhas de duplicação são o preço de não mexer na capa e nos esqueletos).
- Coluna única; a partir de `lg`, duas colunas (`minmax(0,7fr)` e `minmax(0,5fr)`) quando há `aside`.
- `h1` com `Heading as="h1" size="xl"`, palavras com hífen sem quebra (`whitespace-nowrap`), `break-words` já vem do `Heading`. O `Section` fica `aria-labelledby` do id do h1.

- [ ] **Step 1 (RED):** `splitLastWord.test.ts` (uma palavra, várias, espaços de borda, texto vazio) e `PageHero.test.tsx` (render com `renderWithProviders`):
  - um `h1` com o texto de `title`, `section` com `aria-labelledby` igual ao id do h1;
  - kicker, lead, children e aside renderizados; sem `aside` não existe a segunda coluna;
  - `hasCursor` põe `.vn-cursor` com `aria-hidden`, classe `bg-vn-ink`, e **nenhuma** classe `vn-accent` no HTML da seção;
  - o estilo inline tem as duas variáveis do topo;
  - título com hífen ("Link-in-Bio") renderiza a palavra dentro de um `span.whitespace-nowrap`.
- [ ] **Step 2:** `npx vitest run src/sections/shared`. Esperado: FAIL (módulos não existem).
- [ ] **Step 3 (GREEN):** implementar. **Step 4 (refactor):** funções com menos de 50 linhas, sem `useMemo` desnecessário.
- [ ] **Step 5:** `npm run lint`, `npm test`. Commit: `feat: PageHero for the inner pages`.

### Task A2: `CtaBand`

**Files:** Create: `src/sections/shared/CtaBand.tsx`, `src/sections/shared/CtaBand.test.tsx`

**Interfaces:**
```ts
interface CtaBandProps {
  heading: string;                       // h2; a última palavra leva o cursor em acento
  body: string;
  cta: { label: string; to: string };    // botão primário (branco no escuro), react-router Link
  whatsappMessage?: string;              // se vier, aparece o botão secundário de WhatsApp (nova aba, NewTabHint)
  id?: string;
}
export function CtaBand(props: CtaBandProps): JSX.Element;
```
- Seção `black`, `ScanGrid tone="dark" keepContentClear`, `Container`, sem kicker, só o `h2` `Heading size="xl"` com a técnica do `FinalCta` (última palavra mais cursor num `span.whitespace-nowrap`; o ajuste de largura por `cqi` para o termo mais longo caber em 280px).
- O cursor em acento é **o único** acento da faixa. O WhatsApp usa `whatsappUrl(whatsappMessage)` de `constants`.

- [ ] **Step 1 (RED):** testes: `h2` nomeado, `section` `aria-labelledby`; o link primário tem `href` igual a `cta.to`; com `whatsappMessage` o link começa em `https://wa.me/5581984451243?text=`, tem `target="_blank"`, `rel="noopener noreferrer"` e `aria-describedby` do `NewTabHint`; sem `whatsappMessage` o botão não existe; exatamente um elemento com `bg-vn-accent` na seção.
- [ ] **Step 2 a 5:** RED, GREEN, refactor, lint e testes. Commit: `feat: CtaBand closing band for the inner pages`.

### Task A3: `NotFoundFallback`

**Files:** Create: `src/components/layout/NotFoundFallback.tsx`, `src/components/layout/NotFoundFallback.test.tsx`

- Hoje há uma cópia local em `ProjectDetailPage.tsx` (`bg-zinc-950`, `min-h-screen`). O novo componente tem `role="status"`, `aria-label={shellCopy.pageLoading}`, fundo `bg-vn-black`, `min-h-dvh` (igual ao que o novo 404 vai ter, para o rodapé e o fundo não pularem) e o mesmo spinner sem movimento sob `motion-safe`. O lote P passa a importar este componente.
- [ ] **Step 1 (RED):** teste: `getByRole('status')` com o nome de `shellCopy.pageLoading`, classes `bg-vn-black` e `min-h-dvh`, nenhum `zinc`. **Step 2 a 5:** GREEN e commit `feat: NotFoundFallback on the brand black`.

### Task A4: contrato de e2e por página

**Files:** Create: `e2e/pageContract.ts`, `e2e/pageContract.home.spec.ts`

**Interfaces:**
```ts
export interface PageContract {
  path: string;                     // '/servicos'
  title: RegExp;                    // do <title>
  h1: string | RegExp;
  readyHeading: string | RegExp;    // um heading de nível 2 que só existe com a página pronta
  hasContactForm?: boolean;         // usa o test de n8nGuard e espera form[name="contact"]
  hasFloatingClearance?: boolean;   // confere o recuo dos botões flutuantes em 320 e 390
}
export function describePageContract(contract: PageContract): void; // registra os testes do contrato
export async function openPage(page: Page, contract: PageContract): Promise<void>; // goto, espera o heading, walkPage
```
- Reaproveita de `homeSupport.ts`: `walkPage`, `measureOverflow`, `measureSmallTargets`, `brokenWordsIn`, `countAccentBySection`, `enableLargeFont`, `MIN_TOUCH_PX`. O `test` e o `expect` vêm de `./n8nGuard`.
- Registra, por página, os itens 1 a 7 e 9 do "Contrato por página":
  - um teste por largura de `[320, 390, 768, 1024, 1440]` mais o celular deitado, com `viewport` e `hasTouch` definidos pelo próprio teste (só no projeto `desktop`, igual a `devices.spec.ts`);
  - fonte a 120% em 320 e 390;
  - `emulateMedia({ reducedMotion: 'reduce' })` mais a opção "pausar animações" ligada pelo `localStorage` (`A11Y_STORAGE_KEY`), sem nenhum elemento com `opacity` calculada 0 depois do `walkPage`;
  - axe em 390 e 1440;
  - capturas em `e2e/__shots__/`.
- O recuo dos botões flutuantes lê a medição que `e2e/floating-layout.spec.ts` já faz (ler o arquivo, copiar a medição para uma função exportada do contrato; **não editar** o spec existente).

- [ ] **Step 1 (RED):** `pageContract.home.spec.ts` chama `describePageContract` na própria home (página que já cumpre tudo): `{ path: '/', h1: /sua equipe perde/i, hasContactForm: true, readyHeading: homeCopy.faq.heading }`. Sem o `pageContract.ts` o spec não compila.
- [ ] **Step 2:** implementar o helper. **Step 3 (GREEN):** `E2E_PORT=<faixa> npx playwright test e2e/pageContract.home.spec.ts --project=desktop`. Esperado: tudo PASS na home. Se algum item falhar na home, o helper está errado (a home é a referência), corrigir o helper, não a home.
- [ ] **Step 4:** Commit: `test: per page contract for the inner pages (overflow, touch, accent, axe, reduced motion)`.

### Task A5: guarda dos arquivos congelados e varredura de `src/pages`

**Files:** Create: `src/test/frozenFiles.test.ts`. Modify: `src/test/copy-rules.test.ts` (corpo).

**frozenFiles.test.ts** (`// @vitest-environment node`) lê cada arquivo, normaliza `\r\n` para `\n` e compara o SHA-256, em hexadecimal (primeiros 16 caracteres) com as constantes medidas em `b439532`:

| Arquivo | SHA-256 (16 primeiros) |
|---|---|
| `src/lib/contact.ts` | `7224769b2ca5959f` |
| `src/lib/phone.ts` | `15c48e7d4a563a7a` |
| `src/components/contact/useContactForm.ts` | `249f1613a2809e1c` |
| `src/components/contact/ContactConsent.tsx` | `a56d78cab2dc0b7f` |
| `src/components/contact/ContactErrorAlert.tsx` | `65e6dd3d2be81df8` |
| `src/components/contact/whatsappInput.ts` | `bbfe1b0be288632b` |
| `src/components/contact/pastedNumber.ts` | `7b121f203f9e9332` |
| `src/components/ContactForm.tsx` | `2baa7af3fbbf4445` |
| `src/pages/PrivacyPage.tsx` | `d83e3625c5d67024` |
| `src/pages/LgpdPage.tsx` | `4f27f8c5b4959bca` |

A mensagem de falha diz "arquivo congelado: precisa do ok do Victor para mudar (ver Q1 e Q2 do plano 3)". Se o Victor aprovar a Via 2 dos legais (Task L5), o hash dos dois arquivos legais é atualizado de propósito, naquela task.

**copy-rules.test.ts:** trocar a lista manual de páginas por varredura do diretório `src/pages` inteiro (e `src/sections` já é varrido), com `FROZEN_LEGAL_PAGES = new Set(['src/pages/PrivacyPage.tsx', 'src/pages/LgpdPage.tsx'])` fora da varredura. O teste "scans the files it is supposed to guard" continua afirmando que os dois legais **não** são varridos e passa a afirmar que `src/pages/ServicesPage.tsx`, `AboutPage.tsx`, `ContactPage.tsx`, `ProjectsPage.tsx` e `ProjectDetailPage.tsx` são.

- [ ] **Step 1 (RED):** escrever `frozenFiles.test.ts` com um hash errado de propósito num arquivo, ver FAIL, corrigir para o valor da tabela e ver PASS (prova que o teste lê o arquivo certo).
- [ ] **Step 2 (RED):** no `copy-rules`, mudar a varredura; rodar `npx vitest run src/test/copy-rules.test.ts`. Se aparecer texto novo varrido que viole a regra (arquivos de `src/pages` que ainda não eram varridos, como `HomePage.tsx` já era, `PrivacyPage` e `LgpdPage` ficam de fora), corrigir **só** no arquivo dono; se for de um lote futuro, manter o arquivo na lista antiga até o lote dele (comentário no teste com o nome do lote).
- [ ] **Step 3:** `npm test` inteiro. Commit: `test: frozen file hashes and a directory scan of src/pages in the copy rules`.

---

## Batch S: `/servicos`

**Copy desta página** (arquivo `src/data/servicesCopy.ts`; as frases marcadas "existente" já estão no ar e já passaram pelo humanizer; as "rascunho" o Victor revisa no chat):
- PageHero: kicker `O que a gente entrega` (existente), título `Serviços` (existente), lead `Escopo claro e prazo definido, do primeiro fluxo automatizado ao sistema completo.` (existente).
- Combos: kicker `Pacotes` (rascunho; o texto antigo "Pacotes com desconto" prometia desconto, e os percentuais saíram), h2 `Combos` (existente), nota de composição em mono (o `composicao` do dado).
- CtaBand: heading `Não sabe por onde começar?`, body `Na consulta gratuita a gente identifica qual serviço resolve o seu gargalo, sem compromisso.`, cta `Agenda uma consulta gratuita` para `/contato`, `whatsappMessage` `Olá! Vim pelo site da VN One e quero ajuda para escolher um serviço.` (rascunho). Todas existentes, menos o WhatsApp.
- FAQ: `FaqSection` da home, sem edição (cópia da home).

### Task S1: `servicesCopy.ts`
**Files:** Create: `src/data/servicesCopy.ts`, `src/data/servicesCopy.test.ts`
- [ ] **Step 1 (RED):** teste: nenhum valor tem os caracteres U+2013 ou U+2014 (o teste monta a regex com `String.fromCharCode`), nenhum `R$`, nenhum `\d+\s*%`, nenhuma palavra do `SALES_WORDS`; `kicker` do combo não contém "desconto". **Step 2 a 4:** GREEN e commit `feat: services page copy module`.

### Task S2: extrair `ServiceCard` da home

**Files:** Create: `src/sections/shared/ServiceCard.tsx`, `src/sections/shared/ServiceCard.test.tsx`. Modify: `src/sections/home/ServicesCards.tsx` (remove o componente local e importa o novo).

**Interfaces:**
```ts
interface ServiceCardProps {
  service: Service;
  headingAs?: 'h2' | 'h3';        // padrão 'h3' (home); a /servicos usa 'h2'
  anchorId?: string;              // vira o id do article, com scroll-mt-28
}
export function ServiceCard(props: ServiceCardProps): JSX.Element;
```
- É uma extração sem mudança de comportamento: o markup (subgrid de 5 linhas, `SpotlightCard`, lista `vn-card-includes`, prazo com `Clock` e o rótulo `sr-only` "Prazo estimado") sai idêntico quando `headingAs` e `anchorId` não são passados. As constantes de classe vão junto (`ARTICLE_CLASSES`, `SURFACE_CLASSES`, `SUBGRID_CLASSES`).
- [ ] **Step 1 (RED):** `ServiceCard.test.tsx`: renderiza nome em `h3` por padrão e em `h2` com `headingAs="h2"`; `article` com `aria-labelledby` do heading; `anchorId` vira `id` e a classe `scroll-mt-28`; lista com `role="list"`; prazo visível e rótulo `sr-only`.
- [ ] **Step 2:** FAIL. **Step 3 (GREEN):** mover o código. **Step 4:** rodar **sem editar** `ServicesCards.layout.test.tsx`, `sections.services.test.tsx`, `sections.services.fallback.test.tsx`: têm que passar iguais (prova de comportamento idêntico).
- [ ] **Step 5:** commit `refactor: share the service card between the home and the services page`. (Se a altura da seção da home mudar, o Z regenera os esqueletos.)

### Task S3: `ServicesGrid`
**Files:** Create: `src/sections/services/ServicesGrid.tsx`, `ServicesGrid.test.tsx`
- Seção `white`, `RevealGroup` único, grade `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` com os 6 `ServiceCard` (`headingAs="h2"`, `anchorId={service.slug}`), na ordem de `services`. Sem h2 de seção: o h1 do `PageHero` vem direto antes e cada card é um h2 (mantém "h1, h2" sem pular nível). A seção é `aria-label` com o texto do `kicker` (não há heading próprio).
- [ ] **Step 1 (RED):** teste: 6 cards na ordem do dado, `document.getElementById(slug)` existe com `scroll-mt-28`, cada card tem `h2` com o nome, cada prazo aparece, nenhum `R$` no texto, a lista de cada card tem os itens do dado. **Step 2 a 4:** GREEN. Commit `feat: services grid`.

### Task S4: `ComboCards` sem desconto
**Files:** Create: `src/sections/services/{ComboCards,ComboCard}.tsx` e `ComboCards.test.tsx`. Modify: `src/data/services.ts` (o campo `desconto` e os três valores saem; `ServiceCombo` passa a ser exportado).

> **Como ficou (decisão do dono, Q3):** o plano previa `desconto?: string` opcional e um `ComboDiscount({ text })` que desenhava a pílula. O dono decidiu que os percentuais (10, 12 e 15%) saem, então a task foi feita em duas etapas: e21b64e fez o campo opcional e o card sem lacuna, e 14dff03 apagou o caminho morto (o campo `desconto` e o `ComboDiscount`, que só renderizavam em teste). Para trazer um desconto verificado de volta: adicionar o campo em `ServiceCombo`, desenhá-lo no `ComboCard` e editar o guarda de `data.test.ts` que mantém todo combo sem ele. Os itens abaixo descrevem o desenho original e ficam como histórico.

- `ComboCards`: seção `black`, `ScanGrid dark`, kicker, h2 `Combos` com `Cursor tone="accent"` (o **único** acento da seção), 3 `ComboCard`. Cada card é `SpotlightCard tone="dark"` com `h3` do `nome`, `composicao` em mono caixa alta (`gray-light`), `descricao`, e (no desenho original) o `ComboDiscount`.
- `ComboDiscount({ text })` é o **único** ponto onde o desconto aparece: uma pílula de contorno (não é acento) com o texto do dado. Sem `desconto` no dado, nada é renderizado e o card não deixa lacuna. Remover os descontos do site inteiro = apagar o campo `desconto` das 3 linhas de `services.ts`. Nenhum percentual, preço ou "economize" no código do componente.
- [ ] **Step 1 (RED):** teste com o dado real e com um dado sem `desconto`: o card sai igual, sem pílula e sem espaço vazio; com dado, a pílula traz exatamente o texto do dado; `ComboDiscount` é o único arquivo que cita `desconto` (teste lê o diretório); `%` e `R$` só aparecem se estiverem no dado.
- [ ] **Step 2 a 4:** GREEN. `npx vitest run src/data src/sections/services`. Commit `feat: combo cards with a removable discount`.

### Task S5: compor `ServicesPage` e retirar o legado
**Files:** Modify: `src/pages/ServicesPage.tsx` (reescrita), `src/pages/ServicesPage.test.tsx` (reescrita). Create: `e2e/page-servicos.spec.ts`.

- Ordem: `SEO` (mesmos título "Serviços" e descrição de hoje), `useScrollToHash()`, `PageHero`, `ServicesGrid` (white), `ComboCards` (black), `FaqSection` (já é `white`) e `CtaBand`. Os tons ficam hero cream, grade white, combos black, FAQ white, CtaBand black.
- Reescrever o teste da página mantendo as garantias de hoje: scroll para o hash com `{ focus: 'heading' }`, sem scroll sem hash, ids e `scroll-mt-28`, prazo visível, "a gente" e nenhum preço, convite no imperativo informal, contraste das classes (só tokens `vn-gray-dark`), e acrescentar: um h1, cards em h2, nada de `italic`, `dark:` ou `zinc`.
- `e2e/page-servicos.spec.ts`: `describePageContract({ path: '/servicos', title: /^Serviços/, h1: 'Serviços', readyHeading: 'Combos', hasContactForm: false, hasFloatingClearance: true })`, e um caso que abre `/servicos#sistema-web-sob-medida` e confere o card abaixo do header. `e2e/services-anchor.spec.ts` continua rodando sem edição.
- [ ] **Step 1 (RED):** reescrever o teste unitário. **Step 2:** FAIL. **Step 3 (GREEN):** a página. **Step 4:** `npm run lint && npm test && E2E_PORT=<faixa> npx playwright test e2e/page-servicos.spec.ts e2e/services-anchor.spec.ts`. **Step 5:** olhar as capturas 320, 390, 768, 1024, 1440. **Step 6:** commit `feat: rebuild /servicos in the VN One system`.

---

## Batch U: `/sobre`

**Texto do fundador, fixo e idêntico ao de `About.tsx`** (o dono aprovou; nada disso é reescrito):
- h1 `Sobre mim`, linha em mono `Recife e remoto`.
- Parágrafo 1: `Especialista em montar fluxos` + destaque `automatizados e inteligentes` + `, sem precisar de equipes grandes.`
- Parágrafo 2: `Foco em` + destaque `Inteligência Artificial e Desenvolvimento Web` + `, para a operação gastar menos tempo com tarefa manual.`
- Botão `Baixa o currículo` (`/cv/cv-joao-victor-nogueira.pdf`, download `CV-Joao-Victor-Nogueira.pdf`, nova aba com `NewTabHint`).
- h2 `Minhas Especialidades` com: `01 Automação de Processos: Fluxos automáticos que tiram o retrabalho da rotina.`, `02 Inteligência Artificial: LLMs e agentes inteligentes integrados às operações do negócio.`, `03 Desenvolvimento Web: Interfaces rápidas, feitas para o visitante virar contato.`

### Task U1: `founderVoice.ts` e o guarda de voz
**Files:** Create: `src/sections/about/founderVoice.ts`, `src/sections/about/founderVoice.test.ts`. Modify: `src/test/copy-rules.test.ts` (**uma linha**: em `VOICE_OWNER_DECISION`, `src/components/About.tsx` vira `src/sections/about/founderVoice.ts`; a troca só entra no commit que apaga `About.tsx`, Task U7).

**Interfaces:**
```ts
export type FounderSegment = { text: string; isStrong?: boolean };
export const founderVoice: {
  title: 'Sobre mim'; place: 'Recife e remoto';
  paragraphs: readonly (readonly FounderSegment[])[];
  cvLabel: 'Baixa o currículo'; cvUrlPath: '/cv/cv-joao-victor-nogueira.pdf'; cvFileName: 'CV-Joao-Victor-Nogueira.pdf';
  specialtiesTitle: 'Minhas Especialidades';
  specialties: readonly { id: '01' | '02' | '03'; title: string; desc: string }[];
};
```
- [ ] **Step 1 (RED):** o teste traz os **literais antigos copiados de `About.tsx` em `b439532`** e compara com `founderVoice` (parágrafos juntando os segmentos, títulos, descrições, ids). Esse é o guarda de "o texto aprovado não mudou".
- [ ] **Step 2 a 4:** GREEN, `npx vitest run src/sections/about src/test/copy-rules.test.ts`. Commit `feat: founder voice module, verbatim from the approved About text`.

### Task U2: foto do fundador em AVIF e WebP, 2 tamanhos
**Files:** Create: `scripts/process-founder-photo.mjs`, `scripts/process-founder-photo.d.mts`, `src/sections/about/founderPhoto.ts`, `src/sections/about/founderPhoto.assets.test.ts`. Generate: `public/founder/victor-480.avif`, `victor-480.webp`, `victor-960.avif`, `victor-960.webp`. Modify: `package.json` (`"founder-photo": "node scripts/process-founder-photo.mjs"`).

**Interfaces:**
```ts
// founderPhoto.ts
export const FOUNDER_PHOTO = {
  width: 960, height: 1001,                 // a proporção da fonte 982x1024
  sizes: [480, 960] as const,
  avifSrcSet: string, webpSrcSet: string,   // '/founder/victor-480.avif 480w, ...' via assetUrl()
  fallbackSrc: string,                      // o webp de 960
  alt: 'Victor Nogueira',
} as const;
```
- O script lê `scripts/assets/victor-photo.jpg` (982x1024), não amplia (960 e 480 são menores que 982), `sharp().resize({ width })`, AVIF `quality 55` e WebP `quality 78`. Exporta uma função pura `founderPhotoPlan()` (lista de `{ width, format, file }`) que o teste lê.
- [ ] **Step 1 (RED, `@vitest-environment node`):** `founderPhoto.assets.test.ts` espelha `Logo.assets.test.ts`: os 4 arquivos existem, `sharp().metadata()` confere largura 480 e 960 e a altura proporcional, formatos `heif` (AVIF) e `webp`, tamanho de `-480` ≤ 45 kB e de `-960` ≤ 140 kB, `founderPhotoPlan()` lista exatamente esses 4 arquivos.
- [ ] **Step 2:** FAIL. **Step 3:** `npm run founder-photo`, anotar os tamanhos. **Step 4 (GREEN).** Olhar a imagem gerada (rosto inteiro, sem corte). **Step 5:** commit `feat: founder photo in AVIF and WebP at two sizes`.

### Task U3: `FounderPhoto`
**Files:** Create: `src/sections/about/FounderPhoto.tsx`, `FounderPhoto.test.tsx`
- `<figure>` com `<picture>`: `<source type="image/avif" srcSet sizes>` e `<img>` WebP com `width`, `height`, `alt`, `decoding="async"`, `fetchPriority="high"` e `loading="eager"` (é a imagem da primeira dobra de `/sobre` em `lg`). Moldura: `rounded-card`, borda `vn-gray-light`, fundo `vn-white`, padding de 8px, a imagem com o raio interno, e a régua de 3px em `vn-ink` embaixo (a assinatura dos cards do método). Legenda `figcaption` em mono: `Victor Nogueira, fundador da VN One` (rascunho, fato do spec).
- Sem filtro de cor e sem efeito de hover (o antigo `grayscale hover:grayscale-0` não existe em toque).
- [ ] **Step 1 (RED):** teste: `picture` com `source[type="image/avif"]` e `img` com `width` e `height` do `FOUNDER_PHOTO`; `figcaption` presente; `alt` igual a "Victor Nogueira"; sem classe `grayscale`. **Step 2 a 4:** GREEN. Commit `feat: framed founder photo`.

### Task U4: `FounderIntro`, `Specialties`
**Files:** Create: `src/sections/about/{FounderIntro,Specialties}.tsx` e testes. 
- `FounderIntro` usa `PageHero` (kicker = `place`, title = `Sobre mim`, `aside` = `FounderPhoto`, children = os dois parágrafos com os destaques em `font-medium text-vn-ink` e o botão do currículo). Botão: `Button asChild intent="secondary"` com `<a href download target="_blank" rel="noopener noreferrer" aria-describedby={hintId}>` e o ícone `Download` (lucide), mais `NewTabHint`. No celular a foto vem **depois** do texto (a ordem do DOM é texto, foto).
- `Specialties`: seção `cream`, h2 `Minhas Especialidades`, lista `ol` com `role="list"`, cada item com número `01` a `03` em mono (`aria-hidden`, a lista já diz "1 de 3"), `h3` do título, descrição e ícone lucide em tinta (`Workflow`, `BrainCircuit`, `Globe`), sem cor por item. Cartão `SpotlightCard`.
- [ ] **Step 1 (RED):** testes portando as garantias de `About.test.tsx` e `About.cv.test.tsx`: o link do currículo tem `aria-describedby` de um hint "abre em nova aba" sem mudar o nome do link; h1 é "Sobre mim" e as especialidades ficam em h2 e h3; "Recife e remoto" presente; cada especialidade termina em ponto; nenhum cinza `zinc` e nenhum `italic`. **Step 2 a 4:** GREEN. Commit `feat: founder intro and specialties on the new system`.

### Task U5: `CompanySection` (o que é a VN One)
**Files:** Create: `src/data/aboutCopy.ts`, `src/data/aboutCopy.test.ts`, `src/sections/about/CompanySection.tsx` e `CompanySection.test.tsx`
- Seção `white`, h2 `A VN One` (rascunho), duas colunas a partir de `lg`. Esquerda: parágrafo "o que é", feito só de fatos já públicos do site (`SITE.description`: automatiza o trabalho repetitivo com IA, conecta as ferramentas, conversa de 30 minutos sem compromisso). Direita: 3 linhas "como a gente trabalha" reusando literalmente o que já está em `process.ts` e `faqs.ts` (ciclos semanais, entregas parciais para você validar, documentação e monitoramento). **Nenhum número novo.** A VN One vende agentes de IA, e a palavra proibida do produto antigo não aparece.
- Todo o texto vai em `aboutCopy.ts` com um comentário "rascunho, revisão do Victor pendente". O teste lê o módulo e confere: sem dash, sem `R$`, sem número que não esteja em `SITE`, `processSteps` ou `faqs` (lista fechada de números permitidos: 30, 1, 2).
- [ ] **Step 1 a 4:** RED, GREEN. Commit `feat: what VN One is, on the about page`.

### Task U6: ferramentas, sem editar a lista
**Files:** Create: `src/data/tools.ts`, `src/data/tools.test.ts`, `src/sections/about/{ToolsGrid.tsx,toolMarks.tsx}` e `ToolsGrid.test.tsx`

- `tools.ts` copia **literalmente** de `Skills.tsx`: 3 categorias e 12 ferramentas, nesta ordem.
  - `Automação & IA` ("Fluxos automáticos e agentes de IA."): Automação de Fluxos, Make, Zapier, Python.
  - `Desenvolvimento Frontend` ("Interfaces rápidas e com boa interação."): React, TypeScript, Tailwind CSS, Vue 3.
  - `Backend & Cloud` ("Serviços estáveis e infraestrutura para crescer com o uso."): Node.js, Docker, Google Cloud, Supabase.
  - **O que está listado não muda.** Qualquer acréscimo ou retirada é decisão do dono (Q6).
- `toolMarks.tsx`: os mesmos ícones de hoje (lucide `Zap`, `Code2`, `Terminal`, `Database` e os SVGs inline de Make, Zapier, Python, Tailwind, Vue, Docker, Google Cloud, Supabase) **em um traço só, `currentColor`**. Vue e Google Cloud têm 2 e 4 cores fixas hoje: o implementador reduz a um tom (o segundo caminho com `opacity` .6) e confere olhando.
- `ToolsGrid`: seção `cream`, kicker, h2 `Stack tecnológica` (existente), lead `Da automação de fluxos às interfaces rápidas.` (existente), um bloco por categoria (h3 com o título, descrição) e uma grade de células com borda (`border border-vn-gray-light`, como a `ClientGrid` da home), ícone e nome. Sem marquee (12 itens cabem em grade e não precisam de pausa, WCAG 2.2.2). Sem hover obrigatório.
- [ ] **Step 1 (RED):** `tools.test.ts` com os 12 nomes e os 3 títulos como literais (o guarda de "a lista não mudou") e `ToolsGrid.test.tsx` (h2 uma vez, h3 por categoria, 12 itens, ícones `aria-hidden`, nenhuma cor inline `#`, nenhum `dark:`). **Step 2 a 4:** GREEN. Commit `feat: tools grid from the existing list`.

### Task U7: compor `AboutPage`, remover `About` e `Skills`
**Files:** Modify: `src/pages/AboutPage.tsx` (reescrita), `src/pages/AboutPage*.test.tsx`, `src/test/lazyPages.ts` e `src/test/lazyPages.test.tsx`, `src/test/copy-rules.test.ts` (a linha do U1). Delete: `src/components/About.tsx`, `About.test.tsx`, `About.cv.test.tsx`, `Skills.tsx`, `Skills.test.tsx`. Create: `e2e/page-sobre.spec.ts`.

- Ordem: `SEO` (descrição atual), `useScrollToHash()`, `FounderIntro` (cream), `CompanySection` (white), `Specialties` (cream), `MethodSteps` (white, `id="metodo"`, importado estático: a página já é um chunk lazy), `ToolsGrid` (cream), `CtaBand`.
- CtaBand: heading `Pronto para automatizar?`, body `Uma conversa de 30 minutos para mapear onde a automação mais ajuda no seu negócio.`, cta `Vamos conversar` para `/contato` (as três já existem).
- A `AboutPage` deixa de ter `import()` lazy. Então `preloadAboutSections` e o teste "preloads the lazy chunk of AboutPage" mudam juntos: a lista de preload passa a ser vazia e o teste afirma "AboutPage não tem import lazy". Se o implementador preferir manter `ToolsGrid` lazy, mantém lista e teste coerentes. O guarda é a igualdade, não a presença.
- `AboutPage.test.tsx`: manter "um h1, Sobre mim", "nunca pula nível de título", "o CTA aponta para /contato", "`#metodo` rola até o método", "sem hash não rola". `AboutPage.anchor.test.tsx` e `AboutPage.lazyRetry.test.tsx`: o primeiro continua, o segundo sai (não há mais chunk interno).
- `e2e/page-sobre.spec.ts`: `describePageContract({ path: '/sobre', h1: 'Sobre mim', readyHeading: 'Stack tecnológica', hasFloatingClearance: true })`, mais um caso que abre `/sobre#metodo`, e um caso que confere que a foto tem `naturalWidth` > 0 e que o `source` AVIF foi oferecido (`img.currentSrc` termina em `.avif` ou `.webp`).
- [ ] **Step 1 (RED):** testes novos e ajustados. **Step 2:** FAIL. **Step 3 (GREEN).** **Step 4:** apagar o legado, `grep -rn "components/About\|components/Skills" src e2e` vazio. **Step 5:** `npm run lint && npm test && E2E_PORT=<faixa> npx playwright test e2e/page-sobre.spec.ts e2e/navigation-focus.spec.ts` (o último já cobre `/sobre` e `#metodo`, sem edição). **Step 6:** capturas e commit `feat: rebuild /sobre with the founder, the method and the tools`.

---

## Batch P: `/projetos` e `/projetos/:slug`

### Task P1: `projects.ts` fora da exceção de palavras de venda
**Files:** Modify: `src/data/projects.ts` (uma linha), `src/test/copy-rules.test.ts` (uma linha: sai `src/data/projects.ts` de `SALES_WORDS_EXEMPT`), `src/components/projectLabels.ts` (se precisar de rótulos novos).
- **RED:** tirar `src/data/projects.ts` de `SALES_WORDS_EXEMPT` faz o guarda falhar em `projects.ts:48` (`...e transforma o resultado em leads.`).
- **GREEN:** reescrever essa frase sem a palavra de venda, sem mudar o fato: `...e guarda o resultado como leads.` (rascunho, o Victor revisa; item O-K5). Rodar `projects.copy.test.ts`, `projects.test.ts`, `projects.images.test.ts`, `projects.sitemap.test.ts` e `projectsPages.copy.test.tsx`.
- [ ] Commit `fix: projects data passes the sales wording guard`.

### Task P2: `BrowserShot`
**Files:** Create: `src/sections/projects/BrowserShot.tsx`, `BrowserShot.test.tsx`
- Reusa `WindowFrame` (moldura escura com 3 pontos e título em mono) mais `ProjectShotImage` (que não muda: `srcSet`, `width`, `height`, `loading` e `fetchPriority` já corretos). `title` da moldura = o slug do projeto em mono (ex.: `dizpara`), sem URL inventada. `alt` do screenshot preservado.
- **Interfaces:** `BrowserShot({ shot: ProjectShot; slug: string; sizes: string; priority?: boolean; className?: string })`.
- [ ] **Step 1 (RED):** a imagem mantém `alt`, `srcSet` e `loading` (`eager` só com `priority`); a moldura mostra o slug; os pontos são `aria-hidden`. **Step 2 a 4:** GREEN. Commit `feat: browser frame around project shots`.

### Task P3: `ProjectCard` na moldura, com hover e spotlight
**Files:** Modify: `src/components/ProjectCard.tsx` (reescrita) e criar `ProjectCard.test.tsx`.
- O card inteiro continua **um link** (`Link` com `aria-labelledby` do título e do "Ver detalhes", como hoje). Dentro dele, `SpotlightCard as="div"` com superfície `white`, `rounded-card`, a capa dentro do `BrowserShot` (`aspect-[2.1/1]`, `object-cover object-left-top`, sobe 2% de escala no hover só com `motion-safe`), `p` da categoria em mono caixa alta, `h2` do título (`ProjectTitle`), descrição, tags como chips mono, e a linha "Ver detalhes" com seta (lucide `ArrowRight`, `aria-hidden`) com o texto `CARD_CTA_TEXT`. Anel de foco `vn-focus-ring-ink` no `Link`. `cardLayout` e `imageSizes` de `projectGrid.ts` não mudam.
- Mantém as garantias de `ProjectsPage.test.tsx`: nomes distintos, "Ver detalhes" visível, nenhum link externo, nenhuma nova aba, h2.
- [ ] **Step 1 (RED):** `ProjectCard.test.tsx`: link para `/projetos/<slug>`, nome acessível = título + "Ver detalhes", `h2`, tags em lista, capa `lazy` por padrão, sem classes `zinc`, `italic`, `shadow-2xl`. **Step 2 a 4:** GREEN. Commit `feat: project card in a browser frame with spotlight`.

### Task P4: `FeaturedProjectCard`
**Files:** Modify: `src/components/FeaturedProjectCard.tsx` (reescrita) e criar o teste.
- `SpotlightCard tone="dark"` em `rounded-shell`, fundo `vn-black`, a capa no `BrowserShot` e as duas imagens pequenas ao lado (escondidas no celular, como hoje, e o texto vem **antes** no DOM). A frase `highlight` em tipografia maior. O botão "Ver detalhes" é uma pílula branca com texto preto. **Nenhum acento** (a faixa de destaque inteira fica sem verde; cada seção pode ter um, aqui nenhum é necessário).
- [ ] **Step 1 (RED):** as 3 imagens, a capa `eager` só com `priority`, `highlight` presente, link único, sem `zinc`. **Step 2 a 4:** GREEN. Commit `feat: featured project card on black`.

### Task P5: compor `ProjectsPage`
**Files:** Modify: `src/pages/ProjectsPage.tsx`, `src/pages/ProjectsPage.test.tsx`, `src/components/Projects.tsx` (a lista sem o h1). Delete: `src/pages/ProjectsPage.retry.test.tsx` (não há mais chunk interno). Create: `e2e/page-projetos.spec.ts`.
- Ordem: `SEO` (mesmos título e descrição de `projectLabels`), `PageHero` (kicker `projetos`, título `PROJECTS_TITLE`, lead `PROJECTS_INTRO`), a lista (seção `white`: os 2 destaques, depois a grade de 5, `ul role="list"`), `CtaBand` (heading `PROJECT_CTA_TEXT`, cta `Vamos conversar` para `/contato`, `whatsappMessage` rascunho).
- Some o `PROJECTS_SKELETON_HEIGHT` manual e o `lazyWithRetry` interno de `Projects`: a rota já é lazy e o `PageFallback` do `SiteLayout` cobre a espera.
- `ProjectsPage.test.tsx` mantém: sem abas, sete projetos com link, DizPara e Hub081 primeiro e à parte, h1 e depois h2 sem pular, nome único por card, primeira capa `eager` e as outras `lazy`, nenhum projeto removido, cabeça da página com canonical e imagem própria. O h1 agora vem do `PageHero`.
- `e2e/page-projetos.spec.ts`: `describePageContract({ path: '/projetos', h1: 'Projetos', readyHeading: <h2 do DizPara>, hasFloatingClearance: true })` e um caso que mede que nenhum card estoura nos 5 larguras.
- [ ] **Step 1 a 5:** RED, GREEN, e2e, capturas, commit `feat: rebuild /projetos with page hero, framed cards and a closing band`.

### Task P6: o caso (`/projetos/:slug`)
**Files:** Create: `src/sections/projects/{ProjectFacts,ProjectHighlight,NextProject}.tsx`, `src/sections/projects/nextProjectOf.ts` (nome diferente de `NextProject.tsx` porque no Windows os dois colidem por caixa) e testes. Modify: `src/pages/ProjectDetailPage.tsx`, `src/components/ProjectDetail.tsx`, `src/components/ProjectDetailGallery.tsx` (e os testes `ProjectDetailPage.test.tsx`, `ProjectDetail.layout.test.tsx`). Create: `e2e/page-projeto.spec.ts`.

**Interfaces:**
```ts
// nextProjectOf.ts
export function nextProjectOf(slug: string, list?: readonly Project[]): Project | undefined; // o seguinte; o último volta ao primeiro; lista vazia: undefined
```
**Design:**
- `PageHero`: kicker = categoria, título = nome do projeto, lead = `description`. Uma linha de volta ("Todos os projetos", alvo ≥ 44px, `ArrowLeft` `aria-hidden`) dentro do `PageHero`, abaixo do lead: um link colocado antes do hero ficaria sob o header fixo.
- **Frase de destaque** (`ProjectHighlight`): só para projetos com `highlight` (DizPara e Hub081): o texto em tipografia grande dentro de uma faixa com a régua de 3px em tinta. **Sem count-up e sem número.** Para os outros 5, o componente devolve `null` e nada ocupa o lugar.
- **Corpo:** duas colunas a partir de `lg`. A coluna de fatos (`ProjectFacts`: "O que faz" com `features` quando existem, "Tecnologias e recursos" com as tags, a categoria, e o convite `PROJECT_CTA_TEXT` com o botão `CONTACT_LABEL` para `/contato`) fica **antes** da galeria no DOM e fica fixa a partir de `lg` só quando é a coluna mais curta (nos destaques com `features` a coluna que fixa é a galeria, que é a mais curta; `stickyColumnOf` decide pelo conteúdo) e só em janela com altura de pelo menos 720px (`STICKY_MIN_HEIGHT_PX`, a coluna mais alta que fixa mais o deslocamento de 112px); em janela mais baixa nada fixa e a página rola inteira, para nada ficar cortado embaixo (`STICKY_COLUMN_CLASSES`). A galeria (`role="group"` com `galleryLabel`) mostra os 3 screenshots em `BrowserShot`: destaque = capa grande mais 2 miniaturas; regular = 3 empilhados. Imagens retratos mantêm `reservedSize` e o limite de altura de `ProjectDetailGallery.tsx`.
- `NextProject`: kicker `próximo projeto`, `h2` com o título, categoria, a capa pequena no `BrowserShot`, link para o caso seguinte. `CtaBand` fecha.
- **Mantém:** `REMOVED_PROJECT_SLUGS` redireciona (`Navigate replace` para `/projetos`); slug inexistente mostra `NotFound` lazy dentro de `Suspense` com o `NotFoundFallback` da Task A3 (a cópia local sai), com `SEO noindex`; `SEO` com imagem de compartilhamento 1200x630 e `breadcrumbSchema`; o recuo dos botões flutuantes (`CLEAR_FLOATING_BUTTONS`) ou o equivalente do `Container`, conferido em 320 e 390.
- [ ] **Step 1 (RED):** `nextProject.test.ts` (sequência, volta ao início, lista de um item devolve o próprio, slug desconhecido devolve o primeiro), `ProjectHighlight.test.tsx` (renderiza para destaque, `null` para regular, nenhum dígito vindo do componente), `ProjectFacts.test.tsx` (features só se existirem, tags, link do CTA), e os testes da página: redirect, 404 com `noindex`, h1 único, `NotFound` ainda não importado estático (o teste "does not import NotFound statically" continua).
- [ ] **Step 2:** FAIL. **Step 3 (GREEN).** **Step 4:** `e2e/page-projeto.spec.ts`: `describePageContract` para `/projetos/dizpara` (destaque) e `/projetos/travel-ia` (regular), `/projetos/troco` termina em `/projetos`, e a coluna de fatos fica fixa ao rolar em 1440 (compara `top` antes e depois de rolar 300px). `e2e/seo-tags.spec.ts` continua passando sem edição.
- [ ] **Step 5:** commit `feat: rebuild the project case page with a highlight phrase, sticky facts and next project`.

---

## Batch C: `/contato`

**Copy** (`src/data/contactCopy.ts`, tudo existente no ar, exceto onde marcado): kicker `contato` (rascunho), título `Conta o que você precisa` (era o h2 do `Contact`, mesma frase sem o ponto), lead `A gente conversa sobre o seu projeto e mostra por onde começar.`, rótulos `E-mail`, `WhatsApp`, `Localização`, valor `Recife e remoto`. O h2 do formulário reusa `homeCopy.finalCta.heading` e `.kicker` (aprovados). SEO: título `Contato` e a descrição de hoje.

### Task C1: `contactCopy.ts`
**Files:** Create: `src/data/contactCopy.ts`, `src/data/contactCopy.test.ts`. Teste: nenhum dash, nenhum número de telefone literal (o telefone vem de `constants`), o título está no imperativo informal. Commit `feat: contact page copy module`.

### Task C2: `ContactChannels`
**Files:** Create: `src/sections/contact/ContactChannels.tsx` e teste.
- Lista `dl` com três linhas: e-mail (`mailto:` de `CONTACT_EMAIL`), WhatsApp (texto `WHATSAPP_DISPLAY`, `href` de `whatsappUrl(WHATSAPP_GREETING)`, `target="_blank"`, `rel`, `aria-describedby` do `NewTabHint`, ícone `BrandIcon id="whatsapp"` em tinta: o `text-green-500` antigo sai), localização. Alvos ≥ 44px, anel de foco `vn-focus-ring-ink`.
- [ ] **Step 1 (RED):** os `href` vêm de `constants` (teste compara com `whatsappUrl(WHATSAPP_GREETING)` e `CONTACT_EMAIL`), nenhum literal `wa.me` no arquivo (o teste lê o fonte), o ícone é `aria-hidden`. **Step 2 a 4:** GREEN. Commit `feat: contact channels list from the shared constants`.

### Task C3: `ContactFormSection`
**Files:** Create: `src/sections/contact/ContactFormSection.tsx` e teste.
- Seção `cream` com `id="contato"` (o alvo de `scrollToIdWhenMounted('contato', { focus })`), kicker e `h2` (`homeCopy.finalCta`), e dentro dela **um painel preto** `rounded-shell` (`vn-black`, `ScanGrid tone="dark"`) que segura o `ContactForm` (o formulário só tem superfície escura, ver `contactStyles.ts`). `ContactForm` entra intacto com `initialMessage` e `prefillNonce`. O painel não leva acento (o formulário já não leva).
- **Interfaces:** `ContactFormSection({ prefillMessage?: string; prefillNonce?: number })`.
- [ ] **Step 1 (RED):** a seção tem `id="contato"` e uma única `textarea` e um único `form[name="contact"]`; as props chegam ao `ContactForm` (mock do módulo confere); o h2 é o da home. **Step 2 a 4:** GREEN. Commit `feat: contact form section with a black panel`.

### Task C4: compor `ContactPage`, retirar o legado
**Files:** Modify: `src/pages/ContactPage.tsx` (reescrita) e `ContactPage.test.tsx`. Delete: `src/components/{Contact,FAQ,ROICalculator}.tsx` e os testes `Contact.test.tsx`, `FAQ.test.tsx`, `ROICalculator.test.tsx`. Create: `e2e/page-contato.spec.ts`. Rename: `e2e/legacy-roi-figures.spec.ts` para `e2e/contact-roi-figures.spec.ts`.

- Ordem: `SEO` (com `jsonLd={[faqJsonLd]}`, `buildFaqJsonLd(faqs)` calculado uma vez fora do componente), `useScrollToHash()`, `PageHero` (`aside` = `ContactChannels`), `RoiSimulator` (black, da home), `ContactFormSection`, `FaqSection` (white).
- O manipulador do orçamento fica como hoje: `setPrefill` com `nonce`, `cancelScroll` ao sair e antes de um novo pedido, `scrollToIdWhenMounted('contato', { focus: textarea })`, e passa a anunciar `shellCopy.quoteFilled` numa região `role="status"` quando o foco chega (igual à `HomePage`, via `onFocused`).
- Os testes da página mantêm: um h1 e o formulário e as perguntas abaixo, depois de pedir o orçamento rola e põe o foco na mensagem, cancela o scroll quando a pessoa sai, cancela o anterior antes do próximo, e recoloca a estimativa depois de editar. O teste "retries a chunk that failed to load" sai (não há mais seções lazy).
- `contact-roi-figures.spec.ts`: o objetivo continua (os números grandes do simulador com os maiores valores não passam da caixa em 280 a 390). O implementador lê `RoiControls.tsx` e `RoiResults.tsx` para os rótulos e seletores reais do simulador novo. Se a home já tem um e2e equivalente que cobre a mesma largura e os mesmos valores, o arquivo é removido em vez de duplicado, com a razão no relatório.
- `e2e/page-contato.spec.ts`: `describePageContract({ path: '/contato', h1: 'Conta o que você precisa', readyHeading: <h2 do simulador>, hasContactForm: true, hasFloatingClearance: true })` (o `test` de `n8nGuard` bloqueia qualquer request ao n8n), o JSON-LD `FAQPage` presente uma vez, e um caso em que o botão do simulador leva a estimativa para a mensagem com a rota do n8n **interceptada** (nada é enviado). Os e2e do formulário que abrem `/contato` (`contact-form*.spec.ts`, `floating-focus.spec.ts`) rodam sem edição.
- [ ] **Step 1 (RED), 2, 3 (GREEN).** **Step 4:** `grep -rn "components/Contact'\|ROICalculator\|components/FAQ" src e2e` vazio. **Step 5:** `npx playwright test e2e/page-contato.spec.ts e2e/contact-form.spec.ts e2e/contact-form.focus.spec.ts e2e/contact-form.ids.spec.ts e2e/contact-roi-figures.spec.ts`. **Step 6:** `npx vitest run src/test/frozenFiles.test.ts` (o canal de leads não mudou). **Step 7:** commit `feat: rebuild /contato with the simulator, the form and the questions`.

---

## Batch N: 404

### Task N1: extrair `useScramble`
**Files:** Create: `src/hooks/useScramble.ts`, `useScramble.test.ts`. Modify: `src/components/NotFound.tsx` (importa o hook).
- Refatoração sem mudança de comportamento: o mesmo efeito (400 ms de espera, 28 ms por tick, termina no texto real, sem embaralhar com movimento reduzido, para no meio quando o widget pausa as animações). O conjunto de letras embaralhadas passa a ser minúsculo (o título é minúsculo).
- [ ] **Step 1 (RED):** testes portados de `NotFound.test.tsx`: termina no texto real, mostra o texto real de saída com movimento reduzido, para no meio quando as animações são pausadas, funciona sem `matchMedia`. **Step 2 a 4:** GREEN, `NotFound.test.tsx` e `NotFound.strict.test.tsx` seguem verdes. Commit `refactor: scramble effect as a hook`.

### Task N2: glitch cromado
**Files:** Modify: `src/styles/motion.css` (keyframes `vn-glitch-a` e `vn-glitch-b` e as classes, ambos só `transform` e `clip-path`, parados em `vn-still`). Create: `src/components/NotFoundGlitch.tsx` e teste.
- O "404" é decorativo (`aria-hidden`): a camada de base em `.vn-chrome-text`, e duas camadas deslocadas (uma branca, uma `vn-gray-mid`) que se movem por `transform`. **Cores só da paleta** (os `glitch-1` e `glitch-2` antigos usavam `emerald`, e saem no Z). Sob `prefers-reduced-motion` e "pausar animações" as camadas ficam sobrepostas e paradas.
- [ ] **Step 1 (RED):** o componente é `aria-hidden`, não tem classes `emerald`, as duas camadas existem, e o CSS de `motion.css` tem os dois keyframes e a regra de `vn-still` (teste lê o arquivo, no padrão de `motion.test.ts`). **Step 2 a 4:** GREEN. Commit `feat: chrome glitch for the 404 number`.

### Task N3: compor o novo `NotFound`
**Files:** Modify: `src/components/NotFound.tsx` (reescrita), `NotFound.test.tsx`, `NotFound.strict.test.tsx`. Create: `e2e/page-404.spec.ts`.
- `Section tone="black"` com `min-h-dvh`, `ScanGrid tone="dark"`, conteúdo centrado: `NotFoundGlitch`, `h1` em minúsculas (`Heading as="h1"`, texto `Página não encontrada`, `aria-label` com o texto real) seguido do `Cursor tone="accent"` (o **único** acento), o parágrafo atual (`A página que você procura não existe ou foi movida para outro endereço.`), `Button` primário escuro `Voltar ao início` (`Link` para `/`, ícone `ArrowLeft`), e a assinatura `© <ano> VN One` em mono `gray-light`. Sem `zinc`, sem `emerald`, sem `blur` decorativo.
- Os testes mantêm: termina no título real, título real direto com movimento reduzido e com o widget pausado, nome acessível, caminho de volta para a home, assinatura com o ano atual e "VN One", contraste (sem `zinc-500` ou `zinc-700`; agora afirmando tokens).
- `e2e/page-404.spec.ts`: `describePageContract({ path: '/rota-que-nao-existe', title: /^Página não encontrada/, h1: /página não encontrada/i, readyHeading: ... })` ajustado (o 404 só tem o h1, o contrato aceita `readyHeading` ausente), `meta[name="robots"]` contém `noindex`, cursor `.vn-cursor` visível e estático com movimento reduzido.
- [ ] **Step 1 a 5:** RED, GREEN, e2e, capturas, commit `feat: rebuild the 404 in the VN One system`.

---

## Batch B: `/blog`

**Princípio:** o comportamento e a a11y que já estão provados (40 testes unitários e o `e2e/blog.spec.ts`) não mudam. Muda o visual, a divisão em arquivos e o lugar (dentro do `SiteLayout`). `src/utils/newsService.ts` **não muda de dado**: só o código dos `catch` (item Q-35d).

**Visual novo, no sistema:** fundo `cream`, `PageHero` (kicker `blog`, h1 `Leituras sobre IA e automação` sem o texto em gradiente, lead e o botão "Atualizar" com a região de status), barra de filtros em `white`, artigos em cards `white` com borda `gray-light`, o destaque como `SpotlightCard tone="dark"` preto. Pílulas de idioma e de tópico **opacas e escuras** com texto branco (o teste de contraste sobre qualquer capa continua valendo). "NOVO" é a única forma em acento da seção (preenchimento `#00E5A0` com texto preto) e só no destaque. Sem brilhos roxo e ciano, sem `blur`, sem `from-` e `to-`.

### Task B1: extrair funções puras
**Files:** Create: `src/sections/blog/blogMeta.ts`, `blogMeta.test.ts`. Modify: `src/components/BlogPage.tsx`.
- Mover `describeDataSource`, `isNew`, `estimateReadTime`, `getCategoryTag`, `cardDescribedBy` (hoje locais, linhas 39 a 100) para `blogMeta.ts` com testes diretos. **Sem mudar comportamento:** todos os testes de `BlogPage*.test.tsx` seguem verdes sem edição.
- [ ] Commit `refactor: blog helpers out of the page component`.

### Task B2: `blogCopy.ts`
**Files:** Create: `src/sections/blog/blogCopy.ts`, `blogCopy.test.ts`. Modify: `BlogPage.tsx`.
- Todas as frases fixas do blog (hero, filtros, estados, rodapé "Os artigos vêm de sites de terceiros e os links levam aos sites de quem publicou.") saem para o módulo, **sem mudar uma palavra** (o guarda de copy passa a varrer o módulo por estar em `src/sections`). Os testes que leem os textos continuam.
- [ ] Commit `refactor: blog copy in one module`.

### Task B3: cards e esqueletos
**Files:** Create: `src/sections/blog/{ArticleCard,FeaturedArticle,BlogSkeletons}.tsx` e testes. Modify: `BlogPage.tsx` (usa os novos).
- `ArticleCard` (hoje `NewsCard`) e `FeaturedArticle` (hoje `FeaturedCard`), esqueletos (`SkeletonCard`, `SkeletonFeatured`), com o visual novo e **os mesmos** comportamentos: `h3` com `lang`, capa com fallback quando a imagem falha, `referrerPolicy="no-referrer"`, `decoding="async"`, link para o artigo em nova aba com `rel="noopener noreferrer"`, `aria-describedby` por `cardDescribedBy`, NOVO e "há quanto tempo" **só** para lista ao vivo (nunca na lista fixa).
- [ ] **Step 1 (RED):** novos testes de classe: sem `zinc`, `purple`, `cyan`, `gradient`, `blur`; pílulas com `bg-vn-black text-vn-white`; no máximo um `bg-vn-accent`. **Step 2 a 4:** GREEN e os testes de comportamento existentes passam. Commit `feat: blog cards and skeletons in the system`.

### Task B4: filtros
**Files:** Create: `src/sections/blog/BlogFilters.tsx` e teste. Modify: `BlogPage.tsx`.
- Idioma e tópico como grupos de chips com `aria-pressed`, busca com o botão de limpar (alvo ≥ 44px, o e2e antigo exigia 24px), contagem numa região `role="status"` única que já existe antes do primeiro filtro, "limpar filtros". Anel de foco inteiro, sem corte por ancestral (o e2e `shows the whole focus ring of the first and the last chip` continua).
- [ ] Commit `feat: blog filters in the system`.

### Task B5: hero e composição no estilo novo
**Files:** Create: `src/sections/blog/BlogHero.tsx` e teste. Modify: `BlogPage.tsx`, `BlogPage.contrast.test.ts`.
- `BlogHero` usa `PageHero` (children = botão "Atualizar" com `aria-disabled={loading}` e `role="status"` da origem dos dados). `BlogPage.contrast.test.ts` passa a varrer **todos** os arquivos de `src/sections/blog/` e afirmar tokens `vn-*` (nenhuma classe de cinza `zinc`, `gray`, `neutral`, `slate`, `stone`, nenhuma `text-white/N`).
- [ ] Commit `feat: blog hero on PageHero`.

### Task B6: o blog entra no `SiteLayout`
**Files:** Modify: `src/App.tsx` (remove `BlogRoute`, `BlogFallback`, `ScrollResetOnLayoutSwitch` e a rota fora do layout; a rota `/blog` passa a ser filha do `SiteLayout`), `src/components/BlogPage.tsx` (perde `SkipLink`, `<header>` de "Voltar", `<main>`, `<footer>` e o foco manual por `useNavigationType`), `src/App.test.tsx`. Create: `e2e/page-blog.spec.ts`. Modify: `e2e/blog.spec.ts`.
- O conteúdo do blog vira seções dentro do `main` do layout. O foco ao navegar e a rolagem ao topo passam a ser do `SiteLayout` (o mesmo que as outras páginas). O botão "Voltar para a VN One" e o rodapé próprio saem (o header e o rodapé do site já existem). O rodapé de "os artigos vêm de sites de terceiros" vira o último parágrafo da seção.
- Os testes "leaves the first tab stop to the skip link when the blog is opened by a reload", "leaves the focus alone after back or forward" e "moves the focus to main when arriving by a link" deixam de ser do `BlogPage` e passam a ser provados no e2e (reload com Tab vai ao skip link; ir pelo menu leva o foco ao `main`). A mudança de regra do POP (agora igual às outras páginas) fica registrada no relatório.
- **Esta task é separável:** se a revisão achar risco, o lote B entrega B1 a B5 (visual novo, blog ainda fora do layout, com `ScrollProgress tone="dark"` trocado para claro) e a B6 vira follow-up. O recomendado é entregar a B6.
- [ ] **Step 1 (RED):** e2e novos e `App.test.tsx`. **Step 2:** FAIL. **Step 3 (GREEN).** **Step 4:** `npm test` (os 40 testes de `BlogPage*`) e `npx playwright test e2e/blog.spec.ts e2e/page-blog.spec.ts e2e/navigation-focus.spec.ts e2e/layout.spec.ts`. **Step 5:** commit `feat: move the blog into the site layout`.

### Task B7: causas dos `catch` do `newsService`
**Files:** Modify: `src/utils/newsService.ts` (só código), `src/utils/newsService.test.ts`.
- Os 6 `catch` vazios de hoje (cadeia de fontes, de propósito) passam a registrar a causa em uma lista devolvida junto do resultado (a UI já mostra "a razão" quando todas as fontes falham). **O dado e `FALLBACK_ARTICLES` ficam intocados** (o teste `blog fallback articles` de `copy-rules` segue). Se a mudança alterar o formato do retorno, o implementador mantém a assinatura atual e acrescenta o campo opcional.
- [ ] **Step 1 (RED):** para cada fonte que falha o teste espera a causa na lista e que o resultado ainda venha da próxima fonte. **Step 2 a 4:** GREEN, `newsService.closure.test.ts` verde. Commit `refactor: list why each news source failed instead of swallowing it`.

---

## Batch L: `/privacidade` e `/lgpd`

**Regra de ouro:** o texto não muda, e os dois arquivos **não são editados** na Via 1. O `frozenFiles.test.ts` (Task A5) é a prova automática.

### Via 1 (padrão, sem aprovação): moldura por fora

`LegalFrame` embrulha a página **na rota**, dentro de dois novos módulos (`PrivacyRoute.tsx` e `LgpdRoute.tsx`, com `export default`), e o `App.tsx` aponta os `lazyWithRetry` para eles.

### Task L1: sumário a partir dos títulos renderizados
**Files:** Create: `src/pages/legal/legalToc.ts`, `legalToc.test.ts`
```ts
export interface TocEntry { id: string; label: string }
export function slugify(label: string): string;           // 'Quem é o controlador' -> 'quem-e-o-controlador'
export function collectToc(root: ParentNode): TocEntry[]; // lê os h2 de root; ids únicos (sufixo -2, -3); não usa texto fixo
```
- O sumário é lido do DOM renderizado, **não** copiado: copiar os títulos para um arquivo duplicaria texto jurídico e poderia divergir dele.
- [ ] **Step 1 (RED):** acentos, pontuação, números ("1. Quem é o controlador" vira `1-quem-e-o-controlador`), duplicados, h2 vazio ignorado. **Step 2 a 4:** GREEN. Commit `feat: legal table of contents from rendered headings`.

### Task L2: teste de identidade do texto (característico, nasce verde)
**Files:** Create: `src/pages/legal/legalText.test.tsx`
- Renderiza `PrivacyPage` e `LgpdPage` **sem** moldura e guarda o SHA-256 do `textContent` normalizado (espaços colapsados) como constantes, **medidas agora, antes da moldura existir** (a task roda sobre o código atual: nasce GREEN, e esse é o ponto). Depois da moldura, o mesmo hash tem que sair do `[data-legal-body]`.
- [ ] **Step 1:** medir e fixar os dois hashes (anotar no relatório com o comando). **Step 2:** commit `test: characterize the legal text before the layout work`.

### Task L3: `LegalFrame` e o CSS de reestilo
**Files:** Create: `src/pages/legal/{LegalFrame.tsx,useLegalToc.ts,legal.css,PrivacyRoute.tsx,LgpdRoute.tsx}` e `LegalFrame.test.tsx`

**Design:**
- `LegalFrame({ children })`: `Section tone="cream"` (ou `div`, o `main` já é do layout), grade `lg:grid lg:grid-cols-[minmax(0,1fr)_16rem]`. A coluna de leitura (`div[data-legal-body]`, classe `vn-legal`) embrulha `children` com a medida de leitura (`max-w-3xl`). A coluna do sumário é `nav aria-label="Nesta página"` com `lg:sticky lg:top-28 lg:self-start`. Abaixo de `lg` o sumário vira um `details` recolhido no topo ("Nesta página", rótulo de rascunho).
- `useLegalToc(bodyRef)`: depois de montar, `collectToc`, põe `id` e `tabIndex={-1}` nos `h2` (atributos imperativos no DOM, nunca no fonte congelado), cria a lista, e usa **um** `IntersectionObserver` para marcar o item ativo com `aria-current="location"`. Clique no item: `preventDefault`, `scrollIntoView` (instantâneo com movimento reduzido), foco no título, `history.replaceState` do hash.
- `legal.css` (importado pelo `LegalFrame`, CSS comum sem `@apply`, só variáveis `var(--color-vn-*)`, que existem porque o tema é `static`): reestilo **por descendente**, sem `!important` (CSS sem camada vence as utilidades que o Tailwind põe em `@layer`). Regras: `.vn-legal h1` e `h2` em `font-style: normal`, minúsculas, `letter-spacing: -0.03em`, cor tinta; `.vn-legal p, li` cor `gray-dark`; micro-textos com `text-[10px]` e `text-zinc-400` sobem para `.75rem` e `gray-dark` por seletor de atributo (`[class*="text-[10px]"]`) e `[class*="text-zinc-400"]`; os brilhos decorativos (`[class*="blur-["]`) somem; `.vn-legal h2 { scroll-margin-top: 7rem }`. O fundo e o `min-h-screen` da página ficam (o creme do alias).
- [ ] **Step 1 (RED):** `LegalFrame.test.tsx`: renderiza `<LegalFrame><PrivacyPage/></LegalFrame>` e `<LegalFrame><LgpdPage/></LegalFrame>`; (a) o hash do `textContent` de `[data-legal-body]` é o da L2; (b) existe um `nav` "Nesta página" com um link por `h2`, na mesma ordem; (c) todo link aponta para um `id` que existe; (d) clicar move o foco para o título; (e) com `matchMedia` de movimento reduzido o scroll é instantâneo; (f) o IntersectionObserver marca `aria-current` (mock de `src/test/intersection.ts`).
- [ ] **Step 2 a 4:** GREEN. Commit `feat: LegalFrame with a sticky table of contents around the frozen legal pages`.

### Task L4: ligar na rota e provar no navegador
**Files:** Modify: `src/App.tsx` (**duas linhas**: os `lazyWithRetry` de `PrivacyPage` e `LgpdPage` passam a importar `./pages/legal/PrivacyRoute` e `./pages/legal/LgpdRoute`; só depois do merge do B). Create: `e2e/page-legal.spec.ts`.
- `PrivacyRoute` e `LgpdRoute` são `export default function` que devolvem o `LegalFrame` com a página dentro (default export permitido: são módulos lazy, o `exportsPolicy.test.ts` aceita).
- `e2e/page-legal.spec.ts`: `describePageContract` para `/privacidade` (h1 `Política de Privacidade`, `readyHeading` o primeiro h2) e `/lgpd`; sumário sticky em 1440 (`top` estável depois de rolar), clique no sumário leva o título para baixo do header e mantém o foco, e em 320 nenhum e-mail ou palavra longa estoura. **O contrato aqui aceita as exceções conhecidas das páginas congeladas** (lista fechada no spec, com o motivo: o texto não pode mudar). O que não passar fica no relatório como "depende da Via 2".
- [ ] **Step 1 a 5:** RED, GREEN, e2e, capturas, `npx vitest run src/test/frozenFiles.test.ts` (os dois arquivos seguem byte idênticos), commit `feat: serve the legal pages inside the editorial frame`.

### Task L5 (Via 2, **só com o ok explícito do Victor, Q1**)
Editar `PrivacyPage.tsx` e `LgpdPage.tsx` **só no layout**: `className`, tags de embrulho e ícones; **nenhuma palavra, número, data ou link muda**. Com isso o `LegalFrame` por CSS vira desnecessário e as páginas passam a usar `Heading`, `Kicker`, `Section` e os tokens. Entram junto: o teste de identidade (L2) aponta o mesmo hash e passa; o `frozenFiles.test.ts` ganha os hashes novos de propósito; as duas páginas entram na varredura do `copy-rules` **só** com o conjunto de linhas de texto jurídico isentas por uma lista de exceções explícita; o alias `--color-brand-white` e o `@custom-variant dark` saem no Z. Sem o ok, esta task não existe.

---

## Batch Z: fechamento (serial, depois de todos)

### Task Z1: remover o legado que ficou sem uso
**Files:** Modify: `src/index.css`. Delete: `src/lib/reveal.ts` (e `reveal.test.tsx` se testar só `revealProps`), `src/components/AnimatedText.tsx` e o teste (se `grep` mostrar zero usos), o ramo compacto de `SectionSkeleton` se zero usos, `public/victor-photo.webp` (junto com a troca do arquivo de amostra em `src/test/nginx-config.test.ts` para um arquivo de `public/founder/`) e a alteração de `repoHygiene` se citar o arquivo.
- Em `index.css`: sai o bloco `.roi-slider*`, as variáveis `--roi-slider-*`, e os `@keyframes glitch-1` e `glitch-2`. **Ficam** `.custom-scrollbar` (usado pelo `ServiceSelect` do formulário), o alias `--color-brand-white` e o `@custom-variant dark` (as duas páginas legais congeladas ainda usam `bg-brand-white` e `dark:`), salvo se a Task L5 foi aprovada e feita.
- [ ] **Step 1 (RED):** `src/test/legacyCss.test.ts` afirma que `index.css` não contém `.roi-slider`, `--roi-slider` nem `glitch-`, e que nenhum arquivo de `src` importa `lib/reveal`. FAIL. **Step 2 (GREEN):** remover. **Step 3:** `npm run lint && npm test && npm run build`. Commit `chore: remove the legacy CSS and helpers the rebuilt pages no longer use`.

### Task Z2: guarda de higiene visual
**Files:** Create: `src/test/pageHygiene.test.ts`
- Varre `src/**` (sem testes) e falha se achar: `\bdark:`, `\bitalic\b`, `text-\[10px\]`, famílias de cor fora da paleta (`emerald|purple|violet|cyan|blue|green|red|amber|zinc|slate|stone|neutral`) em classes `text-`, `bg-`, `border-`, `from-`, `via-`, `to-`, `ring-`, gradientes decorativos (`bg-gradient`, `bg-linear`, `bg-\[radial`), `text-white/\d`. Exceções por **lista fechada com motivo**: `src/pages/PrivacyPage.tsx` e `src/pages/LgpdPage.tsx` (congelados), `src/components/AccessibilityWidget*` e `src/components/Accessibility*` se ainda usarem cinzas próprios (o implementador confere com `grep` e lista cada uma com a razão; não se isenta por conveniência).
- [ ] **Step 1 (RED):** rodar e listar os achados. Cada achado vira correção no arquivo dono (se for de um lote deste plano, volta para ele). **Step 2 (GREEN):** zerar ou isentar com motivo. Commit `test: guard against legacy visual classes`.

### Task Z3: documentação
**Files:** Modify: `README.md` (rotas, script `founder-photo`, as páginas), `docs/superpowers/specs/2026-10-26-redesign-vn-one-design.md` (a seção "Checklist técnico do Plano 3": marcar o que saiu e anotar que `.custom-scrollbar` fica, e a divergência de `/projetos` sem abas e sem impacto). Sem arquivo novo.
- [ ] Commit `docs: inner pages shipped, notes on what stayed`.

### Task Z4: esqueletos e orçamento, por último
- [ ] **Step 1:** `npm run build`, `npm run budget -- --enforce` (esperado: ≤ 160 kB, hoje 156,1). Se passou, `git diff main -- scripts/check-bundle-budget.mjs` vazio.
- [ ] **Step 2:** se a Task S2 mudou a altura do `ServicesCards` da home (ver a diferença de `e2e/home.spec.ts --grep "skeleton heights"`), `npx vite preview --port <faixa> --strictPort` e `npm run measure:skeletons -- http://localhost:<faixa>/ --write`. **Só depois de todos os merges.** Commit `chore: regenerate the skeleton heights after the inner pages`.
- [ ] **Step 3:** `npx playwright test e2e/home.spec.ts --grep "skeleton heights"`. Esperado: PASS.

### Task Z5: gates finais
- [ ] `npm run lint` (0 erros, 0 avisos novos), `npm test` (todos), `npm run coverage` (`src/lib` e `src/hooks` ≥ 80%), `npm run build`, `npm run budget -- --enforce`.
- [ ] `E2E_PORT=<faixa> npx playwright test` nos **dois projetos** (`desktop` e `mobile`), uma rodada completa só, no fim. Esperado: 0 falhas.
- [ ] `npm run lcp` (ou Lighthouse) em `/servicos`, `/sobre`, `/projetos`, `/contato`: LCP < 2,5 s, CLS < 0,1, INP < 200 ms, a11y ≥ 95.
- [ ] Nenhuma request ao n8n real nos logs dos testes (o `n8nGuard` falha o teste se houver).
- [ ] Revisão de fechamento dedicada por lote, depois uma final sobre `git diff main...HEAD` com `code-reviewer`, `react-reviewer`, `a11y-architect`, `security-reviewer` (lotes C e L) e `seo-specialist` (títulos, canonical, JSON-LD). Todo achado é corrigido, inclusive Minor.
- [ ] O líder abre o PR como **rascunho** a partir do branch de integração. Ninguém dá push em `main`. O merge em `main` é o deploy em produção (EasyPanel): só com o ok do Victor.

---

## Perguntas para o dono (cada uma com o padrão recomendado)

| # | Pergunta | Padrão se não houver resposta | Impacto |
|---|---|---|---|
| **Q1** | **Posso editar `PrivacyPage.tsx` e `LgpdPage.tsx` só para o layout** (classes, embrulhos, ícones), com o texto idêntico, provado por teste de hash do texto renderizado? | **Não.** O plano segue a Via 1 (moldura por fora e CSS por descendente), sem editar os arquivos. | Sem o ok, as duas páginas ficam com algumas classes legadas (`dark:`, `text-[10px]`, `italic`) tapadas por CSS, e o alias `--color-brand-white` e o `@custom-variant dark` ficam. |
| **Q2** | O texto jurídico cita Supabase, hash de IP, user agent e 12 meses de retenção, que o código não faz (item O-S1, bloqueador de lançamento). Qual é o fluxo real do n8n? | Não muda nada. Continua listado como bloqueador. | A moldura não altera fatos. A página pode ir ao ar com o texto atual, sob responsabilidade do dono. |
| **Q3** | Os **descontos dos combos** (10, 12 e 15%) ainda valem? | **Decisão do dono: os percentuais saem.** O campo `desconto` e o `ComboDiscount` foram apagados (14dff03). O kicker novo ("Pacotes") não promete desconto. | Para trazer um desconto verificado de volta, ver a nota da Task S4. |
| **Q4** | O h1 de `/sobre` fica **"Sobre mim"** (palavra do fundador) numa página que também apresenta a empresa? | **Mantém "Sobre mim"** (você aprovou), e a seção "A VN One" vem logo depois da apresentação do fundador. | Alternativa: h1 "Sobre a VN One" e "Sobre mim" como h2 da seção do fundador. Isso muda o e2e de `/sobre` e o texto aprovado. |
| **Q5** | Aprova o **rascunho** de texto novo? (kicker `contato`, `Pacotes`, `A VN One` e os 3 fatos do "como a gente trabalha", a legenda da foto "Victor Nogueira, fundador da VN One", as mensagens de WhatsApp dos CtaBand, `nesta página` do sumário, `próximo projeto`). | Entra como está e vai listado no PR para revisão no chat. | Sem aprovação o PR fica rascunho. |
| **Q6** | A lista de **ferramentas** (12 itens, de `Skills.tsx`) está certa? Make, Zapier, Vue 3 e Google Cloud ainda são usados? | **Não muda a lista** (item do dono). | Qualquer retirada ou acréscimo é só editar `src/data/tools.ts`. |
| **Q7** | A frase de destaque do caso é só o `highlight` dos 2 projetos em destaque. Para os outros 5, quer escrever uma frase? | Fica sem frase, sem inventar. | Nenhum número nem resultado é criado. |
| **Q8** | Os textos de `projects.ts` com afirmação de resultado (item O-K5) e a frase da linha 48 reescrita ("guarda o resultado como leads"). | Aplica a frase nova e segue. | Texto de produto, o Victor revisa. |
| **Q9** | O CTA do header ("Vamos conversar") vai para `/contato` hoje, e todo CTA da home vai para `/#contato` (item O-K12). | Sem mudança. | A `/contato` agora é uma página completa com formulário, então o padrão faz sentido. |
| **Q10** | O blog entra no `SiteLayout` (spec) mudando a regra de foco ao voltar no histórico, que passa a ser a mesma das outras páginas? | **Sim**, na Task B6, separável. | Se não, o blog fica fora do layout com o visual novo. |
| **Q11** | `/servicos`, `/contato` e a home mostram a **mesma FAQ**. Quer perguntas diferentes por página? | Mesma lista (só uma fonte). | Conteúdo repetido entre URLs, aceitável para FAQ curta. |

## Dependências do dono (o que bloqueia o quê)

- Nada bloqueia o início. O PR abre como rascunho e só vira "pronto" quando Q1, Q2, Q3, Q5 e Q6 estiverem respondidas.
- **Bloqueia o deploy:** Q2 (texto jurídico) e a aprovação do texto novo (Q5).

## Riscos

| Risco | Efeito | Mitigação |
|---|---|---|
| CSS por descendente nas páginas legais é frágil (seletores de atributo `[class*=...]`) | Reestilo some se alguém renomear uma classe do arquivo congelado | O `frozenFiles.test.ts` garante que o arquivo não muda. O `LegalFrame.test.tsx` confere o resultado. A Via 2 resolve de vez (Q1). |
| Mover o blog para o `SiteLayout` muda o foco no histórico | Regressão de a11y se mal feito | Task B6 separável, e2e novo de reload e de menu, `a11y-architect` revisa. |
| Extrair o `ServiceCard` mexe na home (que é a capa do site no ar) | Esqueletos desalinham | A Task S2 prova comportamento idêntico pelos 3 testes existentes sem editá-los, e o Z4 regenera os esqueletos por último. |
| `PageHero` e `CtaBand` entrando por engano no caminho crítico | O orçamento passa de 160 kB | O Z4 mede. Regra de importação (só páginas lazy). O `bundleBudget.test.ts` já cobre a medição. |
| Duas páginas escuras seguidas (simulador mais painel do formulário) em `/contato` | Parece um bloco só | O painel do formulário é um cartão preto dentro de uma seção creme, com margem, não uma seção preta. |
| Foto do fundador muito pesada na primeira dobra | LCP piora em `/sobre` | AVIF 480 e 960 com limite de tamanho no teste, `fetchPriority="high"`, `width` e `height`, `picture`. |
| Texto novo com "voz" fora da regra | Guarda de copy falha no merge | Todo texto novo está em módulos escaneados desde a primeira task. |
| `e2e` flaky sob carga (o projeto já registrou falhas por 4 workers) | Falso negativo | `workers` já está calibrado em `playwright.config.ts`. Rodar a rodada completa uma vez, no fim, e repetir só o arquivo que falhar. |
| Conflito de `App.tsx` e `copy-rules.test.ts` entre lotes | Retrabalho de merge | A regra de arquivos compartilhados e a ordem de merge (A, S, U, P, C, N, B, L, Z). |
| Deploy automático do EasyPanel a partir de `main` | O merge é produção | Tudo em branch e PR rascunho, merge só com o ok do Victor. |

## Definition of Done

- `npm run lint`: **0 erros**. Nenhum aviso novo.
- `npm test`: tudo verde. `npm run coverage`: `src/lib` e `src/hooks` ≥ 80%.
- `npx playwright test` nos **dois projetos** (`desktop` e `mobile`): 0 falhas, uma rodada completa no fim.
- `npm run build` verde e **`npm run budget -- --enforce` ≤ 160 kB** (hoje 156,1 kB). **Todas** as páginas deste plano continuam rotas `lazyWithRetry` fora do caminho crítico: `AboutPage`, `ServicesPage`, `ProjectsPage`, `ProjectDetailPage`, `ContactPage`, `PrivacyRoute`, `LgpdRoute`, `BlogPage` e `NotFound`. Só `HomePage` fica eager. Nenhum módulo de `src/sections/shared` ou das pastas por página é importado pelo entry, pelo `SiteLayout`, pelo `Header` ou pelo `Footer`.
- **Esqueletos regenerados por último** com `npm run measure:skeletons` (Task Z4), se a altura de qualquer seção lazy da home mudou, e `e2e/home.spec.ts --grep "skeleton heights"` verde.
- `frozenFiles.test.ts` verde: o canal de leads e `ContactForm.tsx` byte idênticos, e as duas páginas legais byte idênticas (Via 1) ou com o hash novo deliberado (Via 2 aprovada).
- O contrato por página (`describePageContract`) verde em `/`, `/servicos`, `/sobre`, `/projetos`, `/projetos/dizpara`, `/projetos/travel-ia`, `/contato`, `/privacidade`, `/lgpd`, `/blog` e no 404, em 320, 390, 768, 1024, 1440, celular deitado e fonte a 120%.
- `copy-rules.test.ts` e `pageHygiene.test.ts` verdes: sem travessão, sem " / ", sem a palavra proibida do produto antigo, sem `dark:`, `italic`, `text-[10px]`, gradiente decorativo ou cor fora da paleta, com a lista de exceções fechada e justificada.
- Nenhum número, cliente, resultado ou preço inventado. Texto novo marcado no PR como rascunho e revisado pelo Victor.
- Nenhum teste enviou o formulário nem tocou o n8n real.
- **Revisão de fechamento por lote** (um `closure reviewer` por lote, conferindo cada achado, Minor incluído) e uma revisão final de `main...HEAD`. Achados corrigidos, nada adiado.
- PR aberto como **rascunho**, nunca merge em `main` sem o ok do Victor.

## Self-review

- **Cobertura do pedido:** `PageHero` e `CtaBand` (A1, A2); `/servicos` (S1 a S5: grade com `SpotlightCard`, prazo, combos sem preço e sem desconto, FAQ, CtaBand); `/sobre` (U1 a U7: VN One, fundador com foto AVIF e WebP em 2 tamanhos por script em `scripts/`, método reusando `MethodSteps`, ferramentas sem editar a lista, CtaBand, texto do fundador idêntico); `/projetos` e caso (P1 a P6: cards em moldura de navegador com hover e spotlight, galeria, frase de destaque sem count-up, coluna sticky, próximo projeto, redirects e `noindex` mantidos); `/contato` (C1 a C4, formulário reusado intacto, JSON-LD mantido); legais (L1 a L5, texto byte idêntico e a pergunta explícita do ok); blog (B1 a B7); 404 (N1 a N3).
- **Divergências do spec tratadas:** projetos sem abas e sem campo de impacto, foto em `scripts/assets/`, blog fora do layout, `ROICalculator` legado, `.custom-scrollbar` que fica.
- **Lotes:** 4 em paralelo no máximo (S, U, P, C), arquivos sem sobreposição, exceções de arquivo compartilhado declaradas, ordem de merge A, S, U, P, C, N, B, L, Z.
- **Tipos coerentes:** `PageHeroProps`, `CtaBandProps` e `ServiceCardProps` são usados com as mesmas assinaturas nos lotes S, U, P, C, B. `describePageContract` nasce no A4 e é consumido por todo `e2e/page-*.spec.ts`. `founderVoice` (U1) alimenta `FounderIntro` e `Specialties` (U4).
- **Ordem interna:** U1 antes de U4 e U7 (a linha do `copy-rules` só entra com a remoção do `About.tsx`). U2 antes de U3. P2 antes de P3, P4 e P6. N1 e N2 antes de N3. B1 e B2 antes de B3 a B6. L1 e L2 antes de L3. A3 antes de P6.
