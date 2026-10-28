import { expect, test as base, type Route } from '@playwright/test';

/**
 * Safety net for every test that touches the contact form. The two n8n webhooks are the only lead channel of the
 * business: a real request from a test would create a real lead. So:
 *  - a catch-all route, registered before the test body, aborts and records every request that is neither the
 *    page's own origin nor answered by the test's own `page.route(N8N_WEBHOOK_PATTERN, ...)`;
 *  - after the test, the fixture fails it if anything was blocked, if a request went to a host other than the
 *    page's own or n8n, or if the page sent an n8n POST that the test's route did not see.
 * A test must register its own n8n route first (see `n8nRoute`); forgetting it blocks the request and fails the test.
 */
export const N8N_HOST = 'n8n.vnone.com.br';
export const N8N_WEBHOOK_PATTERN = `https://${N8N_HOST}/webhook/**`;

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

export interface N8nCall {
  url: string;
  method: string;
  payload: Record<string, string>;
}

export interface NetworkGuard {
  /** The POSTs to n8n that the test's own route answered (preflights are answered but not listed). */
  calls: N8nCall[];
  /** The URLs the catch-all aborted: they were neither the page's own origin nor answered by the test. */
  blocked: string[];
  /** The hosts of every http(s) request the page made. */
  hosts: Set<string>;
  /** The n8n POSTs the page sent, seen from the page, whoever answered them. */
  n8nPostsSent: string[];
}

export type N8nAnswer = (route: Route, call: N8nCall) => Promise<void>;

/** A 200 like the one n8n answers when the workflow starts. */
export const fulfillOk: N8nAnswer = (route) =>
  route.fulfill({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: '{"ok":true}' });

export const fulfillStatus =
  (status: number): N8nAnswer =>
  (route) =>
    route.fulfill({ status, headers: CORS_HEADERS, contentType: 'application/json', body: '{}' });

/** The network goes down: the browser sees a failed request. */
export const abortRequest: N8nAnswer = (route) => route.abort();

/**
 * The handler for `page.route(N8N_WEBHOOK_PATTERN, ...)`. It records each POST, answers the CORS preflight itself and
 * hands the request to `answer`. A test that wants a different answer per request reads `network.calls.length`.
 */
export function n8nRoute(network: NetworkGuard, answer: N8nAnswer) {
  return async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    const call: N8nCall = { url: request.url(), method: request.method(), payload: request.postDataJSON() };
    network.calls.push(call);
    await answer(route, call);
  };
}

export const test = base.extend<{ network: NetworkGuard }>({
  network: [
    async ({ page, baseURL }, use) => {
      const ownHost = new URL(baseURL ?? 'http://localhost:4173').host;
      const guard: NetworkGuard = { calls: [], blocked: [], hosts: new Set(), n8nPostsSent: [] };

      page.on('request', (request) => {
        const url = new URL(request.url());
        if (!url.protocol.startsWith('http')) return;
        guard.hosts.add(url.host);
        if (url.host === N8N_HOST && request.method() === 'POST') guard.n8nPostsSent.push(request.url());
      });
      // Registered first, so every route a test adds later runs before it. It only sees what no later route took.
      await page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.host === ownHost) {
          await route.fallback();
          return;
        }
        guard.blocked.push(route.request().url());
        await route.abort();
      });

      await use(guard);

      expect(guard.blocked, 'requests blocked by the catch-all (not the page itself, not answered by the test)').toEqual([]);
      const strangers = [...guard.hosts].filter((host) => host !== ownHost && host !== N8N_HOST);
      expect(strangers, 'hosts other than the page itself and n8n').toEqual([]);
      expect(guard.n8nPostsSent.length, 'n8n POSTs sent by the page against the ones the test route saw').toBe(
        guard.calls.length,
      );
    },
    { auto: true },
  ],
});

export { expect };
