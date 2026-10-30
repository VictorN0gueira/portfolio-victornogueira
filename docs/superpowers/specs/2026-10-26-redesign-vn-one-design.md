# Redesign completo do vnone.com.br (VN One v2)

## Contexto

O site atual (React 19 + Vite 6 + Tailwind v4 + `motion`) está desalinhado com a marca:
- hero genérico com o nome em itálico;
- seções escuras e claras alternando sem critério;
- acento esmeralda que não é o da marca;
- Inter e Space Grotesk misturados;
- animações duplicadas e quase nada de `prefers-reduced-motion`;
- formulário sem validação de nome, e-mail e mensagem.

O pedido é reformular o site inteiro, todas as páginas, com base em três referências. Analisei as três com o REA (capturas por seção e leitura do CSS e do JS):

- **ia.dizevolv.com** (principal):
  - nav em pílula que encolhe no scroll e barra de progresso de leitura;
  - palavras do hero entrando com blur;
  - painel de produto que sai de 3D para plano conforme a rolagem;
  - marquee de integrações com bordas esmaecidas;
  - grade de logos em células;
  - cards com spotlight seguindo o cursor e borda cônica girando no hover;
  - abas que se alternam sozinhas;
  - passos em escada 01 a 04;
  - contador de preço;
  - FAQ em duas colunas;
  - rodapé com wordmark gigante em gradiente.
- **abacatepay.com** (principal):
  - hero dentro de um "cartão" grande arredondado;
  - frase interativa com pílulas que recalculam o valor;
  - anotação manuscrita com seta apontando para o mockup;
  - número herói e quatro cards;
  - simulador numa seção escura de cantos arredondados;
  - depoimentos em cards de alturas alternadas;
  - FAQ em cards;
  - CTA final com ilustração;
  - rodapé escuro em colunas com cantos superiores arredondados;
  - reveal por `data-reveal` com variantes up, left, right, zoom e fade, stagger de 80ms, parallax leve e easing `cubic-bezier(.22,1,.36,1)`.
- **iaplicada.com** (apoio): dashboard "ao vivo" como prova e grade de nomes de clientes.

O objetivo é um site com cara de empresa séria de automação e IA. Ele segue o sistema visual oficial da VN One, tem animações no nível das referências e copy nova e humana.

## Decisões do Victor

| Tema | Decisão |
|---|---|
| Marca | **Empresa: VN One** (voz "nós"). Victor aparece como fundador na página Sobre. |
| Cores | As cores da logo, com o verde da marca. Ou seja, o **sistema visual VN One** (abaixo). O toggle claro/escuro sai. |
| Hero | **Frase interativa + painel de automação ao vivo** |
| Textos | **Reescrever tudo, tom direto** com humor leve. Passar pelo `/humanizer:humanizer`. **Proibido travessão (— –) e barra como separador ("A / B").** |
| Estilo | **Tech limpo + 1 ou 2 ilustrações autorais** (monocromáticas) |
| Vídeos | HyperFrames, com o projeto `Palestra-Super-Agente` como base (som, sfx e estilo): **um filme "como funciona" com som** e **um loop mudo no hero** |
| Áudio do filme | **Música instrumental de banco livre (Pixabay, uso comercial) + sfx da palestra, sem narração.** O texto fica na tela e as legendas `.vtt` descrevem o que acontece. |
| WhatsApp oficial | **(81) 98445-1243** (`5581984451243`, o que o site já usa), centralizado em `lib/constants.ts` |
| Depoimentos | Só logos e texto (sem fotos ou vídeos por enquanto) |
| Home | **Remover "Cases em Destaque"** (`ProjectsTeaser`). A página `/projetos` continua e também é redesenhada. |
| Escopo | Todas as páginas |
| Responsividade | **Qualquer aparelho:** de 280px (Galaxy Fold) a 2560px, celular deitado, tablets em pé e deitados, safe-area de notch, `dvh`, toque sem hover, alvos de 44px e fonte a 120%. Testado numa matriz de dispositivos no Playwright. |
| Banner de compartilhamento | O preview de link (WhatsApp, LinkedIn, Instagram) passa para a marca VN One: título, descrição sem travessão e `og-banner.png` novo no sistema visual. A logo e a frase ficam no centro, porque o WhatsApp corta a miniatura em quadrado. Isso foi adiantado para o Plano 1. |

