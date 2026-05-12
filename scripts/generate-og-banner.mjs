import { chromium } from 'playwright-core';
import { writeFileSync } from 'fs';
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

  /* Radial gradient overlay */
  .bg-gradient {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 70% 80% at 35% 50%, #111111 0%, #080808 100%);
  }

  /* Dot grid texture */
  .dot-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  /* Subtle edge vignette */
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(0,0,0,0.55) 100%);
  }

  /* Content wrapper */
  .content {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: stretch;
  }

  /* Left zone */
  .left {
    width: 650px;
    padding: 72px 0 56px 80px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    z-index: 2;
  }

  .top-section {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Badge */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 14px;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 100px;
    background: rgba(255,255,255,0.04);
    width: fit-content;
    margin-bottom: 28px;
  }

  .badge-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255,255,255,0.35);
  }

  .badge-text {
    font-family: 'Inter', sans-serif;
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.14em;
    color: rgba(255,255,255,0.42);
    text-transform: uppercase;
  }

  /* Name */
  .name {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 74px;
    font-weight: 700;
    color: #ffffff;
    line-height: 1.0;
    letter-spacing: -0.025em;
    margin-bottom: 18px;
  }

  /* Subtitle */
  .subtitle {
    font-family: 'Inter', sans-serif;
    font-size: 22px;
    font-weight: 400;
    color: #6b6b6b;
    letter-spacing: -0.01em;
    margin-bottom: 28px;
  }

  /* Divider */
  .divider {
    width: 240px;
    height: 1px;
    background: rgba(255,255,255,0.08);
    margin-bottom: 24px;
  }

  /* Tagline */
  .tagline {
    font-family: 'Inter', sans-serif;
    font-size: 17px;
    font-weight: 300;
    color: rgba(255,255,255,0.35);
    line-height: 1.65;
    letter-spacing: 0.005em;
  }

  /* Bottom section */
  .bottom-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Tech badges */
  .tech-badges {
    display: flex;
    gap: 9px;
    align-items: center;
  }

  .tech-badge {
    padding: 5px 13px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 100px;
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.07em;
    color: rgba(255,255,255,0.45);
    text-transform: uppercase;
    background: transparent;
  }

  /* URL */
  .url {
    font-family: 'Inter', sans-serif;
    font-size: 12.5px;
    font-weight: 300;
    color: rgba(255,255,255,0.18);
    letter-spacing: 0.03em;
  }

  /* Right zone */
  .right {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  /* Giant VN monogram */
  .monogram {
    position: absolute;
    top: -30px;
    left: 10px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 360px;
    font-weight: 800;
    color: rgba(255,255,255,0.042);
    line-height: 1;
    letter-spacing: -0.05em;
    user-select: none;
    pointer-events: none;
  }

  /* Glow spotlight */
  .spotlight {
    position: absolute;
    top: 80px;
    left: 130px;
    width: 2px;
    height: 420px;
    background: rgba(255,255,255,0.06);
    filter: blur(18px);
    border-radius: 50%;
    transform: scaleX(12);
  }

  /* Decorative lines (circuit-like) */
  .deco-lines {
    position: absolute;
    bottom: 88px;
    right: 48px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .deco-line {
    height: 1px;
    background: rgba(255,255,255,0.09);
    border-radius: 1px;
  }

  /* Thin vertical separator */
  .separator {
    position: absolute;
    left: 0;
    top: 80px;
    bottom: 80px;
    width: 1px;
    background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent);
  }
</style>
</head>
<body>
  <div class="bg-gradient"></div>
  <div class="dot-grid"></div>
  <div class="vignette"></div>

  <div class="content">
    <div class="left">
      <div class="top-section">
        <div class="badge">
          <div class="badge-dot"></div>
          <span class="badge-text">Automação & IA</span>
        </div>
        <div class="name">Victor Nogueira</div>
        <div class="subtitle">Especialista em Automação N8N &amp; IA</div>
        <div class="divider"></div>
        <div class="tagline">
          Elimine processos manuais.<br>
          Escale sem equipe de TI.
        </div>
      </div>
      <div class="bottom-section">
        <div class="tech-badges">
          <span class="tech-badge">N8N</span>
          <span class="tech-badge">Inteligência Artificial</span>
          <span class="tech-badge">Automação</span>
        </div>
        <div class="url">vnone.com.br</div>
      </div>
    </div>

    <div class="right">
      <div class="separator"></div>
      <div class="monogram">VN</div>
      <div class="spotlight"></div>
      <div class="deco-lines">
        <div class="deco-line" style="width: 64px;"></div>
        <div class="deco-line" style="width: 42px;"></div>
        <div class="deco-line" style="width: 52px;"></div>
      </div>
    </div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(html, { waitUntil: 'networkidle' });

// Wait for Google Fonts to load
await page.waitForTimeout(2000);

const outputPath = join(__dirname, '..', 'public', 'og-banner.png');
await page.screenshot({ path: outputPath, type: 'png' });
await browser.close();

console.log(`Banner salvo em: ${outputPath}`);
