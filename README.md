# VN One

Site da VN One, a empresa de automação e IA de Victor Nogueira. É uma aplicação de página única: React 19, Vite 8, Tailwind v4, motion 12 e react-router 7. Fica em https://vnone.com.br.

Requer Node 22 ou mais novo.

## Comandos

| Comando | O que faz |
|---|---|
| `npm ci` | Instala exatamente o que está no lockfile |
| `npm run dev` | Servidor de desenvolvimento na porta 3000 |
| `npm run build` | Gera `dist/` |
| `npm run preview` | Serve `dist/` já com os cabeçalhos de segurança de produção |
| `npm run lint` | ESLint (todas as regras como erro) e checagem de tipos (`tsc --noEmit`) |
| `npm test` | Testes unitários (Vitest, jsdom) |
| `npm run coverage` | Testes com cobertura |
| `npm run e2e` | Playwright em Chromium desktop e mobile. Faz o build, sobe o preview (`E2E_PORT`, padrão 4173) |
| `npm run budget` | Peso gzip do caminho crítico (entrada mais modulepreloads). `-- --enforce` falha acima de 160 kB (a meta é 150, o motivo da diferença está em `scripts/check-bundle-budget.mjs`) |
| `npm run headers` | Regenera `nginx/security-headers.conf` a partir de `config/securityHeaders.mjs` |
| `npm run og` | Regenera `public/og-banner.png` |
| `npm run founder-photo` | Gera `public/founder/victor-{480,960}.{avif,webp}` (a foto da `/sobre`) a partir de `scripts/assets/victor-photo.jpg`, que fica fora do build. Nunca amplia a foto |
| `npm run lcp` e `npm run measure:skeletons` | Medem LCP e as alturas dos esqueletos, só em páginas locais |

## Variáveis de ambiente

Nenhuma. O site compila e roda sem `.env`. Tudo que começa com `VITE_` vai para o bundle público, então nada secreto entra por ali.

## Rotas

Só a `HomePage` entra no caminho crítico. Todas as outras são `lazyWithRetry` e ficam dentro do `SiteLayout` (cabeçalho, rodapé, botões flutuantes).

| Rota | Página | O que tem |
|---|---|---|
| `/` | `HomePage` | A home, com as seções em `src/sections/home` |
| `/servicos` | `ServicesPage` | Grade de serviços (`#<slug>` vem dos links do rodapé), pacotes sem preço, perguntas |
| `/sobre` | `AboutPage` | O fundador (texto aprovado, foto em AVIF e WebP), a VN One, o método (`#metodo`) e as ferramentas |
| `/projetos` | `ProjectsPage` | Dois projetos em destaque e a grade dos outros cinco. Não há abas nem campo de impacto |
| `/projetos/:slug` | `ProjectDetailPage` | O caso do projeto. Slug removido redireciona para `/projetos`, slug desconhecido mostra o 404 com `noindex` |
| `/contato` | `ContactPage` | Canais, simulador e o formulário (`ContactForm`, o mesmo da home) |
| `/blog` | `BlogPage` | Artigos de outras fontes, filtros e esqueletos. Fora do índice até ter textos próprios |
| `/privacidade` e `/lgpd` | `PrivacyRoute` e `LgpdRoute` | O texto jurídico congelado, dentro do `LegalFrame` (sumário e estilo por fora) |
| qualquer outra | `NotFound` | O 404 com glitch cromado, `noindex` |

## Estrutura

- `src/pages` e `src/sections/<página>`: as rotas e o que cada uma monta (`home`, `shared` com `PageHero`, `CtaBand` e `ServiceCard`, `services`, `about`, `projects`, `contact`, `blog`). `src/pages/legal` tem a moldura das duas páginas jurídicas.
- `src/components`: UI compartilhada (`ui`, `layout`, `contact`), o formulário e o widget de acessibilidade.
- `src/data`: o conteúdo (serviços, projetos, depoimentos, perguntas). `projectImages.ts` é gerado por `scripts/process-project-images.mjs`.
- `src/lib` e `src/hooks`: regras puras, como o ROI (`roi.ts`) e o contrato dos webhooks (`contact.ts`).
- `src/styles`: tokens, estilos de componentes, movimento e os esqueletos medidos.
- `config`: os cabeçalhos de segurança (`securityHeaders.mjs`) e a divisão dos chunks (`manualChunks.mjs`).
- `nginx.conf` e `nginx/`: o que a imagem Docker serve. O cabeçalho de HSTS fica no proxy que termina o TLS.
- `scripts`: geradores (imagens, banner, marca) e medições. O que lê imagens originais nunca as guarda no repositório.

## Deploy

- EasyPanel: o serviço é um App com origem no GitHub e build pelo `Dockerfile`, domínio com proxy na porta 80 e nenhuma variável de ambiente. O passo a passo, a conferência depois de publicar e as decisões do dono estão em [docs/deploy-easypanel.md](docs/deploy-easypanel.md).
- Docker: `docker build -t vnone .` gera uma imagem nginx na porta 80, com os cabeçalhos de segurança e o cache definidos em `nginx.conf`. A imagem foi feita para rodar atrás do proxy que termina o TLS (é ele que envia o HSTS). A política de segurança manda o navegador trocar `http` por `https`, então para um teste local abra por `localhost`: por um IP da rede, a página carrega sem estilo.
- O processo mestre do nginx roda como root, como na imagem oficial. Trocar para `nginx-unprivileged` (porta 8080) muda a porta e o proxy, por isso fica como decisão do dono.
- GitHub Pages (opcional, só manual): `.github/workflows/deploy.yml` roda o CI e publica o build com `GITHUB_PAGES=true`, e exige o Pages ativado no repositório. As Pages não enviam cabeçalhos, então a política de segurança vai como `<meta>`. O CI da `main` roda em todo push pelo `ci.yml`.

## Os webhooks nunca são chamados em teste

O formulário de contato envia direto para dois webhooks do n8n, e é por eles que um lead chega ao dono do negócio. Por isso:

- Nenhum teste chama o n8n de verdade. O Vitest rejeita qualquer `fetch` sem stub, e todo spec do Playwright importa `test` de `e2e/n8nGuard.ts`, que aborta o que não for do próprio site.
- As URLs e o formato do payload em `src/lib/contact.ts` não mudam sem combinar com o n8n.

## Plano e especificação

- Especificação: `docs/superpowers/specs/2026-10-26-redesign-vn-one-design.md`
- Plano da fundação e da home: `docs/superpowers/plans/2026-10-26-vn-one-v2-fundacao-home.md`
- Plano das páginas internas: `docs/superpowers/plans/2026-11-01-vn-one-v2-paginas-internas.md`

## Guardas que protegem o visual e o texto

- `src/test/pageHygiene.test.ts`: sem `dark:`, `italic`, `text-[10px]`, família de cor fora da paleta, gradiente decorativo, `text-white/N` nem hex fora da paleta em TS. A lista de exceções é fechada: as duas páginas legais congeladas, os dois arquivos que as reestilizam e o mapa de cores das marcas das ferramentas (`TOOL_BRAND_COLORS`, que o dono pediu nas cores originais).
- `src/test/frozenFiles.test.ts`: o canal de leads, o `ContactForm` e as duas páginas legais não mudam um byte.
- `src/test/copy-rules.test.ts`: voz "a gente", sem travessão, sem " / ", sem palavra de venda.

