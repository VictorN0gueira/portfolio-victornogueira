# VN One v2 · Plano 1: Fundação + Home, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir a fundação do site e a home nova completa, sem a seção "Cases em Destaque", com o banner de compartilhamento já na marca VN One. A fundação inclui:
- tokens VN One e fontes;
- layout compartilhado;
- primitivos de UI e de movimento;
- lógica testada de ROI e de contato.

**Architecture:**
- Uma layout route (`SiteLayout`) passa a dar Header, Footer, WhatsApp e skip link a todas as páginas, menos `/blog`.
- A lógica pura (ROI, contato, telefone, formatação) sai dos componentes para `src/lib`, com testes Vitest.
- Os primitivos visuais ficam em `src/components/ui`, as seções da home em `src/sections/home` e a copy em `src/data`.
- O movimento usa só `motion/react` + CSS, respeitando `prefers-reduced-motion` e o "pausar animações" do widget de acessibilidade.
- As meta tags estáticas do `index.html` e o `og-banner.png` são o que WhatsApp, LinkedIn e Instagram leem, porque esses robôs não rodam JavaScript.

**Tech Stack:** React 19, Vite 6, Tailwind v4 (`@theme`), motion 12, react-router 7, Radix (dialog, popover, slot), class-variance-authority, Vitest 3 + Testing Library + jsdom, Playwright, sharp.

**Spec:** `docs/superpowers/specs/2026-10-26-redesign-vn-one-design.md`

**Planos seguintes (fora deste):**
- Plano 2: vídeos HyperFrames (loop do hero e filme).
- Plano 3: páginas internas, legais, blog e 404.
- Plano 4: copy final, SEO das páginas internas e QA.

## Global Constraints

- **Paleta**, sem nenhuma outra cor: `#FFFFFF` white, `#F2F2F2` cream, `#C7C7C7` gray-light, `#8A8A8A` gray-mid, `#4D4D4D` gray-dark, `#1A1A1A` ink, `#0A0A0A` black, `#00E5A0` accent. Chrome: `linear-gradient(135deg,#ffffff 0%,#c7c7c7 45%,#8a8a8a 100%)`.
- **Acento:**
  - no máximo 1 elemento em `#00E5A0` por seção;
  - como texto, só sobre `#0A0A0A`;
  - sobre fundo claro, só como fundo de forma com texto `#0A0A0A`;
  - CTAs nunca em acento.
- **Fontes:** Space Grotesk 400, 500 e 700 + JetBrains Mono 400 e 500, self-hosted em `public/fonts/`. Nenhuma outra família e nenhum Google Fonts.
- **Títulos** (`Heading`) em minúsculas via CSS `lowercase`, `letter-spacing: -0.03em`, `line-height` 0.92 a 0.98.
- **Kicker** em JetBrains Mono, caixa alta, `letter-spacing: 0.18em`, com régua 64×3px a 40% de opacidade.
- **Easing único** `cubic-bezier(.22,1,.36,1)` (`--ease-out`). Animar só `transform`, `opacity`, `clip-path`, `filter` e `stroke-dashoffset`.
- **Reveal:** um `useInView` por container, nunca `whileInView` por item.
- **Responsivo em qualquer aparelho:**
  - **Larguras:** mobile-first, sem scroll horizontal e sem texto cortado de 280px (Galaxy Fold fechado) até 2560px.
  - **Orientação:** celular deitado (844×390) e tablets em pé e deitados (768×1024, 1024×768, 820×1180).
  - **Altura de tela:** `100dvh`/`min-h-dvh` no lugar de `100vh`.
  - **Notch e safe-area:** elementos fixos (header, botão do WhatsApp) respeitam `env(safe-area-inset-*)` e `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
  - **Toque:** alvos de toque ≥ 44×44px.
  - **Tipografia:** fluida com `clamp()`; o layout aguenta a fonte em 120% (classe `a11y-font-large`) e o zoom de 200% do navegador.
  - **Sem hover:** o que depende de hover tem equivalente por toque e foco.
- **Copy:**
  - voz VN One ("a gente" ou "nós");
  - passar pelo `/humanizer:humanizer`;
  - **proibido `—` e `–`** em qualquer arquivo novo, em `src/data/**`, no `index.html` e no `SEO.tsx`;
  - **proibido " / " como separador** em `src/data/**`;
  - nunca inventar número, cliente ou resultado.
- **Webhooks n8n:**
  - URLs `https://n8n.vnone.com.br/webhook/portfolio-vn-email` e `https://n8n.vnone.com.br/webhook/portfolio-vn-whatsapp`;
  - chaves do payload exatamente `nome`, `email` ou `whatsapp`, `servico`, `mensagem` e `timestamp`;
  - WhatsApp no formato Evolution `55DDNNNNNNNN`;
  - POST direto do navegador e sem proxy;
  - nos testes, sempre interceptar com `page.route`.
- **WhatsApp oficial:** `5581984451243`.
- **Sem `console.log`** em código de produção.

## Review Focus

1. **Valor da hora vazio, 0 ou negativo no simulador:** os números mostram `R$ 0` e nunca `NaN` ou negativo. O teste fica na Task 3 (`roi.test.ts`, entradas inválidas) e na Task 15 (input vazio).
2. **Usuário com `prefers-reduced-motion` ou com "pausar animações" ligado:**
   - nada troca sozinho (abas, linhas do painel);
   - o painel do hero não inclina;
   - todo conteúdo fica visível com opacidade 1.

   Testes na Task 5 (`useCycle` desligado), na Task 8 (Reveal sem movimento) e na Task 19 (E2E com `reducedMotion: 'reduce'`).
3. **Aparelho fora do comum:** tela de 280px, celular deitado com 390px de altura, iPhone com notch, toque sem hover e fonte a 120%. Nada estoura a largura, o header não cobre o conteúdo e as pílulas e abas funcionam com toque. Testes na Task 5 (`useFinePointer`) e na Task 19 (matriz de dispositivos).
4. **Webhook responde erro (500) ou a rede cai:** aparece a mensagem com o link de WhatsApp e, depois de fechar o aviso, dá para reenviar. Teste na Task 17 (E2E com `route.fulfill({status:500})` e `route.abort()`).
5. **Link colado no WhatsApp:** a prévia mostra o título, a descrição e a imagem novos da VN One, e na miniatura quadrada que o WhatsApp corta do centro aparecem a logo e a frase. Teste na Task 2B (meta do HTML gerado, dimensões do PNG e captura do recorte central 630×630).

---

## Estrutura de arquivos

```
src/
  styles/tokens.css                 (novo) @font-face, @theme VN One, @property, keyframes base
  index.css                         (mod)  importa tokens; remove dark/glass; reduced-motion
  test/setup.ts                     (novo) jest-dom, mocks de IntersectionObserver/matchMedia/ResizeObserver
  test/copy-rules.test.ts           (novo) guarda: sem —, – em arquivos novos; sem " / " em src/data
  lib/roi.ts (+ .test.ts)           (novo) fórmula única de ROI
  lib/phone.ts (+ .test.ts)         (novo) formatWhatsappDisplay, toEvolutionFormat (movidos)
  lib/contact.ts (+ .test.ts)       (novo) WEBHOOKS, validateContact, buildContactPayload
  lib/format.ts (+ .test.ts)        (novo) parseStat, formatBRL, formatBRLCompact
  lib/site.ts (+ .test.ts)          (novo) SITE: nome, título, descrição, og image, telefone (fonte única de meta)
  lib/constants.ts                  (mod)  WHATSAPP_NUMBER, whatsappUrl(), CONTACT_EMAIL, SOCIAL_LINKS
  hooks/useCycle.ts (+ .test.ts)    (novo)
  hooks/useFinePointer.ts (+ .test.ts) (novo)
  hooks/useMotionAllowed.ts (+ .test.tsx) (novo)
  hooks/usePointerSpotlight.ts (+ .test.tsx) (novo)
  hooks/useMagnetic.ts (+ .test.tsx) (novo)
  components/SEO.tsx (+ .test.tsx)  (mod)  marca VN One, Organization JSON-LD
  components/ui/                    (novo) Button, Container, Section, Kicker, Heading, Cursor,
                                           ScanGrid, Logo, BrandIcon, Reveal, CountUp, Marquee,
                                           SpotlightCard, WindowFrame, Accordion, ChoicePill
  components/layout/                (novo) SiteLayout, MotionProvider, Header, MobileMenu, Footer,
                                           ScrollProgress, WhatsAppButton, SkipLink
  sections/home/                    (novo) HeroSection, HeroSentence, AutomationPanel,
                                           IntegrationsMarquee, StatementStats, UseCaseTabs,
                                           ServicesCards, MethodSteps, RoiSimulator, Testimonials,
                                           ClientGrid, FaqSection, FinalCta
  data/                             (novo) brandIcons.ts, integrations.ts, stats.ts, process.ts,
                                           testimonials.ts, partners.ts, useCases.ts, heroFlows.ts,
                                           homeCopy.ts, navigation.ts
  data/services.ts, faqs.ts, projects.ts (mod) passe de copy (sem —, sem " / ", voz VN One)
  components/ContactForm.tsx        (mod)  usa lib/contact + lib/phone; visual novo
  components/ROICalculator.tsx      (mod)  usa lib/roi (página /contato até o Plano 3)
  App.tsx, main.tsx, pages/*.tsx    (mod)  layout route; páginas sem Header/Footer/Chatbot próprios
  (remover) Hero, HeroBackground, Stats, ProjectsTeaser, SocialProof, CTASection, Process,
            FloatingIcons, CustomCursor, ThemeToggle, Chatbot, contexts/ThemeContext
index.html                           (mod)  viewport-fit, fontes, favicon, meta OG/Twitter VN One
public/fonts/*.woff2, public/brand/*, public/og-banner.png (novos ou regerados)
scripts/build-brand-assets.mjs       (novo)
scripts/generate-og-banner.mjs       (reescrito) banner no sistema VN One, fontes e logo locais
e2e/*.spec.ts, playwright.config.ts  (novos)
```

---

### Task 0: Branch, dependências e infraestrutura de testes

**Files:**
- Modify: `package.json` (scripts e devDependencies)
- Modify: `vite.config.ts` (bloco `test`; remover os 4 `console.log` de debug das linhas 9 a 13)
- Create: `src/test/setup.ts`, `playwright.config.ts`, `src/lib/utils.test.ts`

**Interfaces:**
- Produces:
  - `npm test` (vitest run), `npm run test:watch`, `npm run coverage`, `npm run e2e` (playwright test).
  - jsdom com `IntersectionObserver`, `ResizeObserver` e `matchMedia` mockados globalmente. `matchMedia` devolve `matches:false` por padrão e pode ser sobrescrito com `vi.stubGlobal`.

- [ ] **Step 1:** `git checkout -b redesign/vn-one-v2`, depois `npm ci`.
- [ ] **Step 2:** `npm i -D vitest@^3.2 @vitest/coverage-v8@^3.2 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom`
- [ ] **Step 3:** Em `vite.config.ts`:
  - acrescentar `/// <reference types="vitest/config" />` e o bloco `test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', css: true, exclude: ['e2e/**','node_modules/**'], coverage: { provider: 'v8', include: ['src/lib/**','src/hooks/**'], exclude: ['**/*.test.*'], thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 } } }`;
  - remover os `console.log` de debug.
- [ ] **Step 4:** Scripts em `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`, `"coverage": "vitest run --coverage"`, `"e2e": "playwright test"`.
- [ ] **Step 5:** `playwright.config.ts`:
  - `testDir: 'e2e'`;
  - `webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 180000 }`;
  - `use.baseURL 'http://localhost:4173'`;
  - projects `desktop` (Desktop Chrome, 1440×900) e `mobile` (Pixel 7).
