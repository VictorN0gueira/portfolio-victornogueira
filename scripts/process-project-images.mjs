// Builds the self-hosted project screenshots: it reads the original PNG or JPEG files from an input
// folder, writes optimized WebP files into the output folder and generates the manifest the site reads.
// It never fetches anything: the originals are put in the input folder by hand.
//
//   node scripts/process-project-images.mjs <input folder> <output folder> [--manifest=<file>]
//
// Input layout:   <input>/<project-slug>/<name>.png
// Output layout:  <output>/<project-slug>/<name>-<width>.webp  (800 and 1600 wide, never upscaled)
// A file named cover.* is the project card image. It also gets <name>-share.jpg (1200 wide), the
// image shared on social networks, because scrapers do not all read WebP.
// The manifest (default src/data/projectImages.ts) lists the sizes of every image so that the pages
// can set width, height and srcset without any layout shift.
//
// Typical call (the output folder is public/projects):
//   node scripts/process-project-images.mjs "<folder with the originals>" public/projects
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WIDTHS = [800, 1600];
const WEBP_QUALITY = 85;
const WEBP_EFFORT = 5;
const SHARE_WIDTH = 1200;
const SHARE_QUALITY = 80;
const COVER_NAME = 'cover';
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const SHARE_BACKGROUND = '#0a0a0a';
const KEBAB_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST = join(repoRoot, 'src', 'data', 'projectImages.ts');

function fail(message) {
  process.stderr.write(`process-project-images: ${message}\n`);
  process.exit(1);
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

function parseArguments(argv) {
  const flags = argv.filter((argument) => argument.startsWith('--'));
  const positional = argv.filter((argument) => !argument.startsWith('--'));
  if (positional.length !== 2) fail('usage: node scripts/process-project-images.mjs <input folder> <output folder> [--manifest=<file>]');
  const manifestFlag = flags.find((flag) => flag.startsWith('--manifest='));
  return {
    inputDir: resolve(positional[0]),
    outputDir: resolve(positional[1]),
    manifestFile: manifestFlag ? resolve(manifestFlag.slice('--manifest='.length)) : DEFAULT_MANIFEST,
  };
}

function isFolder(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

/** True when the file starts with the PNG or the JPEG signature: the extension alone is never trusted. */
function hasImageSignature(bytes) {
  return bytes.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC) || bytes.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC);
}

/** The originals found in the input folder, as { slug, name, file }, in a stable order. */
function listOriginals(inputDir) {
  const originals = [];
  for (const slug of readdirSync(inputDir).sort()) {
    const folder = join(inputDir, slug);
    if (!isFolder(folder)) fail(`${folder}: expected a folder per project, found a file`);
    if (!KEBAB_NAME.test(slug)) fail(`${slug}: the project folder must be lower case kebab-case ASCII`);
    for (const fileName of readdirSync(folder).sort()) {
      const extension = extname(fileName).toLowerCase();
      const name = fileName.slice(0, fileName.length - extension.length);
      if (!['.png', '.jpg', '.jpeg'].includes(extension)) fail(`${slug}/${fileName}: only PNG and JPEG originals are accepted`);
      if (!KEBAB_NAME.test(name)) fail(`${slug}/${fileName}: the name must be lower case kebab-case ASCII`);
      originals.push({ slug, name, file: join(folder, fileName) });
    }
  }
  return originals;
}

function readOriginal(original) {
  const { size } = statSync(original.file);
  if (size === 0 || size > MAX_INPUT_BYTES) fail(`${original.file}: unexpected size ${size} bytes`);
  const bytes = readFileSync(original.file);
  if (!hasImageSignature(bytes)) fail(`${original.file}: not a real PNG or JPEG (signature check failed)`);
  return bytes;
}

/** The widths to write for an image: the wanted ones that fit, or the natural width when it is narrower than all. */
function widthsFor(naturalWidth) {
  const fitting = WIDTHS.filter((width) => width <= naturalWidth);
  return fitting.length > 0 ? fitting : [naturalWidth];
}