## Sistema visual (fonte: `VN One/4 - Time/Designer/Identidade Visual/tokens.css`)

Os valores vêm do `tokens.css` oficial e não se inventa cor nova.

- **Paleta:**
  - `--vn-white #FFF`, `--vn-cream #F2F2F2`, `--vn-gray-light #C7C7C7`, `--vn-gray-mid #8A8A8A`, `--vn-gray-dark #4D4D4D`, `--vn-ink #1A1A1A`, `--vn-black #0A0A0A`;
  - **acento único `--vn-accent #00E5A0`**;
  - `--vn-chrome: linear-gradient(135deg,#fff 0%,#c7c7c7 45%,#8a8a8a 100%)`.
- **Regras do acento, adaptadas para web:**
  - no máximo **1 elemento em acento por seção ou tela**;
  - como texto, só sobre `--vn-black`;
  - sobre fundo claro, só como **preenchimento de forma com texto preto** (é o `.destaque` do tokens.css, que vira a pílula do valor no hero);
  - os CTAs são pretos no claro e brancos no escuro, e não usam acento.
- **Tipografia:**
  - **Space Grotesk** 400, 500 e 700 com **JetBrains Mono** 400 e 500, self-hosted. Os woff2 vêm de `Identidade Visual/fontes/` para `public/fonts/`, com preload do 700. Inter e o link do Google Fonts saem.
  - Títulos em **minúsculas**, tracking -0.03em, line-height 0.92 a 0.98.
  - Kicker em mono, caixa alta, tracking .18em, com a régua de 64×3px.
  - O "cursor" piscando do tokens.css vira assinatura no hero e no CTA.
  - As anotações estilo abacatepay passam a ser comentários em mono (`// calcule a sua`) com seta SVG desenhada. Assim não entra terceira fonte.
- **Anti-template da marca:** nada de gradiente decorativo sem função, nada de pílula branca flutuando com sombra e nada de fundo verde ocupando a tela.
  - Os glows radiais do dizevolv viram a **grade + linha de scan** da capa da palestra, que é textura nativa da marca.
  - O spotlight é cinza e branco, e só aparece como resposta ao cursor.
- **Logo:** `Identidade Visual/logo/vn-one-logo.png` (cromada, para fundo escuro) e `vn-one-logo-dark.png` (para fundo claro).
  - Recriar em SVG com `linearGradient` cromado e comparar lado a lado com o PNG.
  - Se a fidelidade não ficar boa, usar WebP 2x otimizado.
  - O PNG atual do MinIO e o `brightness-0` saem.
- **Ritmo:** seções claras (`cream` e `white`) alternadas com blocos escuros intencionais (`black`): simulador, CTA final e rodapé.

## Arquitetura (o que muda no código)

Manter React 19, Vite, Tailwind v4, `motion/react`, react-router 7 e `react-helmet-async`, e **não adicionar biblioteca de animação**. Usar o que já está instalado e parado:
- `class-variance-authority` para as variantes de botão;
- `cn()` de `src/lib/utils.ts`;
- `@radix-ui/react-dialog` para o modal de vídeo, o depoimento expandido e o menu mobile com focus trap;
- `@radix-ui/react-popover` para as pílulas do hero.