- [ ] **Step 6:** Teste de fumaça `src/lib/utils.test.ts`:
  ```ts
  import { cn } from './utils';
  it('cn mescla e resolve conflitos do tailwind', () => {
    expect(cn('px-2 py-1', false && 'x', 'px-4')).toBe('py-1 px-4');
  });
  ```
- [ ] **Step 7:** Rodar `npm test`. Esperado: 1 passed. Rodar `npx playwright --version`. Se o Chromium da versão instalada faltar, rodar `npx playwright install chromium`.
- [ ] **Step 8:** Commit: `git add -A && git commit -m "chore: vitest, testing-library and playwright setup"` (mais o spec e este plano em `docs/superpowers/`).

---

### Task 1: Tokens VN One, fontes e CSS global

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/tokens.test.ts`
- Copy:
  - `C:\Users\santo\Documents\Github\VN One\4 - Time\Designer\Identidade Visual\fontes\{SpaceGrotesk-Regular,SpaceGrotesk-Medium,SpaceGrotesk-Bold,JetBrainsMono-Regular,JetBrainsMono-Medium}.woff2` → `public/fonts/`
- Modify:
  - `src/index.css` (todo o arquivo);
  - `index.html`:
    - linha 5: viewport com `viewport-fit=cover`;
    - linhas 9 a 15: tirar os preconnects, o link do Google Fonts e o preload do logo MinIO, e pôr o preload `/fonts/SpaceGrotesk-Bold.woff2` com `as="font" type="font/woff2" crossorigin`;
    - linha 21: `theme-color` `#0A0A0A`.

**Interfaces:**
- Produces:
  - classes Tailwind `bg-vn-cream`, `text-vn-ink`, `bg-vn-black`, `text-vn-accent`, `border-vn-gray-light`, … (de `--color-vn-*`);
  - `font-display` e `font-sans` (Space Grotesk), `font-mono` (JetBrains Mono);
  - `--ease-out`;
  - `@property --vn-angle` (para a borda cônica);
  - utilitários `.vn-chrome-text` (texto com o gradiente chrome), `.vn-scan-grid` e `.pt-safe`, `.pb-safe`, `.pr-safe` (com `env(safe-area-inset-*)`).

- [ ] **Step 1: Teste de contrato** `src/styles/tokens.test.ts` (com `// @vitest-environment node`). Ele lê `tokens.css` com `fs` e verifica:
  ```ts
  const expected = { white:'#ffffff', cream:'#f2f2f2', 'gray-light':'#c7c7c7', 'gray-mid':'#8a8a8a',
    'gray-dark':'#4d4d4d', ink:'#1a1a1a', black:'#0a0a0a', accent:'#00e5a0' };
  for (const [k, v] of Object.entries(expected))
    expect(css.toLowerCase()).toContain(`--color-vn-${k}: ${v}`);
  expect(css).toContain('--ease-out: cubic-bezier(.22, 1, .36, 1)');
  expect(css).toContain('env(safe-area-inset-top)');
  expect(css).not.toMatch(/fonts\.googleapis/);
  ```
- [ ] **Step 2:** Rodar `npx vitest run src/styles`. Esperado: FAIL (arquivo não existe).
- [ ] **Step 3:** Criar `tokens.css`:
  - `@font-face` para as 5 fontes com `font-display: swap`;
  - `@theme { --color-vn-*: …; --font-sans: "Space Grotesk", ui-sans-serif, system-ui, sans-serif; --font-display: same; --font-mono: "JetBrains Mono", ui-monospace, monospace; --ease-out: cubic-bezier(.22, 1, .36, 1); --radius-card: 24px; --radius-shell: 40px; }`;
  - `@property --vn-angle { syntax:'<angle>'; inherits:false; initial-value:0deg }`;
  - `@keyframes vn-spin { to { --vn-angle: 360deg } }`, `vn-marquee { to { transform: translateX(-50%) } }`, `vn-blink { 50% { opacity: 0 } }`, `vn-scan { from { transform: translateY(-10vh) } to { transform: translateY(110vh) } }`;
  - os utilitários de safe-area.
- [ ] **Step 4:** Reescrever `src/index.css`:
  - `@import "tailwindcss"; @import "./styles/tokens.css";`;
  - `body { @apply bg-vn-cream text-vn-ink font-sans antialiased overflow-x-hidden }`;
  - `html { -webkit-text-size-adjust: 100% }`;
  - selection ink sobre white;
  - manter as classes `a11y-*`, `.scrollbar-hide` e o glitch do 404;
  - **remover** `@variant dark`, `.dark {…}`, `.glass*`, `.text-gradient*`, `.shimmer` e o bloco `.roi-slider` dark;
  - acrescentar `@media (prefers-reduced-motion: reduce) { *,:before,:after { scroll-behavior:auto!important; animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important } }`;
  - `html { scroll-behavior: smooth; scroll-padding-top: 96px }` só dentro de `@media (prefers-reduced-motion: no-preference)`. O `scroll-padding-top` fica sempre, para o header fixo não cobrir a âncora.
- [ ] **Step 5:** Rodar `npx vitest run src/styles` (esperado: PASS) e `npm run build` (esperado: build ok; o site fica claro porque o modo escuro saiu).
- [ ] **Step 6:** Commit: `feat: VN One design tokens and self-hosted brand fonts`.

---

### Task 2: Assets de marca e componente Logo

**Files:**
- Create: `scripts/build-brand-assets.mjs`, `src/components/ui/Logo.tsx`, `src/components/ui/Logo.test.tsx`
- Generate:
  - `public/brand/vn-one-logo-chrome.webp`, `public/brand/vn-one-logo-dark.webp` (altura 96px, `trim()`);
  - `public/brand/vn-one-logo-chrome.png` (altura 240px, para o banner OG);
  - `public/brand/favicon-32.png` e `public/brand/apple-touch-icon.png` (180×180, logo chrome centralizada sobre `#0A0A0A`).
- Modify: `index.html` (favicon e apple-touch-icon apontando para `/brand/...`); `src/lib/constants.ts` (remover `LOGO_URL`).

**Interfaces:**
- Produces: `Logo({ variant: 'onLight' | 'onDark', className?: string })` → `<img alt="VN One" width height decoding="async">`. `onLight` usa a versão dark e `onDark` usa a chrome.

- [ ] **Step 1:** Escrever `Logo.test.tsx`: `render(<Logo variant="onLight" />)` tem `getByAltText('VN One')` com `src` terminando em `/brand/vn-one-logo-dark.webp`, e `onDark` termina em `vn-one-logo-chrome.webp`. Os dois têm `width` e `height` definidos.
- [ ] **Step 2:** Rodar o teste. Esperado: FAIL.
- [ ] **Step 3:** Escrever `scripts/build-brand-assets.mjs` (sharp, já é devDependency). A origem é `C:\Users\santo\Documents\Github\VN One\4 - Time\Designer\Identidade Visual\logo\vn-one-logo{,-dark}.png`, recebida via `process.argv[2]` para não fixar caminho de máquina no repo. Rodar `node scripts/build-brand-assets.mjs "<pasta logo>"` e anotar a largura final gerada para usar em `Logo.tsx`.
- [ ] **Step 4:** Implementar `Logo.tsx`. Trocar todas as importações de `LOGO_URL` (Header e Footer antigos) por `<Logo>` ou, onde o arquivo vai ser removido na Task 18, só removê-las. O `grep -r LOGO_URL src` tem que terminar vazio.
- [ ] **Step 5:** Rodar o teste (esperado: PASS) e `npm run build`.
- [ ] **Step 6:** Commit: `feat: brand logo assets and Logo component`.

---

### Task 2B: Banner de compartilhamento e meta tags VN One

O preview que aparece ao colar `https://vnone.com.br/` no WhatsApp ainda diz "Victor Nogueira | Automação Inteligente & IA", com travessão na descrição. WhatsApp, LinkedIn, Facebook e Instagram não executam JavaScript, então o que vale é o **`index.html` estático** e o **`public/og-banner.png`**. O `SEO.tsx` (Helmet) serve ao Google e às trocas de rota.

**Files:**
- Create: `src/lib/site.ts`, `src/lib/site.test.ts`, `src/components/SEO.test.tsx`, `e2e/share-preview.spec.ts`
- Modify: `index.html` (linhas 6, 17 a 21 e 27 a 44), `src/components/SEO.tsx` (todo), `scripts/generate-og-banner.mjs` (reescrever), `package.json` (script `"og": "node scripts/generate-og-banner.mjs"`)
- Generate: `public/og-banner.png` (1200×630)

**Interfaces:**
- Consumes: as fontes da Task 1 (`public/fonts`), o logo chrome da Task 2 (`public/brand/vn-one-logo-chrome.png`) e os tokens.
- Produces:
  ```ts
  // site.ts, fonte única dos textos de compartilhamento (index.html copia os mesmos valores)
  export const SITE = {
    name: 'VN One',
    url: 'https://vnone.com.br',
    title: 'VN One | Automação e IA para empresas',
    description: 'A gente automatiza o trabalho repetitivo da sua empresa com IA e conecta as ferramentas que você já usa. Conversa de 30 minutos, sem compromisso.',
    ogImage: 'https://vnone.com.br/og-banner.png?v=3',
    ogImageAlt: 'VN One, automação e IA para empresas',
    telephone: '+55-81-98445-1243',
    email: 'contato@vnone.com.br',
  } as const;
  export function pageTitle(title?: string): string; // title ? `${title} | VN One` : SITE.title
  ```
- **SEO.tsx:**
  - usa `SITE` e `pageTitle`;
  - `og:site_name` passa a ser "VN One";
  - o JSON-LD da home troca `Person` por `Organization` (`name`, `url`, `logo` em `https://vnone.com.br/brand/vn-one-logo-dark.webp`, `email`, `telephone`, `founder: { '@type': 'Person', name: 'Victor Nogueira', sameAs: [LinkedIn, GitHub] }`, `areaServed: 'BR'`);
  - `WebSite.name` passa a ser "VN One";
  - fica sem `keywords` duplicadas com travessão.
- **Banner OG** (`scripts/generate-og-banner.mjs`, Playwright em 1200×630, `deviceScaleFactor: 1`):
  - fundo `#0A0A0A`, grade 64px a `rgba(255,255,255,.045)` e uma linha de scan horizontal (a capa da palestra);
  - `@font-face` apontando para `file://…/public/fonts/*.woff2`, sem rede;
  - **zona segura central de 630×630** (o WhatsApp corta a miniatura em quadrado do centro). Dentro dela ficam:
    - o logo chrome (altura 120px);
    - o kicker mono `AUTOMAÇÃO E IA PARA EMPRESAS` em `#8A8A8A`;
    - o título em minúsculas Space Grotesk 700, 64px, `line-height .95`: `o trabalho repetitivo vai pros fluxos`, com a palavra `fluxos` em `#00E5A0` (o único acento, sobre fundo escuro);
  - fora da zona, à direita e embaixo, `vnone.com.br` em mono `#8A8A8A`.
  - Saída em `public/og-banner.png`.
  - O script também salva `e2e/__shots__/og-square.png` (recorte central 630×630) para conferência.
- **index.html:**
  - `<title>`, `description`, `author` ("VN One"), `og:site_name`, `og:title`, `og:description`, `og:image` (`?v=3`), `og:image:alt`, `twitter:*` com os mesmos valores de `SITE`;
  - remover `keywords`;
  - nenhum `—`.