function openImage(bytes) {
  return sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' });
}

async function isOpaque(bytes) {
  const { hasAlpha } = await openImage(bytes).metadata();
  return hasAlpha ? (await openImage(bytes).stats()).isOpaque : true;
}

async function writeWebp(bytes, hasOpaqueSurface, width, target) {
  // Sharp drops all metadata (EXIF, ICC, text chunks) unless asked to keep it.
  const pipeline = openImage(bytes).resize({ width, withoutEnlargement: true });
  const flat = hasOpaqueSurface ? pipeline.removeAlpha() : pipeline;
  return flat.webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT, smartSubsample: true }).toFile(target);
}

async function writeShare(bytes, target) {
  await openImage(bytes)
    .resize({ width: SHARE_WIDTH, withoutEnlargement: true })
    .flatten({ background: SHARE_BACKGROUND })
    .jpeg({ quality: SHARE_QUALITY, mozjpeg: true })
    .toFile(target);
}

async function processOriginal(original, outputDir) {
  const bytes = readOriginal(original);
  const { width: naturalWidth, height: naturalHeight } = await openImage(bytes).metadata();
  if (!naturalWidth || !naturalHeight) fail(`${original.file}: could not read the dimensions`);
  const hasOpaqueSurface = await isOpaque(bytes);
  const folder = join(outputDir, original.slug);
  const widths = widthsFor(naturalWidth);
  const sizes = [];
  for (const width of widths) {
    const target = join(folder, `${original.name}-${width}.webp`);
    const info = await writeWebp(bytes, hasOpaqueSurface, width, target);
    sizes.push({ width: info.width, height: info.height, bytes: info.size });
  }
  const hasShare = original.name === COVER_NAME;
  if (hasShare) await writeShare(bytes, join(folder, `${original.name}-share.jpg`));
  const widest = sizes[sizes.length - 1];
  return { key: `${original.slug}/${original.name}`, width: widest.width, height: widest.height, widths: sizes.map((size) => size.width), hasShare, sizes };
}

function renderManifest(entries) {
  const lines = entries
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => `  '${entry.key}': { width: ${entry.width}, height: ${entry.height}, widths: [${entry.widths.join(', ')}], hasShare: ${entry.hasShare} },`);
  return [
    '// Generated by scripts/process-project-images.mjs. Do not edit by hand: run the script again.',
    '// width and height are the pixel size of the widest file, so the aspect ratio is known before the image loads.',
    '',
    'export interface ProjectImageEntry {',
    '  readonly width: number;',
    '  readonly height: number;',
    '  readonly widths: readonly number[];',
    '  readonly hasShare: boolean;',
    '}',
    '',
    'export const projectImageManifest: Readonly<Record<string, ProjectImageEntry>> = {',
    ...lines,
    '};',
    '',
  ].join('\n');
}

async function main() {
  const { inputDir, outputDir, manifestFile } = parseArguments(process.argv.slice(2));
  if (!isFolder(inputDir)) fail(`input folder not found: ${inputDir}`);
  const originals = listOriginals(inputDir);
  if (originals.length === 0) fail(`no images found in ${inputDir}`);
  // A project folder is rebuilt from scratch so a renamed or removed original leaves no stale file behind.
  for (const slug of new Set(originals.map((original) => original.slug))) {
    rmSync(join(outputDir, slug), { recursive: true, force: true });
    mkdirSync(join(outputDir, slug), { recursive: true });
  }
  const entries = [];
  for (const original of originals) {
    const entry = await processOriginal(original, outputDir);
    entries.push(entry);
    const kilobytes = entry.sizes.map((size) => `${size.width}w ${(size.bytes / 1024).toFixed(1)} KB`).join(', ');
    log(`${entry.key}: ${entry.width}x${entry.height}  ${kilobytes}`);
  }
  mkdirSync(dirname(manifestFile), { recursive: true });
  writeFileSync(manifestFile, renderManifest(entries), 'utf8');
  log(`manifest: ${manifestFile} (${entries.length} images)`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