```
src/
  styles/tokens.css            ← @theme, fontes, paleta e variáveis dos tokens VN One
  styles/motion.css            ← keyframes e utilitários de movimento
  styles/components.css        ← estilos compartilhados de componentes (os três são importados no index.css;
                                 a divisão do tokens.css atual nesses três arquivos chega no lote F do plano de correções, item F.10,
                                 e até lá o index.css importa só tokens.css e skeleton.css)
  components/ui/               ← Button (cva), Container, Section, Kicker, Heading, Pill,
                                 SpotlightCard, Marquee, Reveal (+ RevealGroup c/ stagger),
                                 CountUp, WindowFrame, Accordion (<details> nativo),
                                 Logo (SVG), Cursor, ScanGrid, VideoModal
  components/layout/           ← SiteLayout (Outlet + page transition), Header,
                                 MobileMenu, Footer, ScrollProgress, WhatsAppButton, SkipLink
  sections/home/               ← HeroSentence, AutomationPanel, IntegrationsMarquee,
                                 StatementStats, UseCaseTabs, ServicesCards, MethodSteps,
                                 RoiSimulator, Testimonials, ClientGrid, FaqSection, FinalCta
  sections/shared/             ← PageHero, CtaBand (reusados nas páginas internas)
  hooks/                       ← useCycle (índice com pausa em hover/focus/aba oculta/reduced),
                                 usePointerSpotlight, useMagnetic, useFinePointer (matchMedia,
                                 substitui o isTouchDevice lido 1x no import)
  lib/roi.ts                   ← função pura de economia (hero e simulador usam a mesma)
  lib/validation.ts            ← validação pura do formulário
  lib/constants.ts             ← JÁ EXISTE: estender com WhatsApp, e-mail e redes centralizados
                                 (hoje repetidos 5 a 13x); trocar isTouchDevice e LOGO_URL
  data/                        ← testimonials.ts, partners.ts, integrations.ts, process.ts,
                                 stats.ts, useCases.ts (tirar conteúdo inline dos componentes)
```

- **Rotas:** `App.tsx` passa a usar uma *layout route* (`<Route element={<SiteLayout/>}>`). Header, Footer, WhatsApp e skip link deixam de ser repetidos em cada página, e o Blog ganha o layout do site.
- **Animações globais:**
  - `<MotionConfig reducedMotion="user">`;
  - bloco CSS `@media (prefers-reduced-motion: reduce)` igual ao do abacatepay;
  - os hooks de ciclo param quando o usuário pede menos movimento;
  - a opção "pausar animações" do `AccessibilityWidget` passa a forçar `reducedMotion="always"`.
- **Reaproveitar:**
  - `src/lib/useScrollToHash.ts`, `SEO.tsx`, `ServiceSelect.tsx`, `ContactForm.tsx` (redesenhado, mas com a lógica de envio intacta);
  - `MagneticDock.tsx` (a ideia, dentro de `useMagnetic`);
  - a fórmula do `ROICalculator.tsx` (`horas × equipe × valor/h × 52`, economia de 80%), extraída para `lib/roi.ts` sem mudar o resultado.
- **Remover:**
  - `Hero`, `HeroBackground`, `Stats`, `ProjectsTeaser` (da home), `SocialProof`, `CTASection`;
  - `Process.tsx`, que vira `MethodSteps`, e com ele `FloatingIcons` (o `Process.tsx` importa `PaperPlane` de lá, e as duas saem juntas);
  - `ThemeToggle` (`Header.tsx:105`) e `ThemeProvider`/`ThemeContext` (`main.tsx`). Estão em uso, mas saem por decisão: o site passa a ter tema único;
  - `CustomCursor` (código morto);
  - as utilitárias CSS não usadas (`.glass*`, `.text-gradient-dark`) e o bloco `.dark` do `index.css`.
  - `ProjectCard` fica, redesenhado, porque o `/projetos` usa.
- **Formulário: os webhooks n8n são críticos para o negócio.**
  - Manter o POST direto do navegador, as chaves do payload (`nome`, `email` ou `whatsapp`, `servico`, `mensagem`, `timestamp`) e o formato Evolution do telefone.
  - Só acrescentar a validação de nome, e-mail e mensagem, que hoje passam vazios.

## Home, na ordem