- [ ] **Step 1: Testes:**
  - `site.test.ts`:
    - `pageTitle()` igual a `'VN One | Automação e IA para empresas'`;
    - `pageTitle('Serviços')` igual a `'Serviços | VN One'`;
    - `SITE.description.length` ≤ 160;
    - nenhum valor de `SITE` casa `/[—–]/`.
  - `SEO.test.tsx`:
    - render com `HelmetProvider context={ctx}` e `<SEO />`;
    - `ctx.helmet.title.toString()` contém `VN One | Automação e IA para empresas`;
    - o script JSON-LD contém `"@type":"Organization"` e `"founder"`.
  - `e2e/share-preview.spec.ts` (sem JS: `page.request.get('/')` e parse do HTML cru):
    - `og:title` igual a `SITE.title`;
    - `og:image` termina em `og-banner.png?v=3`;
    - `og:image:width` 1200 e `height` 630;
    - nenhum `content` com `—`;
    - `GET /og-banner.png` responde 200 com `content-type image/png`.
  - Nesse mesmo spec, com `sharp(buffer).metadata()`: `width===1200` e `height===630`.
- [ ] **Step 2:** Rodar `npx vitest run src/lib/site src/components/SEO` e `npx playwright test e2e/share-preview.spec.ts`. Esperado: FAIL.
- [ ] **Step 3:** Implementar `site.ts`, `SEO.tsx`, o `index.html` e o script, depois rodar `npm run og`.
- [ ] **Step 4:** Abrir e olhar `public/og-banner.png` e `e2e/__shots__/og-square.png`. O quadrado tem que mostrar a logo e a frase inteiras, legíveis em miniatura (imagem reduzida para 120px ainda identifica a marca).
- [ ] **Step 5:** Rodar os testes de novo. Esperado: PASS.
- [ ] **Step 6:** Commit: `feat: VN One share banner and static meta tags`.

> **Nota para o Victor:** o WhatsApp guarda a prévia em cache por link. A versão `?v=3` na imagem força a busca da nova nos compartilhamentos novos. Conversas antigas continuam mostrando a prévia velha. Depois do deploy, dá para conferir a prévia no LinkedIn Post Inspector e no Facebook Sharing Debugger.

---

### Task 3: `lib/roi.ts`, a fórmula única de ROI (TDD)

**Files:**
- Create: `src/lib/roi.ts`, `src/lib/roi.test.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`
- Modify: `src/components/ROICalculator.tsx`, que passa a importar `TEAM_OPTIONS`, `annualManualCost`, `annualSavings`, `formatBRL`, `formatBRLCompact` e `buildQuoteMessage`. Remover as cópias locais. O `WA_LINK` local passa a usar `whatsappUrl` quando a Task 6 existir; até lá, fica.

**Interfaces:**
- Produces:
  ```ts
  export type RoiInput = { hoursPerWeek: number; teamMultiplier: number; hourlyRate: number };
  export const TEAM_OPTIONS: readonly { label: string; value: number }[];
    // [{'1 pessoa',1},{'2 a 3 pessoas',2.5},{'4 a 10 pessoas',7},{'mais de 10 pessoas',15}]
  export const DEFAULT_HOURLY_RATE = 50; export const SAVINGS_RATE = 0.8; export const WEEKS_PER_YEAR = 52;
  export const HERO_HOUR_OPTIONS = [5, 10, 20, 40] as const;
  export function annualManualCost(i: RoiInput): number;  // round(h × team × rate × 52)
  export function annualSavings(i: RoiInput): number;     // round(h × team × rate × 52 × 0.8)
  export function monthlySavings(i: RoiInput): number;    // round(h × team × rate × 52 × 0.8 ÷ 12)
  export function buildQuoteMessage(i: RoiInput): string;
  // format.ts
  export function formatBRL(v: number): string;        // pt-BR currency, 0 casas: 'R$ 1.733'
  export function formatBRLCompact(v: number): string; // ≥1e6 'R$ 1.2M', ≥1e3 'R$ 78K', senão formatBRL
  export function parseStat(v: string): { num: number; suffix: string } | null; // '500h+' → {500,'h+'}
  ```
  Entrada não finita ou negativa em qualquer campo vale 0.

- [ ] **Step 1: Testes** `roi.test.ts`:
  ```ts
  it('mantém o resultado do ROICalculator atual', () => {
    expect(annualManualCost({ hoursPerWeek: 12, teamMultiplier: 2.5, hourlyRate: 50 })).toBe(78000);
    expect(annualSavings({ hoursPerWeek: 12, teamMultiplier: 2.5, hourlyRate: 50 })).toBe(62400);
  });
  it('mensal do hero (equipe 1, R$ 50/h)', () => {
    const m = (h: number) => monthlySavings({ hoursPerWeek: h, teamMultiplier: 1, hourlyRate: 50 });
    expect([5, 10, 20, 40].map(m)).toEqual([867, 1733, 3467, 6933]);
  });
  it('entrada inválida vira zero', () => {
    for (const bad of [NaN, -5, Infinity])
      expect(annualSavings({ hoursPerWeek: bad, teamMultiplier: 1, hourlyRate: 50 })).toBe(0);
    expect(monthlySavings({ hoursPerWeek: 10, teamMultiplier: 1, hourlyRate: NaN })).toBe(0);
  });
  it('mensagem de orçamento sem travessão nem barra', () => {
    const msg = buildQuoteMessage({ hoursPerWeek: 12, teamMultiplier: 2.5, hourlyRate: 50 });
    expect(msg).toBe('Olá, VN One! Usei a calculadora do site: a gente perde cerca de R$\u00a078.000 por ano com tarefas manuais (12h por semana). Quero automatizar esse processo.');
    expect(msg).not.toMatch(/[—–/]/);
  });
  it('labels de equipe sem travessão', () => {
    expect(TEAM_OPTIONS.map((o) => o.label)).toEqual(['1 pessoa', '2 a 3 pessoas', '4 a 10 pessoas', 'mais de 10 pessoas']);
  });
  ```
  `format.test.ts`:
  - `formatBRL(1733) === 'R$\u00a01.733'`;
  - `formatBRLCompact(78000) === 'R$ 78K'`;
  - `formatBRLCompact(1_250_000) === 'R$ 1.3M'`;
  - `parseStat('500h+')` igual a `{num:500,suffix:'h+'}`;
  - `parseStat('85%')` igual a `{num:85,suffix:'%'}`;
  - `parseStat('24h')` igual a `{num:24,suffix:'h'}`;
  - `parseStat('ilimitado') === null`.
- [ ] **Step 2:** Rodar `npx vitest run src/lib/roi src/lib/format`. Esperado: FAIL.
- [ ] **Step 3:** Implementar `roi.ts` e `format.ts`. Trocar no `ROICalculator.tsx` a fórmula e os formatadores locais pelos importados. A mensagem do CTA passa a ser `buildQuoteMessage`.
- [ ] **Step 4:** Rodar os testes (esperado: PASS) e `npm run lint`.
- [ ] **Step 5:** Commit: `feat: single tested ROI formula shared by hero and simulator`.

---

### Task 4: `lib/phone.ts` e `lib/contact.ts`, o contrato dos webhooks (TDD)

**Files:**
- Create: `src/lib/phone.ts`, `src/lib/phone.test.ts`, `src/lib/contact.ts`, `src/lib/contact.test.ts`
- Modify:
  - `src/components/ContactForm.tsx`: remover `WEBHOOKS`, `formatWhatsappDisplay` e `toEvolutionFormat` locais (linhas 11 a 59); a validação local (linhas 90 a 105) passa a usar `validateContact`, e o payload (linhas 113 a 119) passa a usar `buildContactPayload`. O visual fica igual nesta task.

**Interfaces:**
- Produces:
  ```ts
  // phone.ts (comportamento idêntico ao atual, movido)
  export function formatWhatsappDisplay(raw: string): string;
  export function toEvolutionFormat(raw: string): string;
  // contact.ts
  export const WEBHOOKS = { email: 'https://n8n.vnone.com.br/webhook/portfolio-vn-email',
                            whatsapp: 'https://n8n.vnone.com.br/webhook/portfolio-vn-whatsapp' } as const;
  export type ContactMethod = 'email' | 'whatsapp';
  export type ContactFields = { nome: string; email: string; whatsapp: string; mensagem: string; servico: string };
  export type ContactErrors = Partial<Record<keyof ContactFields, string>>;
  export function validateContact(f: ContactFields, method: ContactMethod): ContactErrors;
  export function buildContactPayload(f: ContactFields, method: ContactMethod, now: Date):
    { nome: string; servico: string; mensagem: string; timestamp: string } & ({ email: string } | { whatsapp: string });
  ```

- [ ] **Step 1: Testes** `phone.test.ts`, que fixam o comportamento atual:
  - `toEvolutionFormat('+55 81 9 8445-1243') === '558184451243'`;
  - `toEvolutionFormat('81984451243') === '558184451243'`;
  - `toEvolutionFormat('8184451243') === '558184451243'`;
  - `formatWhatsappDisplay('81984451243') === '+55 81 9 8445-1243'`;
  - `formatWhatsappDisplay('') === '+55 '`;
  - `formatWhatsappDisplay('5581') === '+55 81'`.

  `contact.test.ts`:
  ```ts
  const ok = { nome: 'Ana Lima', email: 'ana@empresa.com.br', whatsapp: '+55 81 9 8445-1243',
               mensagem: 'Quero automatizar notas fiscais', servico: 'Automação de processos' };
  it('aceita formulário válido', () => { expect(validateContact(ok, 'email')).toEqual({}); });
  it('exige nome, mensagem e serviço', () => {
    const e = validateContact({ ...ok, nome: ' ', mensagem: 'oi', servico: '' }, 'email');
    expect(Object.keys(e).sort()).toEqual(['mensagem', 'nome', 'servico']);
  });
  it('valida e-mail só no método email', () => {
    expect(validateContact({ ...ok, email: 'ana@' }, 'email').email).toBeTruthy();
    expect(validateContact({ ...ok, email: '' }, 'whatsapp').email).toBeUndefined();
  });
  it('valida whatsapp com DDD (10 ou 11 dígitos locais)', () => {
    expect(validateContact({ ...ok, whatsapp: '+55 81 9' }, 'whatsapp').whatsapp).toBeTruthy();
  });
  it('payload email tem exatamente as chaves legadas + servico', () => {
    const p = buildContactPayload(ok, 'email', new Date('2026-10-26T12:00:00Z'));
    expect(Object.keys(p).sort()).toEqual(['email', 'mensagem', 'nome', 'servico', 'timestamp']);
    expect(p).toMatchObject({ email: 'ana@empresa.com.br', timestamp: '2026-10-26T12:00:00.000Z' });
  });
  it('payload whatsapp usa formato Evolution', () => {
    const p = buildContactPayload(ok, 'whatsapp', new Date('2026-10-26T12:00:00Z'));
    expect(Object.keys(p).sort()).toEqual(['mensagem', 'nome', 'servico', 'timestamp', 'whatsapp']);
    expect(p).toMatchObject({ whatsapp: '558184451243' });
  });
  ```
  Regras: o `nome` aparado precisa de ≥ 2 caracteres. O e-mail usa `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`. A `mensagem` aparada precisa de ≥ 10 caracteres. O `servico` não pode ser vazio. O WhatsApp precisa de 10 ou 11 dígitos locais.

  Mensagens de erro (copy fixa):
  - nome: `'Conta pra gente seu nome'`;
  - email: `'Esse e-mail parece incompleto'`;
  - whatsapp: `'Coloca o número com DDD, por exemplo 81 99999-9999'`;
  - mensagem: `'Escreve um pouco mais sobre o que você precisa'`;
  - servico: `'Escolhe um serviço'`.

  O payload envia `nome` e `mensagem` aparados com `trim()`.
