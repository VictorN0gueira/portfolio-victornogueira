// Turns the raw client logos into the self-hosted files of public/clients, one WebP per client, all on the same canvas.
//
// Usage: node scripts/process-client-logos.mjs <inputDir> [outputDir]
//
// This script never fetches anything. It reads the original files from a local <inputDir> that you fill by hand (for
// example by saving the logos from the client folder of the owner's storage), named <slug>.<png|jpg|jpeg|webp> with the
// slugs of LOGOS below. The input is treated as untrusted data: it is only decoded by sharp and never executed.
// <outputDir> defaults to public/clients.
//
// What it does to each logo, so that the nine of them carry the same visual weight:
// 1. Optionally replaces an opaque background by transparency (mode "mask"): the logos that are one color on a flat
//    background (white letters on a blue square) are turned into that one color on transparent, so they do not form a
//    dark box next to the logos that have no background.
// 2. Trims the transparent margin around the drawing, whatever the size of the original canvas.
// 3. Sizes the drawing by its ink area, not by its box: a filled disc and a thin wordmark get the same amount of ink,
//    inside a maximum width and height, so squares are limited by height and wide wordmarks by width, and none of them
//    is tiny or oversized. BOOST is the one hand-tuned knob per logo, for what the measure cannot see (a very dark disc).
// 4. Centers the drawing on a transparent canvas of 384x192 (2:1, the 2x size of a 192x96 slot), and writes it as WebP.
//
// Keep CANVAS_WIDTH and CANVAS_HEIGHT in sync with LOGO_WIDTH and LOGO_HEIGHT of src/sections/home/LogoImage.tsx
// (the canvas is twice the size of the largest slot, for high density screens).

import { mkdir, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const CANVAS_WIDTH = 384;
const CANVAS_HEIGHT = 192;
// The drawing never gets wider than 86% or taller than 72% of the canvas.
const MAX_WIDTH = Math.round(CANVAS_WIDTH * 0.86);
const MAX_HEIGHT = Math.round(CANVAS_HEIGHT * 0.72);
// The ink area (in canvas pixels) every logo aims for: that of a disc 128px wide, 64px in a 192x96 slot.
const INK_AREA = (Math.PI / 4) * 128 * 128;
// A pixel is part of the drawing from this alpha (of 255) up. Stray, almost invisible pixels do not widen the trim.
const TRIM_ALPHA = 24;
const WEBP_OPTIONS = { quality: 90, alphaQuality: 100, effort: 6 };

/** slug: the name of the input file. mode: "asis" keeps the pixels, "mask" turns a flat background into transparency. */
const LOGOS = [
  { slug: 'contador-de-padarias', mode: 'asis', boost: 0.88 },
  { slug: 'contas-ic', mode: 'asis', boost: 1 },
  { slug: 'proplast', mode: 'asis', boost: 1 },
  { slug: 'micael-santiago', mode: 'asis', boost: 0.88 },
  { slug: 'loja-karla-alvares', mode: 'asis', boost: 1 },
  { slug: 'mercadinho-irmao-cruz', mode: 'asis', boost: 1.2 },
  { slug: 'criativa-marketing', mode: 'asis', boost: 1 },
  // White letters on a flat blue square: the letters become blue on transparent.
  { slug: 'shipsmart', mode: 'mask', ink: [21, 19, 128], boost: 0.85 },
  { slug: 'henrique-franca', mode: 'asis', boost: 0.92 },
];

const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** The decoded pixels of a file, as RGBA. */
async function readPixels(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { pixels: Buffer.from(data), width: info.width, height: info.height };
}

/**
 * Replaces a flat background by transparency: the alpha of a pixel is how far its luminance is from the background (the
 * corner pixel) toward white, and the color is `ink` everywhere. New buffer, the input is left as it is.
 */
function maskBackground({ pixels, width, height }, ink) {
  const out = Buffer.alloc(pixels.length);
  const background = luminance(pixels[0], pixels[1], pixels[2]);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const value = luminance(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
    const alpha = Math.min(1, Math.max(0, (value - background) / (255 - background)));
    out[offset] = ink[0];
    out[offset + 1] = ink[1];
    out[offset + 2] = ink[2];
    out[offset + 3] = Math.round(alpha * 255);
  }
  return { pixels: out, width, height };
}

/** The box of the drawing (pixels above TRIM_ALPHA) and the share of that box the ink covers (0 to 1). */
function measureDrawing({ pixels, width, height }) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] <= TRIM_ALPHA) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) throw new Error('The image has no visible pixel');
  const box = { left, top, width: right - left + 1, height: bottom - top + 1 };
  let ink = 0;
  for (let y = box.top; y < box.top + box.height; y++) {
    for (let x = box.left; x < box.left + box.width; x++) ink += pixels[(y * width + x) * 4 + 3] / 255;
  }
  return { box, fill: ink / (box.width * box.height) };
}

/** The size of the drawing on the canvas: the same ink area for every logo, inside the maximum width and height. */
export function targetSize({ width, height }, fill, boost) {
  const aspect = width / height;
  const fitsIn = (candidate) => Math.min(1, MAX_HEIGHT / candidate, MAX_WIDTH / (candidate * aspect));
  const heightByInk = Math.sqrt(INK_AREA / fill / aspect);
  // The boost is applied after the maximum, so a logo already at the maximum can still be made smaller by it.
  const boosted = heightByInk * fitsIn(heightByInk) * boost;
  const finalHeight = boosted * fitsIn(boosted);
  return { width: Math.round(finalHeight * aspect), height: Math.round(finalHeight) };
}

async function findInput(inputDir, slug) {
  const names = await readdir(inputDir);
  const name = names.find((file) => file.slice(0, file.length - extname(file).length) === slug);
  if (!name) throw new Error(`No input file named ${slug}.png, .jpg, .jpeg or .webp in ${inputDir}`);
  return join(inputDir, name);
}

async function processLogo({ slug, mode, ink, boost }, inputDir, outputDir) {
  const source = await readPixels(await findInput(inputDir, slug));
  const image = mode === 'mask' ? maskBackground(source, ink) : source;
  const { box, fill } = measureDrawing(image);
  const size = targetSize(box, fill, boost);
  const drawing = await sharp(image.pixels, { raw: { width: image.width, height: image.height, channels: 4 } })
    .extract(box)
    .resize(size.width, size.height, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const left = Math.floor((CANVAS_WIDTH - size.width) / 2);
  const top = Math.floor((CANVAS_HEIGHT - size.height) / 2);
  const file = join(outputDir, `${slug}.webp`);
  await sharp({ create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: drawing, left, top }])
    .webp(WEBP_OPTIONS)
    .toFile(file);
  process.stdout.write(
    `${slug}: ${source.width}x${source.height} -> drawing ${box.width}x${box.height} (ink ${fill.toFixed(2)}) -> ${size.width}x${size.height} on ${CANVAS_WIDTH}x${CANVAS_HEIGHT}\n`,
  );
}

async function main() {
  const [inputArg, outputArg] = process.argv.slice(2);
  if (!inputArg) throw new Error('Usage: node scripts/process-client-logos.mjs <inputDir> [outputDir]');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const inputDir = resolve(inputArg);
  const outputDir = resolve(outputArg ?? join(root, 'public', 'clients'));
  await mkdir(outputDir, { recursive: true });
  for (const logo of LOGOS) await processLogo(logo, inputDir, outputDir);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