Cada linha diz qual referência inspira qual técnica. Copiamos a técnica, nunca texto, arte ou asset das referências.

1. **Header** (dizevolv):
   - pílula flutuante com a logo, Serviços, Como funciona, Clientes, Projetos, Sobre, Blog e o CTA "vamos conversar";
   - encolhe passando de 60px de scroll;
   - barra de progresso fina em cinza tinta;
   - menu mobile em Dialog com focus trap e Esc.
2. **Hero** (abacatepay + dizevolv), dentro de um cartão `cream` arredondado com inset de 16 a 24px, grade com máscara e o loop HyperFrames mudo bem sutil atrás.
   - **Frase-título interativa (h1)**, rascunho: "sua equipe perde [10 horas ▾] por semana com [planilha e whatsapp ▾]. automatizando, a gente devolve [r$ 1.733] por mês."
     - **Conta do hero** (`lib/roi.ts`, a mesma fórmula do simulador):
       - mensal = `horasSemana × R$ 50 × 52 × 0,8 ÷ 12`, com equipe = 1 porque as horas já são o total da equipe;
       - 10h dão R$ 1.733;
       - a pílula de horas oferece 5, 10, 20 e 40 horas;
       - a pílula de tarefa muda só o painel e o texto, não o número.
     - As pílulas são Popover + listbox acessível (aria-label "Horas por semana: 10. Alterar").
     - O valor final é a **única** pílula em acento (fundo `#00E5A0`, texto preto) e anima até o novo número.
     - Abaixo, em letra miúda: "estimativa com R$ 50 por hora".
   - Palavras entram com rise + blur em stagger, e o cursor pisca no fim da frase. O cursor fica **na cor tinta** no hero claro, porque o do `tokens.css` é em acento e somaria um segundo elemento ciano.
   - CTAs: "quero automatizar" e "ver como funciona ▶", que abre o **filme** no VideoModal.
   - Anotação em mono "// muda os números aí" com seta desenhada (stroke-dashoffset) apontando para o painel.
   - **Painel "automação ao vivo"** (WindowFrame):
     - à esquerda as fontes (WhatsApp, e-mail, planilha);
     - à direita linhas que vão ganhando ✓ em ciclo de 1,4s;
     - pílulas de etapa e um "cabo" SVG com pulso correndo, como na palestra;
     - começa inclinado (rotateX 14°, scale .94) e endireita com `useScroll` + `useTransform`;
     - o conteúdo muda conforme a tarefa escolhida na frase.
3. **Marquee de integrações** (dizevolv):
   - "conectamos o que você já usa": WhatsApp, n8n, Supabase, Claude, Google Workspace, Notion, Gmail, Sheets e as outras marcas da palestra;
   - SVGs Simple Icons monocromáticos (CC0), com os paths copiados de `Palestra-Super-Agente/deck/assets/logos/`;
   - máscara nas bordas e pausa no hover.
4. **Número herói + 4 cards** (abacatepay):
   - um número grande e os quatro dados que já existem em `Stats.tsx` (500h+, 100+, 10+, 85%), com count-up;
   - ilustração 1 entrando pelas laterais com parallax.
5. **Onde a automação entra** (dizevolv):
   - abas Atendimento, Comercial, Financeiro e Operações, que trocam sozinhas a cada 4,2s com barra de progresso na aba;
   - pausam em hover, foco ou clique;
   - à direita, um card "como funciona" com 3 passos que entram em sequência.
6. **Serviços** (dizevolv): 3 SpotlightCards a partir de `src/data/services.ts`.
   - O spotlight segue o cursor e a borda cônica gira no hover.
   - O ícone gira e escala, e os itens do `inclui` entram deslizando.
   - Link para `/servicos`.
7. **Método** (dizevolv):
   - 4 cards em escada ascendente com números `01` a `04` grandes em Space Grotesk 700 e régua inferior;
   - conteúdo de `Process.tsx`, movido para `data/process.ts`.
