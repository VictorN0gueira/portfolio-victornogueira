// Generates the optimized VN One brand assets in public/brand/ (and the banner source in scripts/assets/) from the
// original logo PNGs. The source folder is passed as the first argument so no
// machine specific path lives in the repo:
//
//   node scripts/build-brand-assets.mjs "<folder with vn-one-logo.png and vn-one-logo-dark.png>"
//
// vn-one-logo.png is the chrome artwork (for dark backgrounds) and
// vn-one-logo-dark.png is the dark artwork (for light backgrounds).
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SOURCE_CHROME = 'vn-one-logo.png';
const SOURCE_DARK = 'vn-one-logo-dark.png';

const WEBP_HEIGHT = 96;
const WEBP_QUALITY = 90;
const BANNER_PNG_HEIGHT = 240;
const ICON_BACKGROUND = '#0A0A0A';
const APPLE_TOUCH_PADDING_RATIO = 0.12;
// The favicons (the 32 px one too) come from scripts/build-favicons.mjs, which has the tiny-size recipe.
const APPLE_TOUCH_SIZE = 180;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, 'public', 'brand');
// The chrome PNG only feeds scripts/generate-og-banner.mjs; it never ships, so it lives next to the scripts.
const bannerSourceDir = join(repoRoot, 'scripts', 'assets');

function fail(message) {
  process.stderr.write(`build-brand-assets: ${message}\n`);
  process.exit(1);
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

function resolveSources(folderArg) {
  if (!folderArg) {
    fail(
      'missing logo folder. Usage: node scripts/build-brand-assets.mjs "<folder with vn-one-logo.png and vn-one-logo-dark.png>"',
    );
  }

  const folder = resolve(folderArg);
  if (!existsSync(folder) || !statSync(folder).isDirectory()) {
    fail(`logo folder not found: ${folder}`);
  }

  const chrome = join(folder, SOURCE_CHROME);
  const dark = join(folder, SOURCE_DARK);
  for (const file of [chrome, dark]) {
    if (!existsSync(file) || !statSync(file).isFile()) {
      fail(`logo file not found: ${file}`);
    }
  }

  return { chrome, dark };
}

// Removes the transparent padding around the artwork and keeps it lossless so
// every output is resized from the same trimmed pixels.
async function trimmedPng(file) {
  return sharp(file).trim().png().toBuffer();
}

async function writeResized(buffer, file, height, format, targetDir = outDir) {
  const pipeline = sharp(buffer).resize({ height });
  const encoded =
    format === 'webp'
      ? pipeline.webp({ quality: WEBP_QUALITY, alphaQuality: 100 })
      : pipeline.png({ compressionLevel: 9 });
  const info = await encoded.toFile(join(targetDir, file));
  log(`${file}: ${info.width}x${info.height} (${info.size} bytes)`);
}

// The chrome logo centered on a solid square, scaled to fit inside the padding.
async function writeIcon(buffer, file, size, paddingRatio) {
  const inner = Math.round(size * (1 - paddingRatio * 2));
  const logo = await sharp(buffer)
    .resize({ width: inner, height: inner, fit: 'inside' })
    .toBuffer();
  const info = await sharp({
    create: { width: size, height: size, channels: 3, background: ICON_BACKGROUND },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, file));
  log(`${file}: ${info.width}x${info.height} (${info.size} bytes)`);
}

async function main() {
  const sources = resolveSources(process.argv[2]);
  mkdirSync(outDir, { recursive: true });
  mkdirSync(bannerSourceDir, { recursive: true });

  const [chrome, dark] = await Promise.all([trimmedPng(sources.chrome), trimmedPng(sources.dark)]);

  await writeResized(chrome, 'vn-one-logo-chrome.webp', WEBP_HEIGHT, 'webp');
  await writeResized(dark, 'vn-one-logo-dark.webp', WEBP_HEIGHT, 'webp');
  await writeResized(chrome, 'vn-one-logo-chrome.png', BANNER_PNG_HEIGHT, 'png', bannerSourceDir);
  await writeIcon(chrome, 'apple-touch-icon.png', APPLE_TOUCH_SIZE, APPLE_TOUCH_PADDING_RATIO);
}

main().catch((error) => {
  // Print the stack, not just the message, so a failing sharp call can be traced.
  fail(error instanceof Error ? (error.stack ?? error.message) : String(error));
});