- [ ] **Step 2:** Rodar `npx vitest run src/lib/phone src/lib/contact`. Esperado: FAIL.
- [ ] **Step 3:** Implementar os dois arquivos e religar o `ContactForm.tsx`. Os erros passam a aparecer também para nome, e-mail e mensagem, com `aria-invalid` e `aria-describedby` em cada campo e `<p id="contact-<campo>-error" role="alert">`.
- [ ] **Step 4:** Rodar os testes (esperado: PASS) e `npm run lint`.
- [ ] **Step 5:** Commit: `feat: tested contact validation and webhook payload contract`.

---

### Task 5: Hooks de movimento e interação (TDD)

**Files:**
- Create: `src/hooks/useCycle.ts`, `src/hooks/useFinePointer.ts`, `src/hooks/useMotionAllowed.ts`, `src/hooks/usePointerSpotlight.ts`, `src/hooks/useMagnetic.ts` + `.test.ts(x)` de cada um.

**Interfaces:**
- Consumes: `useAccessibility()` de `src/contexts/AccessibilityContext.tsx` (`state.noAnimations`) e `useReducedMotion()` de `motion/react`.
- Produces:
  ```ts
  export function useMotionAllowed(): boolean; // !(prefers-reduced-motion || a11y.noAnimations)
  export function useFinePointer(): boolean;   // matchMedia('(hover: hover) and (pointer: fine)') via useSyncExternalStore
  export function useCycle(length: number, intervalMs: number, opts?: { enabled?: boolean }):
    { index: number; select: (i: number) => void; pause: () => void; resume: () => void; isAuto: boolean };
  export function usePointerSpotlight<T extends HTMLElement>(): { ref: React.RefObject<T | null>;
    onPointerMove: (e: React.PointerEvent<T>) => void }; // seta --mx/--my em px no elemento
  export function useMagnetic<T extends HTMLElement>(strength?: { x: number; y: number }): {
    ref: React.RefObject<T | null>; onPointerMove: (e: React.PointerEvent<T>) => void; onPointerLeave: () => void };
  // default strength {x:.18,y:.3}; ativo só se useFinePointer() && useMotionAllowed()
  ```
  `useCycle`:
  - avança a cada `intervalMs` quando `enabled !== false`, não está pausado, está em modo auto e `document.visibilityState === 'visible'`;
  - `select(i)` fixa o índice e desliga o modo auto de vez (`isAuto=false`);
  - `pause`/`resume` servem para hover e foco.

- [ ] **Step 1: Testes** (com `vi.useFakeTimers()`):
  - `useCycle(4, 1000)`: após 1000ms `index===1`; após 4000ms volta a 0;
  - `pause()` congela e `resume()` continua;
  - `select(2)` fixa 2, deixa `isAuto===false` e não avança mais;
  - `enabled:false` nunca avança;
  - com `visibilityState` `'hidden'` (via `Object.defineProperty`) não avança;
  - `unmount()` deixa `vi.getTimerCount()===0`.
  - `useFinePointer`: com `matchMedia` mockado `matches:true` dá `true`, e `false` quando o mock retorna `false`.
  - `useMotionAllowed`: com `AccessibilityProvider` e `noAnimations` salvo em localStorage `a11y-preferences` como `{"noAnimations":true}` dá `false`; sem nada dá `true` (e `useReducedMotion` mockado como `false`).
  - `usePointerSpotlight`: `fireEvent.pointerMove(el,{clientX:30,clientY:40})` com `getBoundingClientRect` `{left:10,top:10}` gera `el.style.getPropertyValue('--mx')==='20px'` e `--my` `'30px'`.
  - `useMagnetic`: com `matches:true`, mover para o canto direito do elemento 100×40 gera transform `translate(9px, 0px)` (centro +50px × 0.18). `pointerLeave` zera o transform.
- [ ] **Step 2:** Rodar `npx vitest run src/hooks`. Esperado: FAIL.
- [ ] **Step 3:** Implementar os cinco hooks. Todo `setInterval` e listener tem cleanup.
- [ ] **Step 4:** Rodar `npx vitest run src/hooks` (esperado: PASS) e `npm run coverage` (esperado: `src/hooks` ≥ 80%).
- [ ] **Step 5:** Commit: `feat: motion and pointer hooks with reduced-motion awareness`.

---

### Task 6: Dados centralizados e passe de copy nos dados existentes

**Files:**
- Modify:
  - `src/lib/constants.ts`: remover `isTouchDevice` só na Task 18, depois que os últimos usuários saírem;
  - `src/data/services.ts`, `src/data/faqs.ts`, `src/data/projects.ts`.
- Create: `src/test/copy-rules.test.ts`, `src/data/navigation.ts`, `src/data/stats.ts`, `src/data/process.ts`, `src/data/testimonials.ts`, `src/data/partners.ts`, `src/data/brandIcons.ts`, `src/data/integrations.ts`.

**Interfaces:**
- Produces:
  ```ts
  // constants.ts
  export const WHATSAPP_NUMBER = '5581984451243';
  export function whatsappUrl(text: string): string; // 'https://wa.me/5581984451243?text=' + encodeURIComponent(text)
  export const WHATSAPP_DISPLAY = '(81) 98445-1243';
  export const CONTACT_EMAIL = 'contato@vnone.com.br';
  export const SOCIAL_LINKS: { label: 'LinkedIn' | 'GitHub' | 'Instagram'; href: string }[]; // URLs do Footer.tsx atual
  export const WHATSAPP_FALLBACK_URL: string; // whatsappUrl('Olá! Tentei usar o formulário do site da VN One.')
  // navigation.ts
  export const MAIN_NAV: { label: string; to: string }[];
  // [Serviços /servicos, Como funciona /#metodo, Clientes /#clientes, Projetos /projetos, Sobre /sobre, Blog /blog]
  export const PRIMARY_CTA = { label: 'Vamos conversar', to: '/contato' };
  // stats.ts
  export type Stat = { value: string; label: string; description: string };
  export const stats: Stat[];
  // process.ts
  export type ProcessStep = { number: '01'|'02'|'03'|'04'; title: string; duration: string; description: string };
  export const processSteps: ProcessStep[];
  // testimonials.ts / partners.ts
  export type Testimonial = { id: number; name: string; role: string; company: string; logo: string;
                              text: string; logoFit?: 'contain' | 'cover'; isDraft?: boolean };
  export const testimonials: Testimonial[]; export const partners: { name: string; logo: string }[];
  // brandIcons.ts / integrations.ts
  export const brandIcons: Record<BrandIconId, { title: string; path: string }>; // paths Simple Icons (CC0)
  export type BrandIconId = 'whatsapp'|'n8n'|'supabase'|'claude'|'googlesheets'|'googledrive'|'gmail'
    |'googlecalendar'|'notion'|'hubspot'|'shopify'|'trello'|'telegram'|'instagram'|'googlegemini';
  export const integrations: { id: BrandIconId; label: string }[];
  ```

