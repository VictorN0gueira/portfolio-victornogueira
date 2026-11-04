// Generates the site icon set that Google accepts, from the chrome logo that is already committed
// (scripts/assets/vn-one-logo-chrome.png, so no private original is needed):
//
//   node scripts/build-favicons.mjs        (or: npm run favicons)
//
// Outputs:
//   public/favicon.ico                16, 32 and 48 px images in one file (what a browser asks for on its own)
//   public/brand/favicon-{48,96,192,512}.png   Google wants a multiple of 48 px, square
//
// The mark is wide (about 2:1), so inside a square it is limited by its width. Small icons therefore use a thin margin
// (the mark has to be as large as possible to read at 16 px) and the big ones a normal margin.
// public/brand/favicon-32.png and apple-touch-icon.png come from scripts/build-brand-assets.mjs and are not touched here.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ICON_BACKGROUND = '#0A0A0A';
// Up to this size the icon is a browser tab or a search result favicon: the margin is thin.
const SMALL_ICON_MAX = 48;
const SMALL_PADDING_RATIO = 0.04;
const LARGE_PADDING_RATIO = 0.1;
// At 32 px and below the thin diagonal strokes of the chrome mark come out grey and faint, so the mark gets a margin
// of 2% and a contrast lift. The lift keeps the background value fixed (out = gain * value + bg * (1 - gain)), so
// only the strokes get brighter. The 48 px and bigger icons are not touched.
const TINY_ICON_MAX = 32;
const TINY_PADDING_RATIO = 0.02;
const TINY_CONTRAST_GAIN = 1.7;
const BACKGROUND_VALUE = 0x0a;

const PNG_SIZES = [48, 96, 192, 512];
const ICO_SIZES = [16, 32, 48];

const ICO_HEADER_BYTES = 6;
const ICO_ENTRY_BYTES = 16;
const ICO_TYPE_ICON = 1;
const ICO_BITS_PER_PIXEL = 32;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const logoFile = join(repoRoot, 'scripts', 'assets', 'vn-one-logo-chrome.png');
const publicDir = join(repoRoot, 'public');
const brandDir = join(publicDir, 'brand');

function log(message) {
  process.stdout.write(`${message}\n`);
}

function paddingFor(size) {
  if (size <= TINY_ICON_MAX) return TINY_PADDING_RATIO;
  return size <= SMALL_ICON_MAX ? SMALL_PADDING_RATIO : LARGE_PADDING_RATIO;
}

// The logo, centered on a solid square. Every size is resized from the same trimmed pixels (not from another size),
// so the 16 px image is as sharp as a 16 px image can be.
async function renderIcon(trimmedLogo, size) {
  const inner = Math.round(size * (1 - paddingFor(size) * 2));
  const logo = await sharp(trimmedLogo)
    .resize({ width: inner, height: inner, fit: 'inside', kernel: 'lanczos3' })
    .toBuffer();
  const square = sharp({ create: { width: size, height: size, channels: 3, background: ICON_BACKGROUND } })
    .composite([{ input: logo, gravity: 'centre' }])
    .removeAlpha();
  const lifted =
    size <= TINY_ICON_MAX
      ? sharp(await square.png().toBuffer()).linear(TINY_CONTRAST_GAIN, BACKGROUND_VALUE * (1 - TINY_CONTRAST_GAIN))
      : square;
  return lifted.png({ compressionLevel: 9 }).toBuffer();
}

// An ICO file is a 6 byte header, one 16 byte entry per image and then the images. PNG images are allowed inside
// (Vista and later, every browser), so the PNGs are embedded as they are.
function buildIco(images) {
  const header = Buffer.alloc(ICO_HEADER_BYTES);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(ICO_TYPE_ICON, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = ICO_HEADER_BYTES + ICO_ENTRY_BYTES * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(ICO_ENTRY_BYTES);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(ICO_BITS_PER_PIXEL, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

async function main() {
  if (!existsSync(logoFile)) {
    throw new Error(`logo not found: ${logoFile}`);
  }
  mkdirSync(brandDir, { recursive: true });

  const trimmedLogo = await sharp(logoFile).trim().png().toBuffer();

  for (const size of PNG_SIZES) {
    const data = await renderIcon(trimmedLogo, size);
    writeFileSync(join(brandDir, `favicon-${size}.png`), data);
    log(`brand/favicon-${size}.png: ${size}x${size} (${data.length} bytes)`);
  }

  const images = [];
  for (const size of ICO_SIZES) {
    images.push({ size, data: await renderIcon(trimmedLogo, size) });
  }
  const ico = buildIco(images);
  writeFileSync(join(publicDir, 'favicon.ico'), ico);
  log(`favicon.ico: ${ICO_SIZES.join(', ')} px (${ico.length} bytes)`);
}

main().catch((error) => {
  process.stderr.write(`build-favicons: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  process.exit(1);
});
