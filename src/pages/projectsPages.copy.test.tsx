import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { DASH_RULE, FIRST_PERSON_RULE, NUMBER_RULE, SALES_RULE, SLASH_RULE, withoutAllowedNumbers } from '../test/projectCopy';
import { renderWithProviders } from '../test/render';
import ProjectDetailPage from './ProjectDetailPage';
import ProjectsPage from './ProjectsPage';

const TEST_TIMEOUT_MS = 20_000;
const LAZY_LOAD_TIMEOUT_MS = 8000;

/** What a visitor or a screen reader gets from a rendered page: the text, the accessible names and the image descriptions. */
function readableText(rendered: HTMLElement): string {
  // The structured data of the head is not read by a visitor: work on a copy without it.
  const container = rendered.cloneNode(true) as HTMLElement;
  container.querySelectorAll('script').forEach((script) => script.remove());
  const names = [...container.querySelectorAll('[aria-label], img[alt]')].map((element) => element.getAttribute('aria-label') ?? element.getAttribute('alt') ?? '');
  return [container.textContent ?? '', ...names].join('\n');
}

describe('the rendered projects pages follow the copy rules', { timeout: TEST_TIMEOUT_MS }, () => {
  beforeAll(async () => {
    await import('../components/Projects');
  });

  async function pages(): Promise<[string, string][]> {
    const list = renderWithProviders(<ProjectsPage />, { route: '/projetos' });
    await screen.findByRole('region', { name: 'Projetos' }, { timeout: LAZY_LOAD_TIMEOUT_MS });
    const listText = readableText(list.container);
    list.unmount();
    const cases = ['dizpara', 'portal-link-in-bio'].map((slug) => {
      const { container, unmount } = renderWithProviders(
        <Routes>
          <Route path="/projetos/:slug" element={<ProjectDetailPage />} />
        </Routes>,
        { route: `/projetos/${slug}` },
      );
      const text = readableText(container);
      unmount();
      return [`case ${slug}`, text] as [string, string];
    });
    return [['list', listText], ...cases];
  }

  it.each([
    ['dashes and look-alikes', DASH_RULE],
    ['a slash separator', SLASH_RULE],
    ['sales wording', SALES_RULE],
    ['the first person singular', FIRST_PERSON_RULE],
  ])('has no %s on the list, a featured case and a regular case', async (_label, rule) => {
    for (const [name, text] of await pages()) expect(text.match(rule)?.[0], `${name}: ${rule}`).toBeUndefined();
  });

  it('carries no number except the name Hub081 and what a screen prints', async () => {
    for (const [name, text] of await pages()) expect(withoutAllowedNumbers(text).match(NUMBER_RULE)?.input?.match(/.{0,30}\d.{0,30}/)?.[0], name).toBeUndefined();
  });
});
