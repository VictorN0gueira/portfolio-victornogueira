import type { Page } from '@playwright/test';

/**
 * A phone has overlay scrollbars: they take no room, and `html { scrollbar-gutter: stable }` (index.css, which keeps the
 * fixed elements from jumping when a modal locks the scroll on a desktop with classic scrollbars) reserves nothing there.
 * Desktop Chrome with a phone sized window reserves the gutter anyway, so a test that checks a phone's layout widths
 * calls this to see the layout a phone has. Call it after `goto`.
 */
export async function useOverlayScrollbars(page: Page): Promise<void> {
  await page.addStyleTag({ content: 'html { scrollbar-gutter: auto !important; }' });
}
