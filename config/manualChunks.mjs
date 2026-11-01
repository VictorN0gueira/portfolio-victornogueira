// How the build groups node_modules into chunks (used by vite.config.ts as build.rollupOptions.output.manualChunks).
//
// The old object form (`'react-vendor': ['react', 'react-dom', 'react-router-dom']`) only moved the entry modules of
// those packages: react-dom's internals, scheduler and react-router stayed in the main chunk, and half of motion did
// too. The function form below matches the package of every module path, so a package lands whole in one chunk.
//
// @radix-ui is deliberately NOT grouped: the dialog and the popover stay in the lazy chunks that use them.
//
// Seven chunks of the app's own code stay under 1 kB gzip (Heading, projectLabels, SpotlightCard, AnimatedText,
// ProjectsPage, ContactPage, FinalCta). They are lazy route and section entries, or small modules several of those
// import; they are not vendor splits, which is what the fix plan meant to remove (the nine one icon chunks are gone).
// Grouping the four shared modules in one chunk was measured and rejected: the entry reaches them through the eager
// home path, so the group (30.8 kB, 10.3 kB gzip) joined the modulepreloads and the critical path grew from 197.7 to
// 198.6 kB gzip. Merging the route entries would give up lazy routes. So the A.1 acceptance reads "no vendor chunk
// under 1 kB gzip", and G.1 to G.2 own the real reduction of the critical path.

const REACT_PACKAGES = new Set([
  'react',
  'react-dom',
  'scheduler',
  'react-router',
  'react-router-dom',
  // react-router imports these two: left outside, react-vendor would import the main chunk, which imports react-vendor.
  'cookie',
  'set-cookie-parser',
]);
const MOTION_PACKAGES = new Set(['motion', 'framer-motion', 'motion-dom', 'motion-utils']);
const ICON_PACKAGES = new Set(['lucide-react']);

/** The package a module path belongs to (the last node_modules segment), or null for the app's own files. */
export function packageOf(id) {
  const normalized = id.replace(/\\/g, '/');
  const marker = '/node_modules/';
  const start = normalized.lastIndexOf(marker);
  if (start === -1) return null;
  const [first, second] = normalized.slice(start + marker.length).split('/');
  return first.startsWith('@') ? `${first}/${second}` : first;
}

/** The chunk a module goes to, or undefined to let Rollup decide (the app's own code and everything not listed). */
export function manualChunks(id) {
  const name = packageOf(id);
  if (name === null) return undefined;
  if (REACT_PACKAGES.has(name)) return 'react-vendor';
  if (MOTION_PACKAGES.has(name)) return 'motion-vendor';
  // The icons several lazy chunks share would otherwise be one request of a few hundred bytes each.
  if (ICON_PACKAGES.has(name)) return 'icons';
  return undefined;
}
