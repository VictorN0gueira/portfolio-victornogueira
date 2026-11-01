// Builds the self-hosted project screenshots: it reads the original PNG or JPEG files from an input
// folder, writes optimized WebP files into the output folder and generates the manifest the site reads.
// It never fetches anything: the originals are put in the input folder by hand and never enter the repo.
//
//   node scripts/process-project-images.mjs <input folder> <output folder> [--manifest=<file>] [--clean [--force-clean]] [--keep-names] [--preview=<folder>]
//
// Input layout:   <input>/<project-slug>/<name>.png   (lower case kebab-case, .png .jpg .jpeg in any case)
// Output layout:  <output>/<project-slug>/<name>-<width>.webp  (800 and 1600 wide, never upscaled)
// The image shared on social networks is a 1200 by 630 JPEG, <name>-share.jpg, made for one image per project:
// the one called cover, or the one named for that project in COVER_SOURCES (it then has no copy of its own).
// The manifest (default src/data/projectImages.ts) lists the sizes of every image so that the pages
// can set width, height and srcset without any layout shift.
//
// Private data, step by step, BEFORE resizing:
//   1. every original must be listed in scripts/project-blur-regions.mjs, with regions to blur or as judged
//      clean; anything else stops the run (fail closed). The listed regions (contact photos, phone numbers,
//      names of leads, the owner's name, e-mail and photo, credential looking names, private links) are blurred
//      with scripts/blur-regions.mjs. Names of leads are blurred unless --keep-names is given.
//   2. scripts/project-crops.mjs may then cut the blurred image (a crop only cuts).
// --preview=<folder> writes each original back with its regions outlined in red and exits, to check the numbers.
//
// Safety: nothing in the output folder is touched until every image has been processed into a staging folder.
// Without --clean the run only adds or replaces the images it was given and merges them into the existing
// manifest. --clean also removes, for the projects present in the input only, the files and manifest entries
// that the run did not write; it refuses to drop an image that src/data/projects.ts still shows unless
// --force-clean is given. The publish step (scripts/project-images-publish.mjs) is undoable: the manifest is
// written to a temporary file first, replaced and removed files are kept in a backup until everything worked,
// the manifest is renamed last, and a failure puts every file back. The input folder may not overlap the output folder or live inside the repo.
//
// Typical call (the output folder is public/projects):
//   node scripts/process-project-images.mjs "<folder with the originals>" public/projects
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { applyBlurRegions } from './blur-regions.mjs';
import { cropsFor } from './project-crops.mjs';
import { BLUR_DEFAULTS, blurKey, blurProblem, regionsFor } from './project-blur-regions.mjs';
import { mergeEntries, readManifestEntries, renderManifest } from './project-images-manifest.mjs';
import { backupDirOf, backupLeftoverMessage, publishRun } from './project-images-publish.mjs';
import { UsageScanError, findUsedKeysInFile } from './project-images-usage.mjs';
import { drawPreview } from './project-images-preview.mjs';

export const WIDTHS = [800, 1600];
const WEBP_QUALITY = 85;
const WEBP_EFFORT = 5;
// The featured projects get a higher quality: the interface text has to stay sharp.
const FEATURED_SLUGS = new Set(['hub081', 'dizpara']);
const FEATURED_WEBP_QUALITY = 94;
const FEATURED_WEBP_EFFORT = 6;
/** The image of a project that is also shared on social networks, when it is not the one named "cover". */
export const COVER_SOURCES = Object.freeze({ hub081: 'dashboards', dizpara: 'lista-de-leads', 'ai-playlist-maker': 'tela-email' });
const DEFAULT_COVER_NAME = 'cover';
const SHARE_WIDTH = 1200;
const SHARE_HEIGHT = 630;
const SHARE_QUALITY = 80;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const SHARE_BACKGROUND = '#0a0a0a';
const KEBAB_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'];
const JUNK_FILES = new Set(['thumbs.db', 'desktop.ini', '.ds_store']);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const STAGING_FOLDER = '.staging';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST = join(repoRoot, 'src', 'data', 'projectImages.ts');
const PROJECTS_FILE = join(repoRoot, 'src', 'data', 'projects.ts');

export class PipelineError extends Error {}

