// Builds the self-hosted project screenshots: it reads the original PNG or JPEG files from an input
// folder, writes optimized WebP files into the output folder and generates the manifest the site reads.
// It never fetches anything: the originals are put in the input folder by hand.
//
//   node scripts/process-project-images.mjs <input folder> <output folder> [--manifest=<file>] [--clean] [--blur-names]
//
// Input layout:   <input>/<project-slug>/<name>.png
// Output layout:  <output>/<project-slug>/<name>-<width>.webp  (800 and 1600 wide, never upscaled)
// A file named cover.* is the project card image. It also gets <name>-share.jpg (1200 by 630), the
// image shared on social networks, because scrapers do not all read WebP.
// The manifest (default src/data/projectImages.ts) lists the sizes of every image so that the pages
// can set width, height and srcset without any layout shift.
//
// Blur step: BEFORE resizing, the regions listed for a file in scripts/project-blur-regions.mjs (contact
// photos, phone numbers, the owner's name, e-mail and photo) are blurred with scripts/blur-regions.mjs.
// The originals with private data therefore only ever live in the input folder, never in the repo, and
// every output can be rebuilt from them. --blur-names also blurs the contact names (the blurNames switch,
// off by default).
//
// Covers: for the slugs in COVER_SOURCES, the named image is also written as <slug>/cover (card image
// and share image) unless the input folder has its own cover.* file.
//
// Without --clean the run only adds or replaces the images it was given and merges them into the existing
// manifest, so other projects keep their files. --clean first empties the output folder of every project
// that was given, and drops the manifest entries of that project.
//
// Typical call (the output folder is public/projects):
//   node scripts/process-project-images.mjs "<folder with the originals>" public/projects
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { applyBlurRegions } from './blur-regions.mjs';
import { BLUR_DEFAULTS, regionsFor } from './project-blur-regions.mjs';

const WIDTHS = [800, 1600];
const WEBP_QUALITY = 85;
const WEBP_EFFORT = 5;
// The featured projects get a higher quality: the interface text has to stay sharp.
const FEATURED_SLUGS = new Set(['hub081', 'dizpara']);
const FEATURED_WEBP_QUALITY = 94;
const FEATURED_WEBP_EFFORT = 6;
const COVER_SOURCES = { hub081: 'dashboards', dizpara: 'lista-de-leads' };
const SHARE_WIDTH = 1200;
const SHARE_HEIGHT = 630;
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
  if (positional.length !== 2) fail('usage: node scripts/process-project-images.mjs <input folder> <output folder> [--manifest=<file>] [--clean] [--blur-names]');
  const manifestFlag = flags.find((flag) => flag.startsWith('--manifest='));
  return {
    inputDir: resolve(positional[0]),
    outputDir: resolve(positional[1]),
    manifestFile: manifestFlag ? resolve(manifestFlag.slice('--manifest='.length)) : DEFAULT_MANIFEST,
    clean: flags.includes('--clean'),
    blurNames: flags.includes('--blur-names'),
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

async function writeWebp(bytes, hasOpaqueSurface, width, target, slug) {
  // Sharp drops all metadata (EXIF, ICC, text chunks) unless asked to keep it.
  const pipeline = openImage(bytes).resize({ width, withoutEnlargement: true });
  const flat = hasOpaqueSurface ? pipeline.removeAlpha() : pipeline;
  const featured = FEATURED_SLUGS.has(slug);
  return flat
    .webp({
      quality: featured ? FEATURED_WEBP_QUALITY : WEBP_QUALITY,
      effort: featured ? FEATURED_WEBP_EFFORT : WEBP_EFFORT,
      smartSubsample: true,
    })
    .toFile(target);
}

/** The colour of the top left pixel: the bars that complete a wide screenshot to the 1200 by 630 share size. */
async function cornerColour(bytes) {
  const { data } = await openImage(bytes).extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2] };
}

async function writeShare(bytes, target) {
  await openImage(bytes)
    .resize({ width: SHARE_WIDTH, height: SHARE_HEIGHT, fit: 'contain', background: await cornerColour(bytes) })
    .flatten({ background: SHARE_BACKGROUND })
    .jpeg({ quality: SHARE_QUALITY, mozjpeg: true })
    .toFile(target);
}

