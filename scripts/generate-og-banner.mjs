import { chromium } from 'playwright-core';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 1200px;
    height: 630px;
    overflow: hidden;
    background: #080808;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    position: relative;
  }

  /* Fundo gradiente sutil */
  .bg-gradient {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 80% 80% at 50% 50%, #111111 0%, #080808 100%);
  }

  /* Dot grid */
  .dot-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  /* Vignette */
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%);
  }

  /* VN monograma — fundo, centralizado */
  .monogram {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 480px;
    font-weight: 800;
    color: rgba(255,255,255,0.032);
    line-height: 1;
    letter-spacing: -0.05em;
    user-select: none;
    white-space: nowrap;
  }

  /* Glow central */
  .glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 300px;
    background: radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%);
    filter: blur(30px);
  }

  /* Conteúdo centralizado */
  .content {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    z-index: 2;
    gap: 0;
  }

  /* Badge topo */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 16px;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 100px;
    background: rgba(255,255,255,0.04);
    margin-bottom: 32px;
  }

  .badge-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255,255,255,0.4);
  }

  .badge-text {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.14em;
    color: rgba(255,255,255,0.45);
    text-transform: uppercase;
  }

  /* Nome */
  .name {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 80px;
    font-weight: 700;
    color: #ffffff;
    line-height: 1.0;
    letter-spacing: -0.03em;
    margin-bottom: 16px;
  }

  /* Subtítulo */
  .subtitle {
    font-family: 'Inter', sans-serif;
    font-size: 22px;
    font-weight: 400;
    color: #606060;
    letter-spacing: -0.01em;
    margin-bottom: 28px;
  }

  /* Divisor */
  .divider {
    width: 48px;
    height: 1px;
    background: rgba(255,255,255,0.12);
    margin: 0 auto 28px;
  }

  /* Tagline */
  .tagline {
    font-family: 'Inter', sans-serif;
    font-size: 17px;
    font-weight: 300;
    color: rgba(255,255,255,0.32);
    line-height: 1.7;
    margin-bottom: 40px;
  }

  /* Tech badges */
  .tech-badges {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
    margin-bottom: 40px;
  }

  .tech-badge {
    padding: 5px 14px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 100px;
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.07em;
    color: rgba(255,255,255,0.4);
    text-transform: uppercase;
  }

  /* URL rodapé */
  .url {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 300;
    color: rgba(255,255,255,0.15);
    letter-spacing: 0.05em;
  }

  /* Linhas decorativas laterais */
  .deco-left, .deco-right {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .deco-left { left: 60px; align-items: flex-start; }
  .deco-right { right: 60px; align-items: flex-end; }

  .deco-line {
    height: 1px;
    background: rgba(255,255,255,0.07);
    border-radius: 1px;
  }
</style>
</head>
<body>
  <div class="bg-gradient"></div>
  <div class="dot-grid"></div>
  <div class="monogram">VN</div>
  <div class="glow"></div>
  <div class="vignette"></div>

  <div class="deco-left">
    <div class="deco-line" style="width:50px"></div>
    <div class="deco-line" style="width:32px"></div>
    <div class="deco-line" style="width:42px"></div>
  </div>

  <div class="deco-right">
    <div class="deco-line" style="width:50px"></div>
    <div class="deco-line" style="width:32px"></div>
    <div class="deco-line" style="width:42px"></div>
  </div>

  <div class="content">
    <div class="badge">
      <div class="badge-dot"></div>
      <span class="badge-text">Automação &amp; IA</span>
    </div>
    <div class="name">Victor Nogueira</div>
    <div class="subtitle">Especialista em Automação N8N &amp; IA</div>
    <div class="divider"></div>
    <div class="tagline">
      Elimine processos manuais.<br>
      Escale sem equipe de TI.
    </div>
    <div class="tech-badges">
      <span class="tech-badge">N8N</span>
      <span class="tech-badge">Inteligência Artificial</span>
      <span class="tech-badge">Automação</span>
    </div>
    <div class="url">vnone.com.br</div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const outputPath = join(__dirname, '..', 'public', 'og-banner.png');
await page.screenshot({ path: outputPath, type: 'png' });
await browser.close();
console.log(`Banner salvo em: ${outputPath}`);