- [ ] **Step 1: Teste guarda** `src/test/copy-rules.test.ts` (com `// @vitest-environment node`):
  - varre recursivamente com `fs` `src/data`, `src/sections`, `src/components/ui`, `src/components/layout`, `src/hooks` e `src/lib`, ignorando `*.test.*`, mais os arquivos `index.html` e `src/components/SEO.tsx`;
  - nenhum arquivo pode conter `—` ou `–`;
  - em `src/data`, nenhum literal pode casar `/['"`][^'"`]* \/ [^'"`]*['"`]/`;
  - na falha, mostra o arquivo e a linha.
- [ ] **Step 2:** Rodar `npx vitest run src/test/copy-rules`. Esperado: FAIL (services.ts, faqs.ts e projects.ts têm `—` ou " / ").
- [ ] **Step 3:** Passe de copy com o `/humanizer:humanizer` em modo embutido nos três arquivos existentes. As regras:
  - trocar `—` por vírgula, ponto ou dois-pontos e " / " por "e", "ou" ou vírgula;
  - `'~1 semana'` vira `'cerca de 1 semana'`;
  - `'Landing Page / Site'` vira `'Landing page ou site'`;
  - nos FAQs, passar de "eu" para "a gente" (VN One);
  - não mudar fatos, prazos nem descontos.
  - `serviceOptions` vira `['Automação de processos', 'Agente de IA ou chatbot', 'Site ou landing page', 'Sistema web sob medida', 'Combo de site e automação', 'Ainda não sei, quero orientação']`.
  - **Atenção:** esse é o texto que chega no campo `servico` do n8n. As chaves não mudam, só o texto do valor. Anotar no commit.
- [ ] **Step 4:** Criar os dados novos:
  - `stats` de `Stats.tsx` linhas 8 a 29, mantendo os valores `500h+`, `100+`, `10+` e `85%`. Labels: "Horas economizadas por mês", "Fluxos de automação ativos", "Empresas atendidas" e "Aumento médio de eficiência". Descrições sem barra ("rodando 24 horas, todos os dias").
  - `processSteps` de `Process.tsx` linhas 20 a 57, sem `icon` e `color`. Durações: `'1 reunião de 30 min'`, `'1 a 2 dias'`, `'sprints semanais'` e `'contínuo'`. Títulos: Descoberta, Planejamento, Execução e "Entrega e suporte". Descrições com a copy da seção Método (Task 14).
  - `testimonials` e `partners` de `SocialProof.tsx` linhas 17 a 115, com os textos dos depoimentos **verbatim** (são falas de clientes) e `isDraft: true` nos ids 5 e 6.
  - `brandIcons` com o atributo `d` do `<path>` de cada SVG em `C:\Users\santo\Documents\Github\VN One\1 - Empresa\3 - Projetos\Palestra-Super-Agente\deck\assets\logos\<id>.svg`.
- [ ] **Step 5:** Rodar `npm test` e `npm run lint`. Esperado: tudo PASS. O `ContactForm` continua compilando com as opções novas.
- [ ] **Step 6:** Commit: `refactor: centralize site data and remove dashes and slash separators from copy`.

---

### Task 7: Primitivos estáticos de UI

**Files:**
- Create: `src/components/ui/{Container,Section,Kicker,Heading,Button,Cursor,ScanGrid,BrandIcon}.tsx` + `Button.test.tsx`, `Section.test.tsx`

**Interfaces:**
- Consumes: `useMagnetic` (Task 5), `brandIcons` (Task 6), `cn`.
- Produces:
  ```tsx
  Container({ children, className }) // mx-auto w-full max-w-[1216px] px-4 min-[360px]:px-5 md:px-12
  Section({ id, tone = 'cream', children, className, labelledBy }: { tone?: 'cream'|'white'|'black' })
    // <section data-tone=…> bg+texto do tom; tone black = bg-vn-black text-vn-white;
    // espaçamento vertical fluido py-[clamp(4rem,3rem+5vw,9rem)]
  Kicker({ children, tone = 'light' }) // font-mono uppercase tracking-[.18em] text-xs + régua 64×3 opacity .4
  Heading({ as = 'h2', size = 'l', children, id, className }: { size?: 'xl'|'l'|'m' })
    // lowercase, tracking -.03em, text-balance, break-words (palavras longas não estouram em 280px);
    // xl clamp(2.25rem,1rem+6vw,6rem) lh .95; l clamp(1.875rem,1rem+4vw,4rem) lh .98; m clamp(1.5rem,1.2rem+1vw,1.75rem)
  Button({ intent = 'primary', tone = 'light', size = 'md', asChild, isMagnetic, ...rest })
    // cva: primary light=bg-vn-ink text-vn-white | primary dark=bg-vn-white text-vn-black
    //      secondary=borda 1px gray-light, fundo transparente | sizes md min-h-11 px-5, lg min-h-14 px-7
    // rounded-full; texto pode quebrar em 2 linhas em telas estreitas (sem whitespace-nowrap)
    // asChild via @radix-ui/react-slot (para <Link>/<a>)
  Cursor({ tone = 'ink' }: { tone?: 'ink' | 'white' | 'accent' }) // bloco 0.5em×1em, animação vn-blink 1.1s steps(1)
  ScanGrid({ tone = 'light' }) // grade 64px com máscara radial + linha de scan (vn-scan 8s), aria-hidden
  BrandIcon({ id, className, title? }) // <svg viewBox="0 0 24 24" fill="currentColor"><path d=…/></svg>
  ```

- [ ] **Step 1: Testes**:
  - `Button` com `asChild` e `<a href="/x">` renderiza `<a>` com as classes do intent;
  - `tone="dark"` contém `bg-vn-white`;
  - `size="md"` contém `min-h-11` (alvo de toque de 44px);
  - `isMagnetic` não quebra sem fine pointer;
  - `Section tone="black"` tem `data-tone="black"` e classe `bg-vn-black`;
  - `labelledBy` vira `aria-labelledby`.
- [ ] **Step 2:** Rodar os testes. Esperado: FAIL.
- [ ] **Step 3:** Implementar os 8 componentes.
- [ ] **Step 4:** Rodar os testes (esperado: PASS) e `npm run lint`.
- [ ] **Step 5:** Commit: `feat: static UI primitives on the VN One system`.

---

### Task 8: Primitivos de movimento

**Files:**
- Create: `src/components/ui/{Reveal,CountUp,Marquee,SpotlightCard,WindowFrame,Accordion}.tsx` + testes `Reveal.test.tsx`, `CountUp.test.tsx`, `Marquee.test.tsx`, `Accordion.test.tsx`

**Interfaces:**
- Consumes: `useMotionAllowed`, `usePointerSpotlight`, `useFinePointer` (Task 5); `parseStat` (Task 3).
- Produces:
  ```tsx
  RevealGroup({ as = 'div', stagger = 0.08, delay = 0, className, children })
    // um useInView({ once: true, margin: '0px 0px -8% 0px' }) por grupo; variants hidden/show
  RevealItem({ variant = 'up', className, children }: { variant?: 'up'|'left'|'right'|'zoom'|'fade' })
    // up y:32; left x:-40; right x:40; zoom y:16 scale:.94; fade só opacity; 0.7s ease-out
    // abaixo de md, left/right viram up (deslocamento lateral não gera scroll horizontal)
    // quando !useMotionAllowed(): renderiza sem initial (estado final direto)
  CountUp({ value, durationMs = 1400 }) // parseStat; anima 0→num com easeOutCubic ao entrar na tela; não-numérico = texto cru
  Marquee({ ariaLabel, durationS = 32, children }) // 2 cópias, a 2ª aria-hidden; mask-image nas bordas;
    // animation vn-marquee; pausa no :hover e :focus-within; sem movimento → 1 cópia em flex-wrap;
    // overflow-x clip no container (nunca gera scroll horizontal da página); touch-action pan-y
  SpotlightCard({ as = 'article', className, children }) // usePointerSpotlight; ::before com conic-gradient
    // from var(--vn-angle) e animação vn-spin só no :hover; .spot com radial em var(--mx) var(--my); só com fine pointer
  WindowFrame({ title, status, children, className }) // barra com 3 pontos cinza, título mono, status à direita
  Accordion({ items, name, defaultOpenIndex = 0 }: { items: { question: string; answer: string }[] })
    // <details name={name}> nativo, ícone + que gira 45°, conteúdo com grid-rows 0fr→1fr; summary min-h-11
  ```

- [ ] **Step 1: Testes**:
  - `RevealItem` dentro de `RevealGroup` com `useReducedMotion` mockado `true` renderiza o filho sem `style.opacity==='0'`;
  - `CountUp value="85%"` com movimento desligado mostra `85%` na hora; `value="contínuo"` mostra `contínuo`;
  - `Marquee` com 3 filhos renderiza 6, e o 2º grupo tem `aria-hidden="true"`; sem movimento renderiza 3;
  - `Accordion`: o primeiro item está `open`; clicar no `summary` do segundo abre o segundo.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar os seis. Os estilos do `SpotlightCard` e do `Marquee` vão em `tokens.css`, nas classes `.vn-spotlight` e `.vn-marquee`.
- [ ] **Step 4:** Rodar os testes (esperado: PASS) e `npm run build`.
- [ ] **Step 5:** Commit: `feat: motion primitives (reveal, count-up, marquee, spotlight, accordion)`.

---

### Task 9: Layout compartilhado (SiteLayout, Header, MobileMenu, Footer)

**Files:**
- Create: `src/components/layout/{SiteLayout,MotionProvider,Header,MobileMenu,Footer,ScrollProgress,WhatsAppButton,SkipLink}.tsx`, `src/components/layout/MotionProvider.test.tsx`, `e2e/layout.spec.ts`
- Modify:
  - `src/App.tsx`: as rotas `/`, `/sobre`, `/servicos`, `/projetos`, `/projetos/:slug`, `/contato`, `/privacidade`, `/lgpd` e `*` ficam dentro de `<Route element={<SiteLayout />}>`, e o `/blog` fica fora;
  - `src/main.tsx`: remover o `ThemeProvider`;
  - `src/pages/{HomePage,AboutPage,ServicesPage,ProjectsPage,ProjectDetailPage,ContactPage,PrivacyPage,LgpdPage}.tsx`: remover `<Header/>`, `<Footer/>`, `<Chatbot/>` e o skip link próprios.
- Delete: `src/components/ThemeToggle.tsx`, `src/contexts/ThemeContext.tsx`, `src/components/Chatbot.tsx`, e o `Header.tsx` e o `Footer.tsx` antigos depois que nada mais os importar (`grep -r "components/Header'" src` vazio).

**Interfaces:**
- Consumes: `Logo`, `Button`, `Container`, `Cursor` (Tasks 2 e 7); `MAIN_NAV`, `PRIMARY_CTA`, `SOCIAL_LINKS`, `whatsappUrl`, `WHATSAPP_DISPLAY`, `CONTACT_EMAIL` (Task 6); `useMotionAllowed` (Task 5); `@radix-ui/react-dialog`.
- Produces:
  - `SiteLayout` = `SkipLink` + `ScrollProgress` + `Header` + `<main id="main-content">` com `AnimatePresence` (opacidade 0.3s, `onExitComplete` igual ao `App.tsx:57-61` atual) e `<Suspense fallback={<PageFallback/>}><Outlet/></Suspense>` + `Footer` + `WhatsAppButton`.
  - `MotionProvider({children})` = `<MotionConfig reducedMotion={state.noAnimations ? 'always' : 'user'}>`, montado em `main.tsx` dentro do `AccessibilityProvider`.
  - O `Header` tem `data-scrolled="true"` quando `scrollY > 60`.
  - O `Footer` tem `id="rodape"`.

Comportamento:
- **Header:**
  - pílula fixa em `top: max(12px, env(safe-area-inset-top))`, largura `min(1100px, 100% - 24px)`, fundo `white/90` com borda gray-light;
  - com `data-scrolled` vai para `min(860px, 100% - 24px)`, com transição de `transform`/`opacity` mais `max-width` (o único caso de propriedade de layout permitido, porque o Header é um elemento só);
  - nav desktop só a partir de `lg` (1024px), porque 6 links + CTA não cabem em tablet em pé;
  - entre `md` e `lg`, aparecem a logo, o CTA e o botão de menu;
  - abaixo de `md`, a logo e o botão de menu (44×44);
  - nav com `aria-current="page"` no ativo, que também casa sub-rotas;
  - o CTA é o `Button` primary.
  - Em celular deitado (`max-height: 480px`), o header fica 8px mais baixo e o `scroll-padding-top` passa a 72px.
- **MobileMenu:**
  - Radix `Dialog`, que dá focus trap, `Esc` e `aria-modal`;
  - painel `bg-vn-black` à direita, `w-[min(100%,24rem)]`, altura `100dvh`, rolável quando o celular está deitado (`overflow-y-auto`), com `padding` + `env(safe-area-inset-*)`;
  - links grandes em minúsculas, o e-mail e o CTA;
  - fecha ao navegar.
- **ScrollProgress:** a mesma lógica `useScroll`/`useSpring` do `App.tsx:38-43`, com barra de 2px `bg-vn-ink`.
- **WhatsAppButton:**
  - fixo em `right: max(16px, env(safe-area-inset-right))` e `bottom: max(16px, env(safe-area-inset-bottom))`;
  - 52px, `bg-vn-black` com ícone `BrandIcon id="whatsapp"` branco;
  - o anel usa o acento (é o único acento dessa camada);
  - leva para `whatsappUrl('Olá! Vim pelo site da VN One e quero conversar sobre um projeto.')`;
  - sem `animate-ping` infinito: um pulso único quando monta;
  - o `Footer` reserva `pb` extra para o botão não cobrir os links do rodapé no mobile.
- **Footer:**
  - `bg-vn-black`, `rounded-t-[clamp(24px,4vw,40px)]`;
  - 4 colunas no `lg`, 2 no `sm` e 1 abaixo de 360px: Navegação (MAIN_NAV + Contato), Serviços (link `/servicos` para cada categoria de `services`), Contato (WHATSAPP_DISPLAY, CONTACT_EMAIL, "Recife e remoto") e Legal ("Política de Privacidade" `/privacidade`, "LGPD" `/lgpd`);
  - wordmark `vn one` gigante (`font-display font-bold`, `font-size: clamp(4.5rem, 22vw, 20rem)`, `.vn-chrome-text`, `white-space: nowrap`, `overflow: clip`), revelado com `clip-path: inset(100% 0 0 0)` → `inset(0)` ao entrar na tela;
  - barra final com `© {new Date().getFullYear()} VN One` e os `SOCIAL_LINKS` (ícones lucide, alvo 44×44, `rel="noopener noreferrer"`).

- [ ] **Step 1: Teste** `MotionProvider.test.tsx`: com `vi.mock('motion/react')` capturando as props do `MotionConfig`, `noAnimations:true` gera `reducedMotion==='always'` e o padrão gera `'user'`.
- [ ] **Step 2: E2E** `e2e/layout.spec.ts`:
  - em `/`, o header não tem `data-scrolled`; depois de `mouse.wheel(0, 400)` tem `data-scrolled="true"`;
  - no projeto mobile, clicar em "Abrir menu" mostra o dialog; Tab várias vezes mantém o foco dentro; `Escape` fecha e devolve o foco ao botão;
  - em 768×1024, o botão de menu fica visível e a nav desktop escondida; em 1024×768, a nav desktop fica visível;
  - Tab a partir do topo foca "Pular para o conteúdo" primeiro;
  - em `/servicos`, o link "Serviços" tem `aria-current="page"`;
  - `/blog` não tem o header novo.
- [ ] **Step 3:** Rodar os dois. Esperado: FAIL.
- [ ] **Step 4:** Implementar o layout, religar `App.tsx`/`main.tsx` e limpar as páginas.
- [ ] **Step 5:** Rodar `npm test`, `npm run lint` e `npx playwright test e2e/layout.spec.ts`. Esperado: PASS.
- [ ] **Step 6:** Commit: `feat: shared site layout with floating header, mobile dialog menu and VN One footer`.

---

### Task 10: ChoicePill e HeroSentence

**Files:**
- Create:
  - `src/components/ui/ChoicePill.tsx` (+ `.test.tsx`);
  - `src/sections/home/HeroSentence.tsx` (+ `.test.tsx`);
  - `src/data/homeCopy.ts`;
  - `src/data/heroFlows.ts`, nesta task só com `HeroTaskId` e `heroTasks` (a Task 11 completa).

**Interfaces:**
- Consumes: `@radix-ui/react-popover`; `HERO_HOUR_OPTIONS`, `monthlySavings`, `DEFAULT_HOURLY_RATE` (Task 3); `formatBRL`; `Cursor`, `Button`, `Kicker` (Task 7).
- Produces:
  ```tsx
  export type HeroTaskId = 'planilha-whatsapp' | 'atendimento' | 'notas' | 'follow-up';
  export const heroTasks: { value: HeroTaskId; label: string }[];
  ChoicePill<T extends string | number>({ value, options, onChange, ariaLabel }:
    { options: { value: T; label: string }[]; ariaLabel: (label: string) => string })
    // trigger <button aria-haspopup="listbox" aria-label={ariaLabel(label atual)} class="min-h-11"> + Popover
    // (collisionPadding 12, avoidCollisions; no mobile o conteúdo ocupa min(92vw, 20rem)) com
    // <ul role="listbox"> <li role="option" aria-selected> ; ↑↓ Home End movem, Enter/Espaço escolhe, Esc fecha
    // foco volta ao trigger; estilo: fundo vn-white, borda gray-light, chevron
  HeroSentence({ task, onTaskChange }: { task: HeroTaskId; onTaskChange: (t: HeroTaskId) => void })
    // h1 com as pílulas inline (quebram linha naturalmente; nunca nowrap); estado local hours (padrão 10);
    // pílula de resultado = <output> com bg-vn-accent text-vn-black (o ÚNICO acento do hero),
    // número anima (motion animate)
  ```
- Copy fixa (`homeCopy.ts`, já humanizada):
  - `hero.kicker`: `'automação e IA para empresas'`
  - `hero.sentence`: partes `['Sua equipe perde', {hours}, 'por semana com', {task}, '. Automatizando, a gente devolve', {result}, 'por mês.']`
  - opções de horas: `'5 horas'`, `'10 horas'`, `'20 horas'`, `'40 horas'`
  - `heroTasks`:
    - `planilha-whatsapp` "planilha e WhatsApp";
    - `atendimento` "atendimento no WhatsApp";
    - `notas` "emissão de notas";
    - `follow-up` "follow-up de vendas".
  - `hero.sub`: `'A gente mapeia o processo e entrega a automação rodando nas ferramentas que você já usa. Sua equipe fica com o trabalho que precisa de gente.'`
  - `hero.finePrint`: `'Estimativa com R$ 50 por hora e 80% do tempo automatizado.'`
  - `hero.ctaPrimary`: `'Quero automatizar'` → `/#contato`
  - `hero.ctaSecondary`: `'Ver como funciona'` → `/#metodo` (o Plano 2 troca pelo VideoModal)
  - `hero.annotation`: `'// mexe nos números aí'`. A seta só aparece no `lg`, porque no mobile o painel fica embaixo e a anotação vira uma linha simples acima dele.
  - aria das pílulas: `(l) => \`Horas por semana: ${l}. Alterar\``, `(l) => \`Tarefa: ${l}. Alterar\``

- [ ] **Step 1: Testes**:
  - `ChoicePill`: abrir pelo clique; `ArrowDown` duas vezes + `Enter` chama `onChange` com a 3ª opção; `Escape` fecha e o foco volta ao trigger; a opção atual tem `aria-selected="true"`.
  - `HeroSentence`: o texto do `<output>` começa como `R$\u00a01.733`; escolher "20 horas" muda para `R$\u00a03.467` (movimento desligado no teste via mock de `useReducedMotion`); escolher a tarefa "emissão de notas" chama `onTaskChange('notas')`; o `<h1>` contém o texto acessível completo.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar. As palavras do h1 entram com `RevealGroup` (stagger 0.05, variant `up` + `filter: blur(8px)→blur(0)`). Fica um `Cursor tone="ink"` no fim. A seta da anotação é um SVG `<path>` com `strokeDasharray` animado.
- [ ] **Step 4:** Rodar os testes (esperado: PASS) e `npm run lint`.
- [ ] **Step 5:** Commit: `feat: interactive hero sentence with accessible choice pills`.

---

### Task 11: AutomationPanel e HeroSection

**Files:**
- Modify: `src/data/heroFlows.ts` (completar com as linhas)
- Create: `src/sections/home/AutomationPanel.tsx` (+ `.test.tsx`), `src/sections/home/HeroSection.tsx`

**Interfaces:**
- Consumes: `useCycle`, `useMotionAllowed` (Task 5); `WindowFrame`, `ScanGrid` (Tasks 7 e 8); `HeroSentence`, `HeroTaskId` (Task 10).
- Produces:
  ```ts
  export type FlowRow = { title: string; detail: string; done: string };
  export const heroFlows: Record<HeroTaskId, FlowRow[]>; // 4 linhas cada
  export const flowSteps = ['receber', 'entender', 'executar', 'avisar'] as const;
  export const flowSources = ['WhatsApp', 'E-mail', 'Planilhas', 'Seu sistema'] as const;
  AutomationPanel({ task }: { task: HeroTaskId })
  HeroSection() // estado task (padrão 'planilha-whatsapp'), cartão bg-vn-cream rounded-[clamp(24px,4vw,40px)]
                // mx-2 min-[360px]:mx-3 md:mx-6, pt que considera o header + safe-area, ScanGrid, HeroSentence,
                // AutomationPanel com tilt de scroll
  ```
- Copy fixa (`heroFlows`):
  - `planilha-whatsapp`:
    - "Pedido chega no WhatsApp", "mensagem do cliente", "recebido";
    - "IA lê e organiza", "nome, item e valor", "extraído";
    - "Planilha atualizada", "linha nova no Google Sheets", "lançado";
    - "Equipe avisada", "só o que pede decisão", "encaminhado".
  - `atendimento`:
    - "Cliente manda mensagem", "a qualquer hora", "recebido";
    - "Agente responde", "com as regras do seu negócio", "respondido";
    - "Lead qualificado", "dados salvos no CRM", "registrado";
    - "Vendedor entra", "quando a conversa pede gente", "encaminhado".
  - `notas`:
    - "Venda confirmada", "pedido pago no sistema", "recebido";
    - "Nota emitida", "dados conferidos antes", "emitida";
    - "Cliente recebe", "PDF e XML por e-mail", "enviado";
    - "Financeiro atualizado", "lançamento no ERP", "lançado".
  - `follow-up`:
    - "Proposta enviada", "registrada no CRM", "registrado";
    - "Lembrete agendado", "no dia certo, sem planilha", "agendado";
    - "Mensagem de retorno", "escrita a partir do histórico", "enviado";
    - "Cliente respondeu", "vai direto pro vendedor", "encaminhado".
  - O título da janela é `'automação ao vivo'`, o status é `'rodando'` e a nota de rodapé é `'Exemplo ilustrativo. O fluxo real sai do diagnóstico.'`.

Comportamento:
- As linhas ganham o estado `done` (✓ + texto `done`) em sequência com `useCycle(5, 1400)`: o índice `k` marca as linhas `0..k-1`, e o 5º passo reinicia.
- A pílula de etapa ativa acompanha `k % 4`.
- O "cabo" SVG entre fontes e linhas tem um traço curto com `strokeDashoffset` animado em CSS.
- Trocar `task` reinicia o ciclo (`key={task}`).
- O tilt usa `useScroll({ target, offset: ['start end', 'start 30%'] })`, com `rotateX` de 14 a 0 e `scale` de 0.94 a 1. Se `!useMotionAllowed()`, fica `rotateX 0` e `scale 1` direto.
- Com movimento desligado, o painel mostra as 4 linhas já concluídas.
- **Responsivo:**
  - abaixo de `md`, a coluna de fontes vira uma fileira de chips acima das linhas, as pílulas de etapa rolam na horizontal dentro do próprio painel (`overflow-x-auto`, sem afetar a página) e o tilt fica menor (rotateX 8 a 0);
  - em 280px, `detail` e `done` quebram para baixo do título;
  - no celular deitado, o painel começa logo abaixo da frase, sem `min-height` de tela cheia.

- [ ] **Step 1: Testes** `AutomationPanel.test.tsx`:
  - com fake timers e movimento permitido, depois de 1400ms 1 linha tem `data-state="done"` e depois de 4×1400ms são 4;
  - com `useReducedMotion` mockado `true`, as 4 nascem `done` e nenhum timer é criado (`vi.getTimerCount()===0`);
  - `task="notas"` mostra "Nota emitida".
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar `heroFlows.ts`, `AutomationPanel` e `HeroSection`.
- [ ] **Step 4:** Rodar os testes (esperado: PASS) e `npm run build`.
- [ ] **Step 5:** Commit: `feat: hero section with live automation panel and scroll tilt`.

---

### Task 12: IntegrationsMarquee e StatementStats

**Files:**
- Create: `src/sections/home/IntegrationsMarquee.tsx`, `src/sections/home/StatementStats.tsx`, `src/sections/home/sections.test.tsx` (arquivo compartilhado de testes das seções simples)

**Interfaces:**
- Consumes: `Marquee`, `BrandIcon`, `CountUp`, `RevealGroup`/`RevealItem`, `Section`, `Container`, `Kicker`, `Heading`; `integrations`, `stats`.
- Produces: `IntegrationsMarquee()` e `StatementStats()`, sem props.
- Copy fixa:
  - Marquee: kicker `'integrações'`; linha `'Conectamos o que você já usa'`. Os itens são ícone + label em `gray-dark` e viram `ink` no hover. A seção é `tone="white"` com borda superior e inferior.
  - StatementStats:
    - kicker `'resultado'`;
    - Heading xl `'O trabalho repetitivo vai para os fluxos. A equipe fica com o resto.'`;
    - sub `'Números dos projetos que a gente já entregou.'`;
    - 4 `SpotlightCard`s com `CountUp value={stat.value}`, `stat.label` e `stat.description`, numa grade de 1 coluna abaixo de 360px, 2 a partir de `sm` e 4 a partir de `lg`;
    - ilustração: só o slot `<div data-slot="illustration" />` (a fase de ilustrações preenche).

- [ ] **Step 1: Testes** em `sections.test.tsx`:
  - `IntegrationsMarquee` tem uma `region` com o nome `'Integrações'` (`aria-label` do Marquee) e o texto "Notion";
  - `StatementStats` mostra `500h+`, `100+`, `10+` e `85%` com movimento desligado e tem exatamente um `h2`.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar os testes. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: integrations marquee and statement stats sections`.

---

### Task 13: UseCaseTabs

**Files:**
- Create: `src/data/useCases.ts`, `src/sections/home/UseCaseTabs.tsx` (+ `.test.tsx`)

**Interfaces:**
- Consumes: `useCycle` (Task 5), `RevealGroup`, `Section`, `Kicker`, `Heading`.
- Produces: `export type UseCase = { id: 'atendimento'|'comercial'|'financeiro'|'operacoes'; tab: string; title: string; body: string; steps: [string, string, string] }`, `export const useCases: UseCase[]` e `UseCaseTabs()`.
- Copy fixa:
  - kicker `'onde a automação entra'`;
  - Heading `'Comece pelo processo que mais pesa na rotina'`;
  - sub `'Toda empresa tem aquele trabalho que ninguém aguenta mais fazer. É por ele que a gente começa.'`;
  - nota `'Exemplo de aplicação. O fluxo de verdade sai do diagnóstico.'`.
  - Atendimento:
    - título "Resposta rápida, a qualquer hora.";
    - corpo "Um agente de IA atende no WhatsApp com as regras do seu negócio e passa para a equipe quando a conversa pede uma pessoa.";
    - passos "Receber a mensagem e entender o pedido", "Responder ou buscar a informação no seu sistema", "Chamar alguém da equipe quando precisar".
  - Comercial:
    - título "Nenhum lead esquecido no meio do caminho.";
    - corpo "Cada contato entra no CRM com origem e histórico, e o retorno sai na hora certa sem ninguém precisar lembrar.";
    - passos "Capturar o lead de onde ele vier", "Qualificar e registrar no CRM", "Agendar e mandar o retorno".
  - Financeiro:
    - título "Menos conferência manual no fim do mês.";
    - corpo "Notas, pedidos e cobranças conversam com o seu sistema. A equipe só olha o que saiu do padrão.";
    - passos "Ler as notas e documentos que chegam", "Conferir com o que está no sistema", "Apontar só as divergências".
  - Operações:
    - título "O processo anda sem depender de cobrança.";
    - corpo "Cada etapa tem dono e prazo, e o aviso sai sozinho. Você acompanha pelo painel em vez de perguntar no grupo.";
    - passos "Organizar etapas e responsáveis", "Avisar quando algo atrasa", "Mostrar tudo num painel".

Comportamento:
- Padrão ARIA tabs: `role="tablist"`, `tab` com `aria-selected`/`aria-controls` e `tabpanel`; ←→ Home End movem o foco e ativam.
- A troca automática é `useCycle(4, 4200)`, com `pause` em `onPointerEnter`/`onFocus` da seção e `resume` em `onPointerLeave`/`onBlur`, e `select` no clique, no toque ou no teclado.
- A aba ativa é uma pílula `bg-vn-ink text-vn-white` com uma barra de progresso interna (`scaleX` de 0 a 1 em 4.2s, CSS keyed pelo índice), escondida quando `!isAuto`.
- O card "como funciona" à direita lista os 3 passos com `RevealGroup` (re-render por `key`).
- **Responsivo:**
  - abaixo de `sm`, a `tablist` rola na horizontal com `scroll-snap` e a aba ativa entra na tela com `scrollIntoView({ inline: 'nearest' })` (sem rolar a página);
  - abaixo de `lg`, texto e card empilham;
  - as abas têm altura mínima de 44px.

- [ ] **Step 1: Testes**:
  - com fake timers, após 4200ms a aba "Comercial" está `aria-selected="true"`;
  - clicar em "Financeiro" seleciona e, após 10s, continua em Financeiro;
  - focar uma aba e apertar `ArrowRight` move para a próxima;
  - com movimento desligado, nada avança.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: auto-rotating use-case tabs with accessible tab pattern`.

---

### Task 14: ServicesCards e MethodSteps

**Files:**
- Create: `src/sections/home/ServicesCards.tsx`, `src/sections/home/MethodSteps.tsx`; acrescentar testes em `src/sections/home/sections.test.tsx`
- Modify: `src/data/process.ts` (descrições finais abaixo); `src/pages/AboutPage.tsx` (trocar `<Process />` por `<MethodSteps />`)

**Interfaces:**
- Consumes: `services` (Task 6), `processSteps`, `SpotlightCard`, `RevealGroup`, `Button`, `Section`, `Kicker`, `Heading`.
- Produces:
  - `ServicesCards()`: mostra `featured = (['Automação','Inteligência Artificial','Desenvolvimento Web'] as const).map(c => services.find(s => s.categoria === c)!)`.
  - `MethodSteps({ id = 'metodo' })`: a seção tem `id="metodo"`.
- Copy fixa:
  - Serviços:
    - kicker `'o que a gente faz'`;
    - Heading `'Três jeitos de tirar trabalho manual da sua frente'`;
    - card com `categoria` (kicker), `nome` (h3), `descricao`, lista `inclui` e `prazo` em mono. A lista desliza no hover e no mobile já aparece visível;
    - link `'Ver todos os serviços'` → `/servicos`.
  - Método:
    - kicker `'como a gente trabalha'`;
    - Heading `'Do primeiro papo ao fluxo rodando'`;
    - sub `'Você conhece o negócio. A gente entra com o método e a execução.'`.
    - Descrições em `process.ts`:
      - 01 "A gente olha os processos de hoje, acha os gargalos e marca onde a automação dá mais retorno.";
      - 02 "Desenhamos os fluxos e as integrações, e definimos onde a IA entra.";
      - 03 "Cada fluxo é construído e testado em ciclos curtos, com entregas parciais pra você validar.";
      - 04 "Colocamos no ar com monitoramento e documentação. Se precisar de ajuste depois, a gente ajusta.".
  - Layout do Método:
    - 4 cards em escada com `margin-top` decrescente no `lg` (`lg:mt-24`, `lg:mt-16`, `lg:mt-8`, `lg:mt-0`), 2×2 no `md` sem escada e coluna abaixo de `md`;
    - número `01` a `04` em `font-display font-bold`, `font-size: clamp(3rem,2rem+3vw,4.5rem)`;
    - régua inferior de 3px `bg-vn-ink`;
    - entrada `RevealGroup` stagger 0.12 com variant `up`.

- [ ] **Step 1: Testes**: `ServicesCards` renderiza 3 `article` com os nomes "Automação Essencial" e "Agente de IA Sob Medida" e o 1º de Desenvolvimento Web; `MethodSteps` tem `id="metodo"` e os textos "01" a "04".
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar e trocar o `Process` no `AboutPage`.
- [ ] **Step 4:** Rodar `npm test` e `npm run build`. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: services spotlight cards and staircase method section`.

---

### Task 15: RoiSimulator

**Files:**
- Create: `src/sections/home/RoiSimulator.tsx` (+ `.test.tsx`)

**Interfaces:**
- Consumes: `TEAM_OPTIONS`, `annualManualCost`, `annualSavings`, `buildQuoteMessage`, `DEFAULT_HOURLY_RATE` (Task 3); `formatBRL`; `Section tone="black"`; `Button tone="dark"`.
- Produces: `RoiSimulator({ onQuoteRequest }: { onQuoteRequest: (message: string) => void })`.
- Copy fixa:
  - kicker `'simulador'`;
  - Heading `'Quanto o trabalho manual custa por ano'`;
  - sub `'Mexe nos valores e veja quanto dá pra recuperar automatizando.'`;
  - labels:
    - `'Horas por semana em tarefas repetitivas'` (slider 1 a 80, padrão 12, thumb de 28px para o dedo);
    - `'Quantas pessoas fazem isso'` (controle segmentado com `TEAM_OPTIONS`, padrão índice 1; vira grade 2×2 abaixo de `sm`);
    - `'Valor da hora (R$)'` (number, padrão 50, `min=0`, `inputMode="decimal"`);
  - resultados: `'Custo anual hoje'` (branco) e `'Economia estimada por ano'` (o **número** em `text-vn-accent`, que é o único acento da seção, com `font-size: clamp(2.5rem,1.5rem+5vw,5rem)` e `tabular-nums`);
  - nota `'Considera 80% do tempo automatizado. É uma estimativa, o número real sai do diagnóstico.'`;
  - CTA `'Quero automatizar esse processo'`.
- Layout:
  - seção `black` dentro de um wrapper com `mx-2 min-[360px]:mx-3 md:mx-6 rounded-[clamp(24px,4vw,40px)]`;
  - controles à esquerda e resultado à direita no `lg`, empilhados abaixo;
  - resultado em painel `white/5` com borda `white/10`;
  - os números animam com `motion` (`animate` numérico, 0.55s ease-out);
  - o valor da hora vazio conta como 0.

- [ ] **Step 1: Testes**:
  - os valores padrão mostram `R$\u00a078.000` (custo) e `R$\u00a062.400` (economia), com movimento desligado;
  - limpar o input do valor da hora mostra `R$\u00a00` nos dois e nunca "NaN";
  - escolher "1 pessoa" mostra `R$\u00a031.200`;
  - clicar no CTA chama `onQuoteRequest` com o texto exato de `buildQuoteMessage` para os valores atuais.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: dark ROI simulator section using the shared formula`.

---

### Task 16: Testimonials e ClientGrid

**Files:**
- Create: `src/sections/home/Testimonials.tsx` (+ `.test.tsx`), `src/sections/home/ClientGrid.tsx`

**Interfaces:**
- Consumes: `testimonials`, `partners` (Task 6); `@radix-ui/react-dialog`; `RevealGroup`, `Section`, `Kicker`, `Heading`.
- Produces:
  - `Testimonials({ id = 'clientes' })`: a seção tem `id="clientes"` e inclui o `ClientGrid` no fim.
  - `ClientGrid()`.
- Copy fixa:
  - kicker `'clientes'`;
  - Heading `'Quem já automatizou com a gente'`;
  - cada card mostra a logo (`object-contain` ou `cover` conforme `logoFit`, com `width`, `height` e `loading="lazy"`), o trecho (primeiros 140 caracteres cortados na última palavra + "…"), o nome e o cargo + empresa;
  - o botão `'Ler depoimento completo'` abre um Dialog com o texto inteiro, a logo e o nome:
    - fecha com Esc, com o botão "Fechar" e devolve o foco;
    - no mobile o dialog ocupa a tela com `max-h-[90dvh] overflow-y-auto`;
  - grade de clientes: kicker `'quem confia'`.
- Layout:
  - grade de 1 coluna (mobile), 2 (md) e 3 (lg), com cards em alturas alternadas só no `lg` (o 2º e o 5º com `lg:mt-16`);
  - sem autoplay e sem estrelas (eram decoração).
  - ClientGrid: grade de células com borda `gray-light` (2 colunas no mobile, 3 no md, 5 no lg) com a logo em `grayscale opacity-70`, que vira `grayscale-0 opacity-100` no hover e no foco do card. No toque, as logos ficam coloridas, porque `@media (hover: none)` já aplica o estado final.
- Os depoimentos com `isDraft` aparecem como hoje (já estão no ar). O Plano 4 resolve com o Victor.

- [ ] **Step 1: Testes**:
  - renderiza 6 cards;
  - clicar no "Ler depoimento completo" do 1º abre um `dialog` com o texto completo do Adailton Amancio (verbatim do `testimonials[0].text`);
  - `Escape` fecha e o foco volta ao botão;
  - a seção tem `id="clientes"`.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: testimonial cards with full-text dialog and client logo grid`.

---

### Task 17: FaqSection, FinalCta e o ContactForm no visual novo

**Files:**
- Create: `src/sections/home/FaqSection.tsx`, `src/sections/home/FinalCta.tsx`, `e2e/contact-form.spec.ts`
- Modify: `src/components/ContactForm.tsx` (visual sobre `black` com tokens VN One; copy abaixo), `src/components/ServiceSelect.tsx` (só cores, para os tokens)

**Interfaces:**
- Consumes: `faqs`, `Accordion`, `ContactForm` (props `initialMessage?: string` sem mudança), `whatsappUrl`, `Cursor tone="accent"` (o acento da seção, em fundo escuro), `ScanGrid tone="dark"`.
- Produces: `FaqSection()`, `FinalCta({ prefillMessage }: { prefillMessage?: string })`. A seção do FinalCta tem `id="contato"`.
- Copy fixa:
  - FAQ:
    - kicker `'dúvidas'`;
    - Heading `'Perguntas que a gente sempre ouve'`;
    - sub `'Se a sua não estiver aqui, chama no WhatsApp.'`;
    - botão secondary `'Falar no WhatsApp'` → `whatsappUrl('Olá! Tenho uma dúvida sobre automação.')`.
  - FinalCta:
    - kicker `'próximo passo'`;
    - Heading xl `'Qual processo a gente automatiza primeiro?'` + `Cursor tone="accent"`;
    - corpo `'Conta como funciona hoje. Em 30 minutos a gente mostra por onde começar, sem compromisso.'`;
    - botão `'Chamar no WhatsApp'` → `whatsappUrl('Olá! Quero automatizar um processo da minha empresa.')`;
    - à direita, o `ContactForm`.
  - ContactForm:
    - método `'Por e-mail'` e `'Por WhatsApp'` (a pílula ativa é `bg-vn-white text-vn-black`, sem verde);
    - labels "Nome", "Serviço de interesse", "E-mail", "WhatsApp" e "Mensagem";
    - placeholders "Seu nome", "voce@empresa.com.br", "+55 81 99999-9999" e "Conta rapidinho o que você precisa";
    - consentimento com o texto atual intacto (é texto legal);
    - botão `'Enviar'`;
    - enviando: `'Enviando…'`;
    - sucesso: h4 `'Recebemos sua mensagem'` e texto `` `Obrigado! A gente responde pelo ${method === 'email' ? 'e-mail' : 'WhatsApp'} em breve.` `` com o botão `'Enviar outra'`;
    - erro: `'Não deu pra enviar. Tenta de novo ou fala direto pelo WhatsApp.'`, com o link no trecho "fala direto pelo WhatsApp".
    - O checkbox `accent-vn-accent` vira `accent-white`.
    - **Responsivo e mobile:** `font-size` dos inputs ≥ 16px (o iOS não dá zoom ao focar), `autocomplete` (`name`, `email`, `tel`), `inputMode="tel"` no WhatsApp, `enterKeyHint="send"` na mensagem e alvos de 44px.
- Layout do FinalCta: duas colunas no `lg` e empilhado abaixo, com o formulário em largura total.

- [ ] **Step 1: E2E** `e2e/contact-form.spec.ts`. Cada teste começa com `page.route('https://n8n.vnone.com.br/webhook/**', …)` e nunca chama a rede real.
  - **e-mail:** preencher nome, serviço "Automação de processos", e-mail, mensagem ≥ 10 caracteres e consentimento, depois enviar. A requisição interceptada vai para `/portfolio-vn-email`, o `postDataJSON()` tem as chaves `['email','mensagem','nome','servico','timestamp']` e o `servico` vale `'Automação de processos'`. Com o fulfill 200, aparece "Recebemos sua mensagem".
  - **WhatsApp:** digitar `81984451243`. A requisição vai para `/portfolio-vn-whatsapp` com `whatsapp === '558184451243'`.
  - **validação:** enviar vazio (com consentimento) não faz requisição e mostra os 4 erros (nome, serviço, e-mail, mensagem).
  - **erro 500:** fulfill 500 mostra o alerta com o link `wa.me/5581984451243`. Clicar "Fechar" e reenviar dispara a segunda requisição.
  - **rede caiu:** `route.abort()` mostra o mesmo alerta.
  - **mobile:** no projeto Pixel 7, o fluxo de e-mail completo passa, e o `font-size` computado dos inputs é ≥ 16px.
- [ ] **Step 2:** Rodar `npx playwright test e2e/contact-form.spec.ts`. Esperado: FAIL (seção e copy ainda não existem na home).
- [ ] **Step 3:** Implementar as duas seções e o visual do formulário. O `FinalCta` vai na home na Task 18; até lá, o teste fica vermelho de propósito.
- [ ] **Step 4:** Commit: `feat: FAQ and final CTA sections, contact form on VN One tokens`. O E2E fica verde na Task 18.

---

### Task 18: Montar a HomePage e remover o legado

**Files:**
- Modify: `src/pages/HomePage.tsx` (reescrever)
- Delete:
  - `src/components/{Hero,HeroBackground,Stats,ProjectsTeaser,SocialProof,CTASection,Process,FloatingIcons,CustomCursor}.tsx`;
  - `isTouchDevice` de `src/lib/constants.ts`: trocar os usos que sobrarem por `useFinePointer` e conferir com `grep -rn isTouchDevice src`.
  - O `Contact.tsx` e o `ROICalculator.tsx` ficam, porque o `/contato` usa até o Plano 3.

**Interfaces:**
- Consumes: todas as seções das Tasks 11 a 17, `SEO`, `useScrollToHash`.
- Produces: a HomePage com, nesta ordem, `SEO`, `HeroSection`, `IntegrationsMarquee`, `StatementStats`, `UseCaseTabs`, `ServicesCards`, `MethodSteps`, `RoiSimulator`, `Testimonials`, `FaqSection` e `FinalCta`.
  - O estado `prefillMessage` fica na HomePage.
  - O `RoiSimulator.onQuoteRequest` faz `setPrefillMessage(msg)` e rola até `#contato` (padrão do `ContactPage.tsx:30-33`).
  - Da `StatementStats` em diante, as seções são `lazy` com `Suspense fallback={<SectionSkeleton/>}`. O `SectionSkeleton` é atualizado para os tokens, sem classes `dark:`.

- [ ] **Step 1:** Reescrever `HomePage.tsx`.
- [ ] **Step 2:** Apagar os componentes do legado e rodar `npm run lint`. Esperado: sem imports quebrados (`grep -rnE "ProjectsTeaser|SocialProof|HeroBackground|FloatingIcons" src` vazio).
- [ ] **Step 3:** Rodar `npm test`, `npm run build` e `npx playwright test e2e/contact-form.spec.ts`. Esperado: tudo PASS.
- [ ] **Step 4:** Commit: `feat: assemble new VN One home and remove legacy home sections`.

---

### Task 19: Verificação ponta a ponta da home, com matriz de dispositivos

**Files:**
- Create: `e2e/home.spec.ts`, `e2e/devices.spec.ts`, `e2e/visual.spec.ts`

- [ ] **Step 1: E2E** `e2e/home.spec.ts`:
  - **ordem das seções:** os `h2`/`h1` aparecem na ordem da Task 18; a página não tem "Cases em Destaque";
  - **hero:** abrir a pílula de horas, escolher "40 horas" e o `<output>` mostra `R$ 6.933`;
  - **um acento por seção:** para cada `section`, contar os elementos com `getComputedStyle` cuja cor ou fundo é `rgb(0, 229, 160)`. O resultado tem que ser ≤ 1. Ignorar o `WhatsAppButton`, que fica fora das seções.
  - **hash:** `goto('/#contato')`, e o `#contato` fica `toBeInViewport()` em até 2s com o topo da seção abaixo do header (não coberto); o mesmo para `/sobre` → clicar "Como funciona" no header → `#metodo` na viewport.
  - **movimento reduzido:** com `test.use({ contextOptions: { reducedMotion: 'reduce' } })` (o Playwright 1.58 ignora `reducedMotion` solto no topo de `test.use`, sem avisar), a aba ativa de UseCaseTabs não muda depois de 5s e todas as linhas do painel estão `data-state="done"`.
- [ ] **Step 2: Matriz de dispositivos** em `e2e/devices.spec.ts`. É uma lista de viewports, com um teste gerado por item:

  | Viewport | Aparelho |
  |---|---|
  | 280×653 | Galaxy Fold fechado |
  | 320×568 | iPhone SE 1ª geração |
  | 360×740 | Android comum |
  | 375×667 | iPhone SE |
  | 390×844 | iPhone 13 e 14 |
  | 430×932 | iPhone Pro Max |
  | 844×390 | iPhone deitado |
  | 768×1024 | iPad em pé |
  | 1024×768 | iPad deitado |
  | 820×1180 | iPad Air |
  | 1280×800 | notebook |
  | 1440×900 | desktop |
  | 1920×1080 | full HD |
  | 2560×1440 | monitor grande |

  Os casos com toque usam `hasTouch: true, isMobile: true`. Para cada viewport:
  - **sem scroll horizontal:** `document.documentElement.scrollWidth <= innerWidth` após rolar a página inteira;
  - **nada estourado:** nenhum elemento visível com `getBoundingClientRect().right > innerWidth + 1`, ignorando os filhos dos containers `overflow: clip/hidden/auto`, como o marquee;
  - o header não cobre o `h1` (o `bottom` do header é menor que o `top` do `h1` no carregamento);
  - o botão do WhatsApp não se sobrepõe ao botão "Enviar" do formulário quando ele está rolado para a viewport;
  - nos casos com toque, o `tap()` na pílula de horas abre o listbox e o `tap()` numa aba troca a aba;
  - todos os `button` e `a` visíveis na viewport têm ≥ 44×44 de área clicável, por `boundingBox` ou padding do pai, com exceção dos links dentro de texto corrido.

  A home também roda com a classe `a11y-font-large` aplicada no `html` em 375×667, sem scroll horizontal.
- [ ] **Step 3: Captura visual** em `e2e/visual.spec.ts`:
  - para as larguras 280, 320, 375, 390, 768, 1024, 1440, 1920 e 2560, mais o celular deitado 844×390, `page.setViewportSize`, rolar até o fim em passos de `innerHeight` com espera de 400ms, e `page.screenshot({ fullPage: true, path: \`e2e/__shots__/home-${w}x${h}.png\` })`;
  - adicionar `e2e/__shots__/` ao `.gitignore`;
  - abrir e olhar cada PNG para conferir: texto cortado, sobreposição, espaço morto e mais de um acento.
- [ ] **Step 4:** Rodar `npx playwright test`. Esperado: tudo PASS.
- [ ] **Step 5:** Rodar `npm run coverage`. Esperado: `src/lib` e `src/hooks` ≥ 80% em linhas, funções, branches e statements.
- [ ] **Step 6: Comparação com as referências.** Usar o REA (`mcp__rea__capture_browser_scenario`, launch Chrome, 1440×900 e 390×844, `reduced_motion: no-preference`, PageDown + wait de 1400ms × 14, screenshots `after_each_step`) contra `http://localhost:4173`. Exportar a evidência com `export_evidence_bundle` e comparar seção a seção com as capturas de ia.dizevolv.com e abacatepay.com.
- [ ] **Step 7:** Despachar o agente `code-reviewer` (e o `react-reviewer`) sobre `git diff main...HEAD` e corrigir CRITICAL e HIGH.
- [ ] **Step 8:** Commit: `test: home e2e, device matrix, reduced-motion and visual capture`.

---

## Self-review (feito)

- **Cobertura do spec, Fundação + Home:**
  - tokens e fontes: T1; logo: T2; banner de compartilhamento e meta: T2B; layout, header e rodapé: T9;
  - hero com frase e painel: T10 e T11; marquee e número herói: T12; abas: T13; serviços e método: T14; simulador: T15; depoimentos e clientes: T16; FAQ, CTA e formulário: T17;
  - remover "Cases em Destaque": T18; responsividade em qualquer aparelho: Global Constraints mais T7 a T17 (cada seção diz o que muda por tamanho) e T19 (matriz);
  - movimento reduzido: T5, T8, T9 e T19; webhooks: T4 e T17; copy sem travessão e sem barra: T6 (teste guarda).
  - Ficam para os Planos 2 a 4: vídeos, ilustrações, páginas internas, legais, blog, 404, o SEO por página e o OG por projeto.
- **Tipos:**
  - `HeroTaskId` e `heroTasks` nascem na T10 (`heroFlows.ts`), e a T11 completa o mesmo arquivo.
  - `useCycle` devolve `{index, select, pause, resume, isAuto}` em todas as tasks.
  - `buildQuoteMessage(RoiInput)` é o mesmo na T3 e na T15.
  - `SITE` e `pageTitle` nascem na T2B e são usados pelo `SEO.tsx`.
- **Ordem:** a T2B depende das fontes (T1) e do logo PNG (T2), e não depende de nenhuma seção.
