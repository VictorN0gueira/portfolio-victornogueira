// @vitest-environment node
import type { ConfigEnv, Plugin, UserConfig } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CoverageV8Options } from 'vitest/node';
import { coverageConfigDefaults } from 'vitest/config';
import { SECURITY_HEADERS } from '../../config/securityHeaders.mjs';

// vite.config.ts decides what the build and the preview do. The pieces are tested one by one (injectCspMeta, the chunk
// function, the headers module); this checks they are wired in: a Pages build gets the policy meta tag plugin, the
// other builds and the dev server do not, and `vite preview` sends the real security headers.

type ConfigFactory = (env: ConfigEnv) => UserConfig;

async function loadConfig(pagesBuild: boolean): Promise<ConfigFactory> {
  vi.resetModules();
  if (pagesBuild) vi.stubEnv('GITHUB_PAGES', 'true');
  else vi.stubEnv('GITHUB_PAGES', '');
  return (await import('../../vite.config')).default as unknown as ConfigFactory;
}

const build: ConfigEnv = { command: 'build', mode: 'production' };
const serve: ConfigEnv = { command: 'serve', mode: 'development' };
const pluginNames = (config: UserConfig) => (config.plugins ?? []).flat().map((plugin) => (plugin as Plugin | undefined)?.name);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the Pages build', () => {
  it('adds the meta policy plugin and the repository base path, in a build', async () => {
    const config = (await loadConfig(true))(build);
    expect(pluginNames(config)).toContain('pages-csp-meta');
    expect(config.base).toBe('/portfolio-victornogueira/');
  });

  it('does not add it in the dev server, even with the Pages variable set', async () => {
    expect(pluginNames((await loadConfig(true))(serve))).not.toContain('pages-csp-meta');
  });

  it('transforms index.html through the policy plugin', async () => {
    const config = (await loadConfig(true))(build);
    const plugin = (config.plugins ?? []).flat().find((candidate) => (candidate as Plugin | undefined)?.name === 'pages-csp-meta') as Plugin;
    const transform = plugin.transformIndexHtml as (html: string) => string;
    expect(transform('<html><head><meta charset="UTF-8" /></head></html>')).toContain('http-equiv="Content-Security-Policy"');
  });
});

describe('the other builds', () => {
  it('has no meta policy plugin (the headers come from nginx) and serves from the root', async () => {
    const config = (await loadConfig(false))(build);
    expect(pluginNames(config)).not.toContain('pages-csp-meta');
    expect(config.base).toBe('/');
  });
});

describe('the preview', () => {
  it('sends the real security headers, so every Playwright run executes under the production policy', async () => {
    const config = (await loadConfig(false))(build);
    expect(config.preview?.headers).toEqual(SECURITY_HEADERS);
  });
});

describe('the bundle', () => {
  it('groups vendors with the function form of manualChunks', async () => {
    const output = (await loadConfig(false))(build).build?.rollupOptions?.output;
    const manualChunks = (Array.isArray(output) ? output[0] : output)?.manualChunks;
    expect(typeof manualChunks).toBe('function');
  });
});

describe('the coverage gate', () => {
  const METRICS = ['lines', 'functions', 'branches', 'statements'] as const;
  const MINIMUM_PERCENT = 80;
  const defaultExcludes = new Set<string>(coverageConfigDefaults.exclude);
  // The config uses the v8 provider, so its options are the v8 ones.
  const coverageOf = async () => (await loadConfig(false))(build).test?.coverage as CoverageV8Options | undefined;

  it('measures the whole of src and excludes only tests, types and the entry', async () => {
    const coverage = await coverageOf();
    expect(coverage?.include).toEqual(['src/**/*.{ts,tsx}']);
    // `**/*.d.ts` is a default of vitest 3 and a listed pattern of ours (vitest 5 dropped it from the defaults).
    const own = (coverage?.exclude ?? []).filter((pattern) => !defaultExcludes.has(pattern) && pattern !== '**/*.d.ts');
    expect(own).toEqual(['src/test/**', '**/*.test.*', 'src/main.tsx', 'e2e/**']);
    expect(coverage?.exclude).toContain('**/*.d.ts');
  });

  it.each(METRICS)('asks for %s of at least 80 percent on src as a whole', async (metric) => {
    const thresholds = (await coverageOf())?.thresholds as Record<string, unknown>;
    expect(thresholds[metric]).toBeGreaterThanOrEqual(MINIMUM_PERCENT);
  });

  it.each(['src/lib/**', 'src/hooks/**'])('keeps 80 percent on %s on its own as well', async (glob) => {
    const thresholds = (await coverageOf())?.thresholds as Record<string, Record<string, number>>;
    for (const metric of METRICS) expect(thresholds[glob][metric]).toBeGreaterThanOrEqual(MINIMUM_PERCENT);
  });
});