8. **Simulador** (abacatepay):
   - seção `black` com cantos de 40px;
   - controle segmentado de tamanho da equipe, slider de horas e valor/hora;
   - o número grande em acento anima;
   - a lógica vem de `lib/roi.ts`;
   - o CTA pré-preenche o formulário (comportamento atual do `onQuoteRequest`).
9. **Depoimentos + clientes**: o título é "quem já automatizou com a gente".
   - Os cards de texto grande têm alturas alternadas como no abacatepay, com a logo, um trecho do depoimento e o nome.
   - O clique abre um Dialog com o texto completo. Não há autoplay.
   - Depois vem a grade de logos em células com borda, como no dizevolv. As logos ficam monocromáticas e ganham cor no hover.
10. **FAQ** (abacatepay + dizevolv): duas colunas, com título e CTA à esquerda e o acordeão em cards à direita (`src/data/faqs.ts`).
11. **CTA final + formulário**:
    - seção `black` com grade e scan, o título "qual processo a gente automatiza primeiro?" e o cursor;
    - WhatsApp de um lado e `ContactForm` do outro;
    - ilustração 2 na borda inferior.
12. **Rodapé** (abacatepay + dizevolv):
    - fundo `black` com cantos superiores arredondados;
    - colunas Navegação, Serviços, Contato e Legal;
    - wordmark gigante "vn one" em `--vn-chrome` revelado com clip-path no scroll;
    - barra final com © do ano calculado, CNPJ se o Victor quiser, privacidade, LGPD e redes.

**Movimento:** só `transform`, `opacity`, `clip-path`, `filter` e `stroke-dashoffset`. O easing é `--ease-out: cubic-bezier(.22,1,.36,1)`. O reveal usa um `useInView` por container, nunca por item, como já pede a convenção do projeto.

## Páginas internas (mesmo sistema)

- **/servicos:**
  - PageHero;
  - grade de SpotlightCards com os 6 serviços e prazo;
  - combos como cards de oferta, sem inventar preço;
  - FAQ e CtaBand.
- **/sobre:**
  - a VN One (o que é e como trabalha);
  - Victor como fundador, com foto em moldura, gerada em AVIF e WebP (2 tamanhos) a partir de `scripts/assets/victor-photo.jpg` (982×1024, fora de `public/` para não ir no build), porque o `.webp` atual tem só 288×300;
  - o Método em escada;
  - as ferramentas num marquee ou grade (de `Skills.tsx`);
  - CtaBand.
- **/projetos:**
  - as abas atuais redesenhadas;
  - ProjectCard em moldura de navegador com hover e spotlight.
- **/projetos/:slug:**
  - hero com galeria;
  - o impacto como frase de destaque, sem count-up, porque em `data/projects.ts` os valores são texto ("24/7 automática");
  - coluna de fatos sticky;
  - "próximo projeto".
- **/contato:** PageHero, simulador, formulário, FAQ e o JSON-LD FAQPage que já existe.
- **/privacidade e /lgpd:**
  - layout editorial (coluna de leitura e sumário sticky);
  - **sem mudar fatos jurídicos sem o ok do Victor** (ver pendências).
- **/blog:** entra no SiteLayout, com os cards redesenhados. O `newsService.ts` não muda.
- **404:** lowercase, cursor e glitch cromado.

## Vídeos (HyperFrames, com a Palestra-Super-Agente como base)

- **Projeto:** `media/hyperframes/` no repo, fora do build do Vite.
  - Copiar da palestra as fontes, as logos, os SVGs de marcas e `assets/sfx/` (Pixabay, com o `CREDITS.md`).
  - Adaptar o estilo das composições `automacao.html`, `aovivo.html`, `mensagem.html` e `anatomia.html`.
  - Seguir o contrato do `SLIDE-GUIDE.md`: `fromTo`, nada de `repeat:-1` ou `Math.random`, só transform e opacity, e 1 ciano por cena.
