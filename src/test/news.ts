import { vi } from 'vitest';

/** A JSON answer, the way the news feeds and the edge function send one. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** The edge function is down; dev.to answers with `devTo` and TabNews with `tabNews` (any other host fails with a 503). */
export function stubPublicFeeds(devTo: unknown, tabNews: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const address = String(input);
      if (address.includes('dev.to')) return jsonResponse(devTo);
      if (address.includes('tabnews')) return jsonResponse(tabNews);
      return jsonResponse({}, 503);
    }),
  );
}
