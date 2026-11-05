import { expect, test } from './n8nGuard';

// Google shows the icon it finds in the head of the home, and falls back to /favicon.ico. Before this set existed
// /favicon.ico answered 404 and there was no manifest, so the search result showed a generic globe. Here every icon
// the page declares has to be reachable, with the right type, in the built site.

interface Manifest {
  name: string;
  icons: { src: string; sizes: string }[];
}

test('the fallback /favicon.ico answers 200 as an icon', async ({ request }) => {
  const response = await request.get('/favicon.ico');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('icon');
  const body = await response.body();
  expect([...body.subarray(0, 4)]).toEqual([0, 0, 1, 0]);
});

test('the 48 px PNG answers 200 as image/png', async ({ request }) => {
  const response = await request.get('/brand/favicon-48.png');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/png');
});

test('the web manifest is valid JSON and every icon it lists exists', async ({ request }) => {
  const response = await request.get('/site.webmanifest');
  expect(response.status()).toBe(200);
  const manifest = (await response.json()) as Manifest;
  expect(manifest.name).toBe('VN One');
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512']);
  for (const icon of manifest.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.status(), icon.src).toBe(200);
    expect(iconResponse.headers()['content-type'], icon.src).toContain('image/png');
  }
});

test('the home keeps every icon and the manifest in its head once the app has mounted, and each one resolves', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.locator('#root > *').first()).toBeAttached();

  const hrefs = await page
    .locator('head link[rel~="icon"], head link[rel="apple-touch-icon"], head link[rel="manifest"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(hrefs).toEqual([
    '/favicon.ico',
    '/brand/favicon-48.png',
    '/brand/favicon-96.png',
    '/brand/favicon-192.png',
    '/brand/favicon-32.png',
    '/brand/apple-touch-icon.png',
    '/site.webmanifest',
  ]);
  for (const href of hrefs) {
    const response = await request.get(href ?? '');
    expect(response.status(), href ?? '').toBe(200);
  }
});