function fail(message) {
  throw new PipelineError(message);
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

/** The name of the image of a project that also gets the share JPEG. */
export function shareNameFor(slug) {
  return COVER_SOURCES[slug] ?? DEFAULT_COVER_NAME;
}

export function parseArguments(argv) {
  const flags = argv.filter((argument) => argument.startsWith('--'));
  const positional = argv.filter((argument) => !argument.startsWith('--'));
  const known = ['--clean', '--force-clean', '--keep-names'];
  const unknown = flags.filter((flag) => !known.includes(flag) && !flag.startsWith('--manifest=') && !flag.startsWith('--preview='));
  if (unknown.length > 0) fail(`unknown option ${unknown.join(', ')}`);
  if (positional.length !== 2) {
    fail('usage: node scripts/process-project-images.mjs <input folder> <output folder> [--manifest=<file>] [--clean [--force-clean]] [--keep-names] [--preview=<folder>]');
  }
  const valueOf = (name) => flags.find((flag) => flag.startsWith(`${name}=`))?.slice(name.length + 1);
  const manifest = valueOf('--manifest');
  const preview = valueOf('--preview');
  return {
    inputDir: resolve(positional[0]),
    outputDir: resolve(positional[1]),
    manifestFile: manifest ? resolve(manifest) : DEFAULT_MANIFEST,
    previewDir: preview ? resolve(preview) : null,
    clean: flags.includes('--clean'),
    forceClean: flags.includes('--force-clean'),
    keepNames: flags.includes('--keep-names'),
  };
}

function isInside(parent, child) {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

/** Refuses folders that overlap (the originals would be deleted or published) or an input inside the repo. */
export function checkFolders(inputDir, outputDir) {
  if (isInside(inputDir, outputDir) || isInside(outputDir, inputDir)) {
    fail(`the input folder (${inputDir}) and the output folder (${outputDir}) overlap`);
  }
  for (const published of ['public', 'src']) {
    if (isInside(join(repoRoot, published), inputDir)) fail(`the originals must live outside the repo, not in ${published}/ (${inputDir})`);
  }
}

function isFolder(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

/** True when the file starts with the PNG or the JPEG signature: the extension alone is never trusted. */
export function hasImageSignature(bytes) {
  return bytes.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC) || bytes.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC);
}

function isJunk(fileName) {
  return fileName.startsWith('.') || JUNK_FILES.has(fileName.toLowerCase());
}

/** The originals found in the input folder, as { slug, name, file }, in a stable order. */
export function listOriginals(inputDir) {
  const originals = [];
  for (const slug of readdirSync(inputDir).sort()) {
    if (isJunk(slug)) continue;
    const folder = join(inputDir, slug);
    if (!isFolder(folder)) fail(`${folder}: expected a folder per project, found a file`);
    if (!KEBAB_NAME.test(slug)) fail(`${slug}: the project folder must be lower case kebab-case ASCII`);
    for (const fileName of readdirSync(folder).sort()) {
      if (isJunk(fileName)) continue;
      const extension = extname(fileName).toLowerCase();
      const name = fileName.slice(0, fileName.length - extension.length);
      if (!IMAGE_EXTENSIONS.includes(extension)) fail(`${slug}/${fileName}: only PNG and JPEG originals are accepted`);
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
export function widthsFor(naturalWidth) {
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
    .webp({ quality: featured ? FEATURED_WEBP_QUALITY : WEBP_QUALITY, effort: featured ? FEATURED_WEBP_EFFORT : WEBP_EFFORT, smartSubsample: true })
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

/** The images made from one original: its blurred bytes, or one cut out of them per crop of project-crops.mjs. */
async function imagesOfOriginal(original, keepNames) {
  const source = readOriginal(original);
  const { width, height } = await openImage(source).metadata();
  if (!width || !height) fail(`${original.file}: could not read the dimensions`);
  const key = blurKey(original.slug, basename(original.file));
  const problem = blurProblem(key, { width, height });
  if (problem) fail(problem);
  const blurred = await applyBlurRegions(source, regionsFor(key, { keepNames }), BLUR_DEFAULTS);
  const crops = cropsFor(key, { width, height });
  if (!crops) return [{ name: original.name, bytes: blurred }];
  const cut = [];
  for (const { name, ...rect } of crops) cut.push({ name, bytes: await openImage(blurred).extract(rect).png().toBuffer() });
  return cut;
}

async function processImage(slug, image, stagingFolder) {
  const { name, bytes } = image;
  const { width: naturalWidth, height: naturalHeight } = await openImage(bytes).metadata();
  if (!naturalWidth || !naturalHeight) fail(`${slug}/${name}: could not read the dimensions`);
  const hasOpaqueSurface = await isOpaque(bytes);
  const sizes = [];
  for (const width of widthsFor(naturalWidth)) {
    const info = await writeWebp(bytes, hasOpaqueSurface, width, join(stagingFolder, `${name}-${width}.webp`), slug);
    sizes.push({ width: info.width, height: info.height, bytes: info.size });
  }
  const hasShare = name === shareNameFor(slug);
  if (hasShare) await writeShare(bytes, join(stagingFolder, `${name}-share.jpg`));
  const widest = sizes[sizes.length - 1];
  return { key: `${slug}/${name}`, width: widest.width, height: widest.height, widths: sizes.map((size) => size.width), hasShare, sizes };
}

async function writePreviews(originals, previewDir, keepNames) {
  mkdirSync(previewDir, { recursive: true });
  for (const original of originals) {
    const key = blurKey(original.slug, basename(original.file));
    const outline = await drawPreview(readOriginal(original), regionsFor(key, { keepNames }));
    await sharp(outline).toFile(join(previewDir, `${original.slug}-${original.name}-regions.png`));
    log(`preview: ${original.slug}/${original.name}`);
  }
}

/** A clean run must not drop an image that src/data/projects.ts still shows: the next build would throw. */
function checkDroppedKeysAreUnused(before, after, projectsFile) {
  const kept = new Set(after.map((entry) => entry.key));
  const dropped = before.map((entry) => entry.key).filter((key) => !kept.has(key));
  if (dropped.length === 0) return;
  let stillUsed;
  try {
    stillUsed = findUsedKeysInFile(projectsFile, dropped);
  } catch (error) {
    if (!(error instanceof UsageScanError)) throw error;
    // Fail closed: when the usage cannot be told, nothing is dropped.
    fail(`--clean cannot tell which images ${basename(projectsFile)} uses (${error.message}); add --force-clean to drop them anyway`);
  }
  if (stillUsed.length > 0) fail(`--clean would drop ${stillUsed.join(', ')}, which ${basename(projectsFile)} still uses (add --force-clean to do it anyway)`);
}

/** Runs the whole pipeline. Returns { entries, removed }; throws PipelineError on any refusal. */
export async function run(options) {
  const { inputDir, outputDir, manifestFile, previewDir, clean, keepNames, forceClean = false, projectsFile = PROJECTS_FILE } = options;
  if (!isFolder(inputDir)) fail(`input folder not found: ${inputDir}`);
  checkFolders(inputDir, outputDir);
  const originals = listOriginals(inputDir);
  if (originals.length === 0) fail(`no images found in ${inputDir}`);
  if (previewDir) {
    await writePreviews(originals, previewDir, keepNames);
    return { entries: [], removed: [] };
  }
  // A backup left by a run that could not undo itself is the only copy of the old files: never start over it.
  if (existsSync(backupDirOf(outputDir))) fail(backupLeftoverMessage(backupDirOf(outputDir)));
  const slugs = new Set(originals.map((original) => original.slug));
  // Read first: a manifest that cannot be read stops the run before any image is processed.
  const existingEntries = readManifestEntries(manifestFile);
  const stagingDir = join(outputDir, STAGING_FOLDER);
  rmSync(stagingDir, { recursive: true, force: true });
  try {
    const fresh = [];
    for (const original of originals) {
      mkdirSync(join(stagingDir, original.slug), { recursive: true });
      for (const image of await imagesOfOriginal(original, keepNames)) {
        const entry = await processImage(original.slug, image, join(stagingDir, original.slug));
        fresh.push(entry);
        log(`${entry.key}: ${entry.width}x${entry.height}  ${entry.sizes.map((size) => `${size.width}w ${(size.bytes / 1024).toFixed(1)} KB`).join(', ')}`);
      }
    }
    const entries = mergeEntries(existingEntries, fresh, clean ? slugs : new Set());
    if (clean && !forceClean) checkDroppedKeysAreUnused(existingEntries, entries, projectsFile);
    const removed = publishRun({ stagingDir, outputDir, slugs, clean, manifestFile, manifestText: renderManifest(entries) });
    return { entries, removed, written: fresh.length };
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const { entries, removed = [], written = 0 } = await run(options);
  if (options.previewDir) return;
  if (removed.length > 0) log(`removed: ${removed.join(', ')}`);
  log(`manifest: ${options.manifestFile} (${entries.length} images, ${written} written now${options.keepNames ? '' : ', names of leads blurred'})`);
}

const isEntryPoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isEntryPoint) {
  main().catch((error) => {
    process.stderr.write(`process-project-images: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