- **Loop do hero:** 8s, sem emenda visível, mudo.
  - Grade, scan e pulsos correndo nos cabos.
  - `webm` + `mp4` menor que 1,5 MB, com poster.
  - `preload="none"`, poster fixo quando o usuário pede menos movimento e nada em `save-data`.
- **Filme "como funciona":** 30 a 45s, 1920×1080, sem narração.
  - Áudio: trilha instrumental de banco livre (Pixabay, uso comercial, com o crédito no `CREDITS.md`) + os sfx da palestra. A palestra não tem música, então a trilha é buscada via `/media-use`. O texto aparece na tela.
  - Conforme o skill, apresento **3 roteiros em texto no chat** para o Victor escolher. Depois vêm `SPEC.md`, `check`, `snapshot --review` e o render.
  - Saída: `public/media/como-funciona.{webm,mp4}` + poster + legendas `.vtt` descritivas.
  - Toca no VideoModal só depois do clique, e o som só sai depois do gesto do usuário.
  - Enquanto o filme não estiver aprovado, o botão "ver como funciona" rola até a seção Método.

## Ilustrações (1 ou 2)

- Gravura monocromática em cinzas da marca, sem cor e com conceito próprio.
- Não pode ser o "mãos + abacate" nem imitar a arte do abacatepay.
- Gerar com o skill `nanobanana`. Os conceitos e as imagens ficam em arquivo e eu aviso o caminho no chat para aprovação. Se a geração não estiver disponível, a seção funciona sem a ilustração.
- Exportar AVIF e WebP com `width` e `height` e `loading="lazy"`.

## Copy

- Voz VN One ("nós"), direta, com humor leve, e títulos em minúsculas.
- Todo texto passa pelo `/humanizer:humanizer` (modo embutido). Regras do Victor e do SLIDE-GUIDE:
  - **sem — ou –**;
  - **sem barra como separador**;
  - sem "não é X, é Y", sem tríade forçada, sem frase de efeito no fim;
  - sem palavras de IA ("revolucionário", "potencialize", "desbloqueie", "jornada").
- **Nunca inventar número, cliente ou resultado.** Os números vêm de `Stats.tsx`, os prazos de `services.ts` e os depoimentos são os reais. O que não estiver documentado vira `[preencher]` e entra na lista para o Victor.
- A copy fica nos arquivos `data/*.ts` para ser fácil de editar.
- Entrego o texto de cada página no chat para revisão antes de publicar.

## Fases (cada uma termina com build verde, testes e screenshots)

0. **Preparação:**
   - criar o branch `redesign/vn-one-v2` e rodar `npm ci`;
   - instalar Vitest + Testing Library + jsdom + `@vitest/coverage-v8` e configurar o Playwright (`playwright.config.ts`);
   - salvar este design em `docs/superpowers/specs/2026-10-26-redesign-vn-one-design.md`;
   - salvar as preferências do Victor na memória: escolhas no chat sem artefatos, copy via humanizer sem travessão e sem barra, referências dizevolv e abacatepay.
1. **Fundação:**
   - tokens, fontes, Logo SVG, primitivos `ui/`, hooks e MotionConfig;
   - SiteLayout, Header com MobileMenu, Footer, WhatsAppButton e ScrollProgress;
   - layout route e remoção do tema escuro.
   - TDD em `lib/roi.ts`, `lib/validation.ts` e `useCycle`.
2. **Home:** seções 1 a 12, os arquivos `data/` e a remoção dos componentes antigos.
3. **Vídeos HyperFrames:** loop do hero, depois o filme (roteiro escolhido pelo Victor) e o VideoModal.
4. **Ilustrações.**
5. **Páginas internas:** /servicos, /sobre, /projetos (e detalhe), /contato.
6. **Legais, blog e 404.**
7. **Copy final e SEO:**
   - passe do humanizer em tudo;
   - JSON-LD `Organization` (VN One) com Victor como `founder`;
   - títulos e descrições;
   - regerar o OG banner com `scripts/generate-og-banner.mjs` no novo visual;
   - `lastmod` do sitemap.
