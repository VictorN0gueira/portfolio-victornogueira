import { BLOG_IMAGE_HOSTS, CLOUDINARY_HOST, CLOUDINARY_PATH_PREFIX } from '../../config/blogImageHosts.mjs';
import type { NewsArticle } from './newsService';

/**
 * The blog shows text, links and cover images that come from other people's servers (dev.to, TabNews, the edge function, and
 * the browser cache, which any script of the origin can write). Everything goes through here before it is rendered or cached:
 * links must be http or https with no credentials, cover images must be https from a host of config/blogImageHosts.mjs, text
 * has a length cap, dates must be real ISO dates, and an item of the wrong shape is dropped.
 */

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:']);
const IMAGE_HOSTS: ReadonlySet<string> = new Set(BLOG_IMAGE_HOSTS);

const MAX_URL_LENGTH = 2048;
const MAX_TITLE_LENGTH = 300;
const MAX_DESCRIPTION_LENGTH = 600;
const MAX_SOURCE_NAME_LENGTH = 120;

/** The parsed address when `value` is an absolute http or https URL with no credentials, and undefined for anything else. */
function parseWebUrl(value: unknown): URL | undefined {
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) return undefined;
  try {
    const url = new URL(value.trim());
    const hasCredentials = url.username !== '' || url.password !== '';
    return SAFE_LINK_PROTOCOLS.has(url.protocol) && !hasCredentials ? url : undefined;
  } catch {
    return undefined;
  }
}

/** The normalised address of an http or https link, or undefined (`javascript:`, `data:`, credentials, relative and broken values). */
export function safeHttpUrl(value: unknown): string | undefined {
  return parseWebUrl(value)?.href;
}

/**
 * The address of a cover image when it is https, on the default port, from a listed host (and, for Cloudinary, under the one
 * account dev.to uses), and an empty string otherwise.
 */
export function safeImageUrl(value: unknown): string {
  const url = parseWebUrl(value);
  if (!url || url.protocol !== 'https:' || url.port !== '' || !IMAGE_HOSTS.has(url.hostname)) return '';
  if (url.hostname === CLOUDINARY_HOST && !url.pathname.startsWith(CLOUDINARY_PATH_PREFIX)) return '';
  return url.href;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

/** True when year, month and day name a day that exists (the engine would roll 31 February over to March). */
function isRealDay(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * A date of the news feeds, or null. Only ISO 8601 is accepted (a day, or a day and a time with or without an offset): the
 * permissive Date.parse reads "1" as the year 2001. A date with no time is that calendar day in the zone of the reader, so
 * a Brazilian reader sees the same day the feed wrote (read as UTC midnight it would be the day before).
 */
export function parseNewsDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const dayOnly = DATE_ONLY.exec(value);
  const withTime = DATE_TIME.exec(value);
  const match = dayOnly ?? withTime;
  if (!match || !isRealDay(Number(match[1]), Number(match[2]), Number(match[3]))) return null;

  const date = dayOnly
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

/** One article of unknown shape as a safe NewsArticle, or null when it has no title, no usable link or no valid date. */
export function sanitizeArticle(raw: unknown): NewsArticle | null {
  if (!isRecord(raw)) return null;
  const title = asText(raw.title, MAX_TITLE_LENGTH).trim();
  const url = safeHttpUrl(raw.url);
  if (title === '' || url === undefined || parseNewsDate(raw.publishedAt) === null) return null;

  const source = isRecord(raw.source) ? raw.source : {};
  return {
    title,
    description: asText(raw.description, MAX_DESCRIPTION_LENGTH),
    url,
    image: safeImageUrl(raw.image),
    publishedAt: raw.publishedAt as string,
    source: { name: asText(source.name, MAX_SOURCE_NAME_LENGTH), url: safeHttpUrl(source.url) ?? '' },
    language: raw.language === 'pt' ? 'pt' : 'en',
  };
}

/**
 * The articles of a list of unknown shape that pass sanitizeArticle, each address once (the first article of it stays: the
 * cards of the list are keyed by it). A value that is not a list gives an empty list.
 */
export function sanitizeArticles(raw: unknown): NewsArticle[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .map(sanitizeArticle)
    .filter((article): article is NewsArticle => article !== null)
    .filter((article) => !seen.has(article.url) && Boolean(seen.add(article.url)));
}
