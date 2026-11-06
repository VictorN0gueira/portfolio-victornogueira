// @ts-check
// scripts/news-sync.mjs
// Fetches articles from Dev.to + TabNews and upserts them into the Supabase `articles` table.
//
// Usage (GitHub Actions):
//   node scripts/news-sync.mjs
//   SUPABASE_URL=https://db.vnone.com.br NEWS_WRITER_TOKEN=<jwt> node scripts/news-sync.mjs

const DELETE_OLDER_THAN_DAYS = 30;
const CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes tolerance for future dates

/**
 * @typedef {{
 *   url: string;
 *   title: string;
 *   summary: string;
 *   image: string;
 *   published_at: string;
 *   source: string;
 *   language: 'pt' | 'en';
 * }} ArticleRow
 */

// --- Validation (mirrors the site's newsSanitize constraints) ---

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);
const MAX_URL_LENGTH = 2048;
const MAX_TITLE_LENGTH = 300;

/** Lowercase-scheme absolute http(s) URL with no credentials, within the byte and char limits, or undefined. */
function safeUrl(value) {
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) return undefined;
  try {
    const u = new URL(value.trim());
    if (!SAFE_PROTOCOLS.has(u.protocol)) return undefined;
    if (u.username !== '' || u.password !== '') return undefined;
    // normalize scheme to lowercase (HTTPS:// → https://)
    return u.href;
  } catch {
    return undefined;
  }
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function isValidDate(value) {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(value.includes('T') || value.includes(' ') ? value.replace(' ', 'T') : value);
  return !Number.isNaN(d.getTime());
}

/**
 * Returns a validated ArticleRow, or null if the row fails validation.
 * @param {unknown} row
 * @param {Date} now
 * @returns {ArticleRow | null}
 */
function validateRow(row, now) {
  if (typeof row !== 'object' || row === null) return null;
  const r = /** @type {Record<string, unknown>} */ (row);

  const url = safeUrl(r.url);
  if (!url) return null;

  const title = typeof r.title === 'string' ? r.title.trim() : '';
  if (title === '' || title.length > MAX_TITLE_LENGTH) return null;

  const published_at = typeof r.published_at === 'string' ? r.published_at : '';
  if (!isValidDate(published_at)) return null;

  // Reject dates more than 5 minutes in the future
  const pub = new Date(published_at.includes('T') ? published_at : published_at.replace(' ', 'T'));
  if (pub.getTime() - now.getTime() > CLOCK_SKEW_MS) return null;

  const source = typeof r.source === 'string' ? r.source.trim() : '';
  if (source === '') return null;

  const language = r.language === 'pt' ? 'pt' : 'en';

  return {
    url,
    title,
    summary: typeof r.summary === 'string' ? r.summary.slice(0, 600) : '',
    image: typeof r.image === 'string' ? r.image : '',
    published_at,
    source,
    language,
  };
}

/**
 * Syncs news articles from public sources to Supabase.
 *
 * @param {{
 *   fetchSources: () => Promise<ArticleRow[]>;
 *   upsert: (rows: ArticleRow[]) => Promise<void>;
 *   deleteOlderThan: (days: number) => Promise<number>;
 *   now?: () => Date;
 * }} deps
 * @returns {Promise<{ fetched: number; kept: number; removed: number }>}
 */
export async function syncNews({ fetchSources, upsert, deleteOlderThan, now = () => new Date() }) {
  const raw = await fetchSources();

  const currentTime = now();
  const seen = new Set();
  const valid = raw
    .map((r) => validateRow(r, currentTime))
    .filter((r) => r !== null)
    .filter((r) => !seen.has(r.url) && seen.add(r.url));

  if (valid.length === 0) {
    throw new Error(
      raw.length === 0
        ? 'fetchSources returned no articles'
        : 'All fetched articles failed validation — refusing to delete existing data',
    );
  }

  let kept = 0;
  for (const row of valid) {
    try {
      await upsert([row]);
      kept++;
    } catch {
      // one article failing does not stop the rest
    }
  }

  if (kept === 0) {
    return { fetched: raw.length, kept: 0, removed: 0 };
  }

  const removed = await deleteOlderThan(DELETE_OLDER_THAN_DAYS);
  return { fetched: raw.length, kept, removed };
}

// --- CLI fetch sources ---

const FEED_TIMEOUT_MS = 15_000;
const DEVTO_EN_TAGS = ['ai', 'machinelearning', 'llm', 'n8n', 'automation'];
const DEVTO_PT_TAGS = ['brdev', 'ia', 'inteligencia-artificial', 'automacao'];
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
  'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&q=80',
  'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&q=80',
];
const TABNEWS_KEYWORDS = [
  'ia',
  'llm',
  'gpt',
  'claude',
  'gemini',
  'openai',
  'automação',
  'automacao',
  'n8n',
  'agente',
  'agent',
  'machine learning',
  'chatgpt',
  'anthropic',
  'mistral',
  'llama',
  'rag',
  'neural',
  'deep learning',
  'ai ',
  ' ai',
];

