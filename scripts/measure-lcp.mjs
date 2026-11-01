/**
 * Measures the Largest Contentful Paint of a built page in Chromium, with a PerformanceObserver.
 *
 * Only a page on this machine is accepted, and requests to any other origin are aborted.
 *
 * Usage (not part of CI):
 *   npm run build
 *   npx vite preview --port 4173 --strictPort      # in another terminal
 *   npm run lcp                                    # http://localhost:4173/
 *   npm run lcp -- http://localhost:4173/ --runs=5 # another URL, more runs
 *
 * For every viewport (1440x900 desktop, 390x844 phone) it runs these profiles, `--runs` times each (default 3),
 * with a fresh browser context, and prints the median LCP, the element that was the candidate and the biggest
 * downloads that finished before it (wire size) in the first run:
 *   normal         no throttling
 *   cpu4x          CPU slowed 4x (CDP Emulation.setCPUThrottlingRate)
 *   slow4g         Slow 4G network (1.6 Mbps down, 750 Kbps up, 150 ms), cache disabled (CDP Network)
 *   cpu4x+slow4g   both
 *
 * The target is an LCP under 2500 ms. Notes: the sizes it prints are wire sizes (`vite preview` sends gzip; a host
 * with brotli would send a little less); the machine and the load of the day move the numbers by a few tens of
 * ms, which is why it reports the median of several runs. The cpu4x+slow4g profile is the harshest one.
 */
import { chromium } from 'playwright';
import { abortForeignOrigins, assertLocalPage } from './local-page.mjs';

const DEFAULT_URL = 'http://localhost:4173/';
const DEFAULT_RUNS = 3;
// How long to watch after the load event: late candidates (a font swap, the headline) still count as LCP.
const SETTLE_MS = 4000;
const LCP_TARGET_MS = 2500;
const CPU_SLOWDOWN = 4;
const SLOW_4G = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};
const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900, isMobile: false },
  { name: '390x844', width: 390, height: 844, isMobile: true },
];
const PROFILES = [
  { name: 'normal', cpu: 1, network: false },
  { name: 'cpu4x', cpu: CPU_SLOWDOWN, network: false },
  { name: 'slow4g', cpu: 1, network: true },
  { name: 'cpu4x+slow4g', cpu: CPU_SLOWDOWN, network: true },
];
const TOP_RESOURCES = 4;
// Printed per row: the biggest downloads that were done before the LCP, which is where the time of the LCP goes.

function parseArguments(argv) {
  const flags = argv.filter((argument) => argument.startsWith('--'));
  const url = argv.find((argument) => !argument.startsWith('--')) ?? DEFAULT_URL;
  const runsFlag = flags.find((flag) => flag.startsWith('--runs='));
  const runs = runsFlag ? Number(runsFlag.slice('--runs='.length)) : DEFAULT_RUNS;
  if (!Number.isInteger(runs) || runs < 1) throw new Error(`--runs needs a whole number of 1 or more, got "${runsFlag}"`);
  assertLocalPage(url);
  return { url, runs };
}

function median(numbers) {
  const sorted = [...numbers].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

// Runs in the page before any script of it: collects every LCP candidate, the last one is the LCP.
function observeLargestContentfulPaint() {
  window.__lcpEntries = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const element = entry.element;
      window.__lcpEntries.push({
        time: Math.round(entry.startTime),
        element: element ? element.tagName.toLowerCase() : null,
        text: element ? (element.textContent ?? '').trim().slice(0, 32) : null,
        resource: entry.url || null,
      });
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
}

function readResources() {
  return performance
    .getEntriesByType('resource')
    .map((entry) => ({
      name: entry.name.split('/').slice(-1)[0].slice(0, 40),
      type: entry.initiatorType,
      // What went over the wire (compressed), which is what the network profile throttles.
      sizeKb: Math.round((entry.transferSize || entry.encodedBodySize || 0) / 1024),
      endMs: Math.round(entry.responseEnd),
    }));
}

async function measureOnce(browser, url, viewport, profile) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
    deviceScaleFactor: viewport.isMobile ? 2 : 1,
  });
  try {
    // Nothing but the page's own origin: no third party host is reached and the lead webhooks never are.
    await context.route('**/*', abortForeignOrigins(url));
    const page = await context.newPage();
    const client = await context.newCDPSession(page);
    if (profile.cpu > 1) await client.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
    if (profile.network) {
      await client.send('Network.enable');
      await client.send('Network.setCacheDisabled', { cacheDisabled: true });
      await client.send('Network.emulateNetworkConditions', SLOW_4G);
    }
    await page.addInitScript(observeLargestContentfulPaint);
    await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
    await page.waitForTimeout(SETTLE_MS);
    const entries = await page.evaluate(() => window.__lcpEntries);
    const resources = await page.evaluate(readResources);
    if (entries.length === 0) throw new Error(`no LCP entry for ${url} (${viewport.name}, ${profile.name})`);
    return { lcp: entries[entries.length - 1], resources };
  } finally {
    await context.close();
  }
}

function describeCandidate(lcp) {
  const what = lcp.resource ? `${lcp.element} ${lcp.resource.split('/').slice(-1)[0]}` : `${lcp.element} "${lcp.text}"`;
  return what;
}

async function main() {
  const { url, runs } = parseArguments(process.argv.slice(2));
  const browser = await chromium.launch();
  const rows = [];

  try {
    for (const viewport of VIEWPORTS) {
      for (const profile of PROFILES) {
        const results = [];
        for (let run = 0; run < runs; run += 1) results.push(await measureOnce(browser, url, viewport, profile));
        const times = results.map((result) => result.lcp.time);
        const [first] = results;
        const biggestBefore = first.resources
          .filter((resource) => resource.endMs <= first.lcp.time)
          .sort((one, other) => other.sizeKb - one.sizeKb)
          .slice(0, TOP_RESOURCES);
        rows.push({
          viewport: viewport.name,
          profile: profile.name,
          median: median(times),
          runs: times.join(', '),
          candidate: describeCandidate(results[0].lcp),
          biggest: biggestBefore.map((resource) => `${resource.name} ${resource.sizeKb}kB done at ${resource.endMs}ms`).join(' | '),
        });
      }
    }
  } finally {
    await browser.close();
  }

  console.table(
    rows.map((row) => ({
      viewport: row.viewport,
      profile: row.profile,
      'LCP median (ms)': row.median,
      'runs (ms)': row.runs,
      verdict: row.median < LCP_TARGET_MS ? 'ok' : `OVER ${LCP_TARGET_MS}`,
      candidate: row.candidate,
    })),
  );
  for (const row of rows) console.log(`${row.viewport} ${row.profile}: biggest downloads before the LCP: ${row.biggest}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