/** The original's bytes with its private regions blurred (the bytes themselves when it has none). */
async function blurredBytes(original, bytes, blurNames) {
  const regions = regionsFor(`${original.slug}/${original.file.split(/[\\/]/).pop()}`, { blurNames });
  return applyBlurRegions(bytes, regions, BLUR_DEFAULTS);
}

async function processOriginal(original, outputDir, blurNames) {
  const bytes = await blurredBytes(original, readOriginal(original), blurNames);
  const { width: naturalWidth, height: naturalHeight } = await openImage(bytes).metadata();
  if (!naturalWidth || !naturalHeight) fail(`${original.file}: could not read the dimensions`);
  const hasOpaqueSurface = await isOpaque(bytes);
  const folder = join(outputDir, original.slug);
  const sizes = [];
  for (const width of widthsFor(naturalWidth)) {
    const target = join(folder, `${original.name}-${width}.webp`);
    const info = await writeWebp(bytes, hasOpaqueSurface, width, target, original.slug);
    sizes.push({ width: info.width, height: info.height, bytes: info.size });
  }
  const hasShare = original.name === COVER_NAME;
  if (hasShare) await writeShare(bytes, join(folder, `${original.name}-share.jpg`));
  const widest = sizes[sizes.length - 1];
  return { key: `${original.slug}/${original.name}`, width: widest.width, height: widest.height, widths: sizes.map((size) => size.width), hasShare, sizes };
}

/** Adds a cover for each slug of COVER_SOURCES whose named image is present and that has no cover of its own. */
function withCovers(originals) {
  const covers = [];
  for (const [slug, name] of Object.entries(COVER_SOURCES)) {
    const hasOwnCover = originals.some((original) => original.slug === slug && original.name === COVER_NAME);
    const source = originals.find((original) => original.slug === slug && original.name === name);
    if (source && !hasOwnCover) covers.push({ slug, name: COVER_NAME, file: source.file });
  }
  return [...originals, ...covers];
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

const MANIFEST_LINE = /^\s*'([^']+)': \{ width: (\d+), height: (\d+), widths: \[([\d, ]+)\], hasShare: (true|false) \},$/;

/** The entries of the manifest already on disk (none when it does not exist yet). */
function readManifestEntries(manifestFile) {
  if (!existsSync(manifestFile)) return [];
  const entries = [];
  for (const line of readFileSync(manifestFile, 'utf8').split(/\r?\n/)) {
    const match = MANIFEST_LINE.exec(line);
    if (!match) continue;
    const widths = match[4].split(',').map((width) => Number(width.trim()));
    entries.push({ key: match[1], width: Number(match[2]), height: Number(match[3]), widths, hasShare: match[5] === 'true' });
  }
  return entries;
}

/** The existing entries that survive this run (all of them, or those of untouched projects with --clean), then the new ones. */
function mergeEntries(existing, fresh, slugs, clean) {
  const replaced = new Set(fresh.map((entry) => entry.key));
  const kept = existing.filter((entry) => !replaced.has(entry.key) && !(clean && slugs.has(entry.key.split('/')[0])));
  return [...kept, ...fresh];
}

async function main() {
  const { inputDir, outputDir, manifestFile, clean, blurNames } = parseArguments(process.argv.slice(2));
  if (!isFolder(inputDir)) fail(`input folder not found: ${inputDir}`);
  const originals = withCovers(listOriginals(inputDir));
  if (originals.length === 0) fail(`no images found in ${inputDir}`);
  const slugs = new Set(originals.map((original) => original.slug));
  for (const slug of slugs) {
    // --clean rebuilds a project folder from scratch so a renamed or removed original leaves no stale file behind.
    if (clean) rmSync(join(outputDir, slug), { recursive: true, force: true });
    mkdirSync(join(outputDir, slug), { recursive: true });
  }
  const fresh = [];
  for (const original of originals) {
    const entry = await processOriginal(original, outputDir, blurNames);
    fresh.push(entry);
    const kilobytes = entry.sizes.map((size) => `${size.width}w ${(size.bytes / 1024).toFixed(1)} KB`).join(', ');
    log(`${entry.key}: ${entry.width}x${entry.height}  ${kilobytes}`);
  }
  const entries = mergeEntries(readManifestEntries(manifestFile), fresh, slugs, clean);
  mkdirSync(dirname(manifestFile), { recursive: true });
  writeFileSync(manifestFile, renderManifest(entries), 'utf8');
  log(`manifest: ${manifestFile} (${entries.length} images, ${fresh.length} written now${blurNames ? ', contact names blurred' : ''})`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