function pickPlaceholder(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PLACEHOLDER_IMAGES[Math.abs(hash) % PLACEHOLDER_IMAGES.length];
}

/** @returns {Promise<ArticleRow[]>} */
async function fetchDevToTag(tag, query) {
  const res = await fetch(`https://dev.to/api/articles?tag=${tag}&${query}`, {
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const url = typeof item.url === 'string' ? item.url : '';
    const image = typeof item.cover_image === 'string' ? item.cover_image : pickPlaceholder(url);
    const sourceName = item.organization?.name || item.user?.name || 'Dev.to';
    return [
      {
        url,
        title: typeof item.title === 'string' ? item.title : '',
        summary: typeof item.description === 'string' ? item.description : '',
        image,
        published_at: typeof item.published_at === 'string' ? item.published_at : '',
        source: sourceName,
        language: item.language === 'pt' ? 'pt' : 'en',
      },
    ];
  });
}

/** @returns {Promise<ArticleRow[]>} */
async function fetchTabNews() {
  const res = await fetch('https://www.tabnews.com.br/api/v1/contents?strategy=relevant&per_page=30&page=1', {
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .filter((a) => typeof a?.title === 'string' && TABNEWS_KEYWORDS.some((kw) => a.title.toLowerCase().includes(kw)))
    .slice(0, 8)
    .map((a) => {
      const url =
        typeof a.source_url === 'string' && /^https?:\/\//i.test(a.source_url)
          ? a.source_url
          : `https://www.tabnews.com.br/${a.owner_username}/${a.slug}`;
      const domain = (() => {
        try {
          return new URL(a.source_url || '').hostname.replace('www.', '');
        } catch {
          return '';
        }
      })();
      const summary = domain
        ? `Via ${domain} · Publicado e discutido na comunidade brasileira TabNews.`
        : `Publicado por @${a.owner_username} e em destaque na comunidade brasileira TabNews.`;
      return {
        url,
        title: a.title,
        summary,
        image: pickPlaceholder(a.slug || a.title),
        published_at: a.published_at,
        source: 'TabNews',
        language: /** @type {'pt'} */ ('pt'),
      };
    });
}

/** @returns {Promise<ArticleRow[]>} */
async function fetchAllSources() {
  const results = await Promise.allSettled([
    ...DEVTO_EN_TAGS.map((tag) => fetchDevToTag(tag, 'per_page=4&top=7')),
    ...DEVTO_PT_TAGS.map((tag) => fetchDevToTag(tag, 'per_page=5&top=30')),
    fetchTabNews(),
  ]);
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

// --- CLI upsert / delete ---

async function makeUpsert(supabaseUrl, token) {
  const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
  return async (rows) => {
    for (const row of rows) {
      const res = await fetch(`${supabaseUrl}/rest/v1/articles?on_conflict=url`, {
        method: 'POST',
        headers: {
          apikey: anonKey || token,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(row),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Upsert failed ${res.status}: ${body.slice(0, 200)}`);
      }
    }
  };
}

async function makeDeleteOlderThan(supabaseUrl, token) {
  const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
  return async (days) => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(`${supabaseUrl}/rest/v1/articles?published_at=lt.${encodeURIComponent(cutoff)}`, {
      method: 'DELETE',
      headers: {
        apikey: anonKey || token,
        Authorization: `Bearer ${token}`,
        Prefer: 'return=representation',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Delete failed ${res.status}: ${body.slice(0, 200)}`);
    }
    const deleted = await res.json().catch(() => []);
    return Array.isArray(deleted) ? deleted.length : 0;
  };
}

const isMain = process.argv[1]
  ? new URL(import.meta.url).pathname === new URL(`file://${process.argv[1]}`).pathname
  : false;

if (isMain) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const token = process.env.NEWS_WRITER_TOKEN;

  if (!supabaseUrl || !token) {
    process.stderr.write('Error: SUPABASE_URL and NEWS_WRITER_TOKEN are required\n');
    process.exit(1);
  }

  const upsert = await makeUpsert(supabaseUrl, token);
  const deleteOlderThan = await makeDeleteOlderThan(supabaseUrl, token);

  try {
    process.stdout.write('Fetching sources…\n');
    const result = await syncNews({ fetchSources: fetchAllSources, upsert, deleteOlderThan });
    process.stdout.write(
      `Done: fetched=${result.fetched} kept=${result.kept} removed=${result.removed}\n`,
    );
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
