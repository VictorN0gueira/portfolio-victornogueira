// Turns the photo of the founder into the files of public/founder: AVIF and WebP, 480 and 960 pixels wide.
//
// Usage: npm run founder-photo
//
// The source is scripts/assets/victor-photo.jpg (982x1024), which is not part of the build. Nothing is fetched. The
// widths are narrower than the source on purpose: the script never enlarges a photo. It applies the EXIF orientation
// (rotate() with no argument), so a photo shot sideways is not written sideways. The output is read by
// src/sections/about/founderPhotoSource.ts, which lists the same widths.

import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'scripts/assets/victor-photo.jpg';
const OUTPUT_DIR = 'public/founder';
const WIDTHS = [480, 960];
const ENCODERS = {
  avif: (image) => image.avif({ quality: 55, effort: 6 }),
  webp: (image) => image.webp({ quality: 78, effort: 6 }),
};

/** The files to write, one per width and format. Pure. */
export function founderPhotoPlan() {
  return WIDTHS.flatMap((width) =>
    Object.keys(ENCODERS).map((format) => ({ width, format, file: `${OUTPUT_DIR}/victor-${width}.${format}` })),
  );
}

async function main() {
  mkdirSync(resolve(ROOT, OUTPUT_DIR), { recursive: true });
  for (const { width, format, file } of founderPhotoPlan()) {
    const image = sharp(resolve(ROOT, SOURCE)).rotate().resize({ width, withoutEnlargement: true });
    const info = await ENCODERS[format](image).toFile(resolve(ROOT, file));
    process.stdout.write(`${file}: ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB\n`);
  }
}

const isEntryPoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isEntryPoint) {
  main().catch((error) => {
    process.stderr.write(`process-founder-photo: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
