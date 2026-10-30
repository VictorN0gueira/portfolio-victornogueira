// Types for config/securityHeaders.mjs, so vite.config.ts and the unit tests can import it under strict TypeScript.
export const N8N_ORIGIN: string;
export const BLOG_FEED_ORIGINS: readonly string[];
export const CSP_DIRECTIVES: Readonly<Record<string, readonly string[]>>;
export const CONTENT_SECURITY_POLICY: string;
export const META_CONTENT_SECURITY_POLICY: string;
export const HSTS_VALUE: string;
export const SECURITY_HEADERS: Readonly<Record<string, string>>;
export function renderCsp(directives: Readonly<Record<string, readonly string[]>>): string;
export function cspMetaTag(): string;
export function injectCspMeta(html: string): string;
export function renderNginxSnippet(): string;
