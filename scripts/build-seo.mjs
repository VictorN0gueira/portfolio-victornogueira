// The step after `vite build`: it writes the head of every public route into its own HTML file, so a crawler or a link
// preview that runs no JavaScript reads the title, description, canonical, share tags and structured data of that URL.
//
//   node scripts/build-seo.mjs [--outDir dist]
//
// It writes <outDir>/<route>/index.html for each route of src/seo/routeMeta.ts (the home overwrites <outDir>/index.html),
// <outDir>/404.html (out of the index) and <outDir>/sitemap.xml. The body of each file is the page Vite built: the app
// still renders in the browser, and SEO.tsx replaces the marked head tags on mount. The logic lives in src/seo (pure and
// tested); this file only loads it, reads the template and writes files. It adds nothing to the bundle of the site.
//
// The GitHub Pages build (GITHUB_PAGES=true) serves under another base path and has no server to answer a 404: it is skipped.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT_DIR = 'dist';
const TEMPLATE_FILE = 'index.html';
const NOT_FOUND_FILE = '404.html';
const SITEMAP_FILE = 'sitemap.xml';

function parseOutDir(args) {
  const at = args.indexOf('--outDir');
  if (at === -1) return DEFAULT_OUT_DIR;
  const value = args[at + 1];
  if (!value || value.startsWith('--')) throw new Error('--outDir needs a folder');
  return value;
}

/** A Vite server with no HMR, no watcher and no config file, only to load the TypeScript of src/seo the way the app sees it. */
async function startLoader() {
  return createServer({
    root: ROOT,
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, ws: false, watch: null },
  });
}

async function loadSeoModules(loader) {
  const [routeMeta, headHtml, structuredData, sitemap] = await Promise.all([
    loader.ssrLoadModule('/src/seo/routeMeta.ts'),
    loader.ssrLoadModule('/src/seo/headHtml.ts'),
    loader.ssrLoadModule('/src/seo/structuredData.ts'),
    loader.ssrLoadModule('/src/seo/sitemap.ts'),
  ]);
  return { routeMeta, headHtml, structuredData, sitemap };
}

/** The file of a route: the home is the template itself, any other route has its own folder. */
const fileOf = (outDir, path) => (path === '/' ? join(outDir, TEMPLATE_FILE) : join(outDir, path, TEMPLATE_FILE));

async function writeFileIn(file, text) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, text, 'utf8');
}

/** Builds every file in memory first, so a failing route leaves the folder as Vite built it. Returns [{ file, text }]. */
function renderFiles({ routeMeta, headHtml, structuredData, sitemap }, template, outDir) {
  const { ROUTE_METAS } = routeMeta;
  const { NOT_FOUND_META, applyHeadToTemplate, applyNoscriptToTemplate, renderNoscript, renderSeoHead, topicOf } = headHtml;
  const links = ROUTE_METAS.filter((meta) => meta.isIndexable).map((meta) => ({ name: topicOf(meta), path: meta.path }));
  const linksExcept = (path) => links.filter((link) => link.path !== path);

  const page = (meta, jsonLd) => {
    const withHead = applyHeadToTemplate(template, renderSeoHead(meta, jsonLd));
    return applyNoscriptToTemplate(withHead, renderNoscript(meta, linksExcept(meta.path)));
  };

  const routeFiles = ROUTE_METAS.map((meta) => {
    try {
      return { file: fileOf(outDir, meta.path), text: page(meta, structuredData.structuredDataFor(meta)) };
    } catch (error) {
      throw new Error(`could not render ${meta.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  return [
    ...routeFiles,
    { file: join(outDir, NOT_FOUND_FILE), text: page(NOT_FOUND_META, []) },
    { file: join(outDir, SITEMAP_FILE), text: sitemap.renderSitemap(ROUTE_METAS) },
  ];
}

/** Runs the step against `outDirName` (relative to the repo root). Returns the files it wrote, or null when it is skipped. */
export async function buildSeo(outDirName = DEFAULT_OUT_DIR) {
  if (process.env.GITHUB_PAGES === 'true') {
    process.stdout.write('build-seo: skipped (GITHUB_PAGES build)\n');
    return null;
  }

  const outDir = resolve(ROOT, outDirName);
  const template = await readFile(join(outDir, TEMPLATE_FILE), 'utf8').catch(() => {
    throw new Error(`${join(outDir, TEMPLATE_FILE)} does not exist: run vite build first`);
  });

  const loader = await startLoader();
  try {
    const files = renderFiles(await loadSeoModules(loader), template, outDir);
    for (const { file, text } of files) await writeFileIn(file, text);
    process.stdout.write(`build-seo: ${files.length} files in ${outDirName} (routes, ${NOT_FOUND_FILE}, ${SITEMAP_FILE})\n`);
    return files.map(({ file }) => file);
  } finally {
    await loader.close();
  }
}

const isEntryPoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isEntryPoint) {
  try {
    await buildSeo(parseOutDir(process.argv.slice(2)));
  } catch (error) {
    process.stderr.write(`build-seo: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
