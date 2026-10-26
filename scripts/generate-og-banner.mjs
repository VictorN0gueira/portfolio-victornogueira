// Gera o banner de compartilhamento (WhatsApp, LinkedIn, Instagram).
// Uso: npm run og
// Saidas: public/og-banner.png (1200x630) e e2e/__shots__/og-square.png
// (recorte central 630x630 que o WhatsApp usa na miniatura, so para conferencia).
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const WIDTH = 1200;
const HEIGHT = 630;
const SAFE_SIZE = 630;
const SAFE_LEFT = (WIDTH - SAFE_SIZE) / 2;

const COLORS = {
  black: '#0A0A0A',
  grayMid: '#8A8A8A',
  white: '#FFFFFF',
  accent: '#00E5A0',
};

const FONTS = [
  { family: 'Space Grotesk', weight: 700, file: 'SpaceGrotesk-Bold.woff2' },
  { family: 'JetBrains Mono', weight: 400, file: 'JetBrainsMono-Regular.woff2' },
  { family: 'JetBrains Mono', weight: 500, file: 'JetBrainsMono-Medium.woff2' },
];

// page.setContent roda em about:blank, onde file:// pode ser bloqueado.
// Por isso fontes e logo entram como data: URLs em base64.
function toDataUrl(relativePath, mime) {
  const bytes = readFileSync(join(root, relativePath));
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function buildFontFaces() {
  return FONTS.map(
    ({ family, weight, file }) => `
  @font-face {
    font-family: '${family}';
    font-weight: ${weight};
    font-style: normal;
    src: url('${toDataUrl(`public/fonts/${file}`, 'font/woff2')}') format('woff2');
  }`,
  ).join('\n');
}

const STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    background: ${COLORS.black};
  }

  body { position: relative; }

  .grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
    background-size: 64px 64px;
    background-position: center center;
  }

  .scan {
    position: absolute;
    left: 0;
    right: 0;
    top: 552px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.55) 50%,
      transparent 100%
    );
    box-shadow: 0 0 14px rgba(255, 255, 255, 0.18);
  }

  /* Zona segura central 630x630: tudo que o WhatsApp mantem no recorte quadrado. */
  .safe {
    position: absolute;
    top: 0;
    left: ${SAFE_LEFT}px;
    width: ${SAFE_SIZE}px;
    height: ${HEIGHT}px;
    padding: 0 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .logo { display: block; height: 120px; width: auto; }

  .kicker {
    margin-top: 36px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
    font-size: 20px;
    letter-spacing: 0.18em;
    margin-right: -0.18em;
    text-transform: uppercase;
    color: ${COLORS.grayMid};
  }

  .title {
    margin-top: 28px;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 64px;
    line-height: 0.95;
    letter-spacing: -0.03em;
    text-transform: lowercase;
    color: ${COLORS.white};
  }

  .title > span { display: block; }
  .accent { color: ${COLORS.accent}; }

  /* Fora da zona segura: so o dominio, embaixo a direita. */
  .url {
    position: absolute;
    right: 48px;
    bottom: 40px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 400;
    font-size: 16px;
    letter-spacing: 0.08em;
    color: ${COLORS.grayMid};
  }
`;

function buildHtml() {
  const logo = toDataUrl('public/brand/vn-one-logo-chrome.png', 'image/png');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>${buildFontFaces()}
${STYLES}</style>
</head>
<body>
  <div class="grid"></div>
  <div class="scan"></div>
  <div class="safe">
    <img class="logo" src="${logo}" alt="VN One">
    <p class="kicker">AUTOMAÇÃO E IA PARA EMPRESAS</p>
    <h1 class="title">
      <span>o trabalho</span>
      <span>repetitivo vai</span>
      <span>pros <span class="accent">fluxos</span></span>
    </h1>
  </div>
  <div class="url">vnone.com.br</div>
</body>
</html>`;
}

async function main() {
  const bannerPath = join(root, 'public', 'og-banner.png');
  const squarePath = join(root, 'e2e', '__shots__', 'og-square.png');
  mkdirSync(dirname(squarePath), { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
    });
    await page.setContent(buildHtml(), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    await page.screenshot({ path: bannerPath, type: 'png' });
    await page.screenshot({
      path: squarePath,
      type: 'png',
      clip: { x: SAFE_LEFT, y: 0, width: SAFE_SIZE, height: SAFE_SIZE },
    });
  } finally {
    await browser.close();
  }

  process.stdout.write(`Banner salvo em: ${bannerPath}\nRecorte quadrado: ${squarePath}\n`);
}

main().catch((error) => {
  process.stderr.write(`Falha ao gerar o banner: ${error?.stack ?? error}\n`);
  process.exit(1);
});