8. **QA e revisão:** os agentes code-reviewer, security-reviewer e a11y, e depois o PR.

## Verificação

- `npm run lint` (tsc) e `npm run build` sem erro.
- `npx vitest run --coverage`: ≥80% em `src/lib` e `src/hooks`. O teste de `roi.ts` confere que o resultado é o mesmo da fórmula atual do `ROICalculator`.
- `npx playwright test`:
  - envio do formulário nos dois caminhos (email e whatsapp) com **interceptação de rota**, verificando URL e payload sem chamar o n8n de verdade;
  - nav, menu mobile (focus trap e Esc) e pílulas do hero recalculando;
  - abas pausando;
  - modal de vídeo;
  - rodada com `reducedMotion: 'reduce'`.
- Screenshots em 320, 375, 768, 1024, 1440 e 1920 px, e captura REA (`capture_browser_scenario` com PageDown, o mesmo roteiro das referências) do `vite preview` para comparar lado a lado com dizevolv e abacatepay.
- `npx hyperframes check --json` sem erros e `snapshot --review` com `REVIEW.md` nos vídeos.
- Lighthouse na home e em /servicos: LCP < 2,5s, CLS < 0,1, INP < 200ms, a11y ≥ 95.
- **Teste real dos dois webhooks** (cria lead de verdade no n8n): só com o ok do Victor, no fim.

## Pendências para o Victor (não bloqueiam o início)

Cada pendência tem um plano B, então nada trava o build. O PR abre como **draft** e só vira pronto quando estas estiverem resolvidas:

- **Depoimentos de Henrique e Pierre** (`SocialProof.tsx` linhas 55 e 66): os textos finais ainda estão como rascunho. Até chegarem, ficam como estão hoje, porque já estão no ar.
- **Privacidade e LGPD**: o texto cita Supabase e hash de IP, mas o formulário hoje vai direto para o n8n. Confirmar o texto correto antes de mexer. Até lá, o conteúdo não muda, só o layout.
- **CNPJ no rodapé**: se mostra e qual. Até lá, fica sem.
- **Roteiro do filme**: escolher entre os 3 que vou propor. Até lá, o botão rola até o Método.
- **Ilustrações**: aprovar os conceitos. Até lá, as seções vão sem ilustração.
- **Copy**: revisar o texto de cada página no chat.
- **Limpeza** (feita no lote A do plano de correções): `public/projects/screenshots/` (2,9 MB sem uso) e as dependências mortas (`express`, `dotenv`, `tsx`) saíram. O `victor-photo.jpg` fica como fonte da foto do Sobre, agora em `scripts/assets/`, fora do build.

## Checklist técnico do Plano 3

O que as páginas antigas ainda carregam, para sair junto com elas quando forem reconstruídas:

- **CSS legado** (Q-25): `.roi-slider*` e as variáveis `--roi-slider-*` (só o `ROICalculator.tsx`), os keyframes `glitch-1` e `glitch-2` (só o `NotFound.tsx`, com cores fora da paleta) e `.custom-scrollbar` (só o `ServiceSelect`).
- **Funções com mais de 50 linhas** (Q-33): `BlogPage` 310, `ROICalculator` 204, `LgpdPage` 198, `ServicesPage` 140, `PrivacyPage` 108, `Skills` 101, `ProjectDetail` 100, `About` 88 e `newsService.fetchFromDevTo` 68.
- **`text-[10px]`** (Q-26): 30 usos, todos nas páginas antigas (`BlogPage`, `ProjectDetail`, `ServicesPage`, `LgpdPage`). Usar a escala de texto dos tokens.
- **`newsService`** (Q-35d): seis blocos `catch` vazios, de propósito, para a cadeia de fontes do blog. Listar a causa em vez de engolir, ou manter com o comentário.

## Fora do escopo

Deploy (só PR), backend do blog e Supabase, modo escuro e qualquer mudança no destino ou no payload dos webhooks.
