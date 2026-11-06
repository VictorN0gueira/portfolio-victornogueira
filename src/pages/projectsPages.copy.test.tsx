import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { getProjectBySlug } from '../data/projects';
import { DASH_RULE, FIRST_PERSON_RULE, NUMBER_RULE, SALES_RULE, SLASH_RULE, withoutAllowedNumbers } from '../test/projectCopy';
import { renderWithProviders } from '../test/render';
import ProjectDetailPage from './ProjectDetailPage';
import ProjectsPage from './ProjectsPage';

const TEST_TIMEOUT_MS = 20_000;
const MIN_TEXT_LENGTH = 200;
const CASE_SLUGS = ['dizpara', 'portal-link-in-bio'];

/** What a visitor or a screen reader gets from a rendered page: the text, the accessible names and the image descriptions. */
function readableText(rendered: HTMLElement): string {
  // The structured data of the head is not read by a visitor: work on a copy without it.
  const container = rendered.cloneNode(true) as HTMLElement;
  container.querySelectorAll('script').forEach((script) => script.remove());
  const names = [...container.querySelectorAll('[aria-label], img[alt]')].map((element) => element.getAttribute('aria-label') ?? element.getAttribute('alt') ?? '');
  return [container.textContent ?? '', ...names].join('\n');
}

describe('the rendered projects pages follow the copy rules', { timeout: TEST_TIMEOUT_MS }, () => {
  async function pages(): Promise<[string, string][]> {
    const list = renderWithProviders(<ProjectsPage />, { route: '/projetos' });
    expect(screen.getByRole('region', { name: 'Projetos' })).toBeInTheDocument();
    const listText = readableText(list.container);
    list.unmount();
    const cases = CASE_SLUGS.map((slug) => {
      const { container, unmount } = renderWithProviders(
        <Routes>
          <Route path="/projetos/:slug" element={<ProjectDetailPage />} />
        </Routes>,
        { route: `/projetos/${slug}` },
      );
      // The page has really rendered: its own h1 is there before anything is scanned.
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(getProjectBySlug(slug)?.title);
      const text = readableText(container);
      unmount();
      return [`case ${slug}`, text] as [string, string];
    });
    return [['list', listText], ...cases];
  }

  it('scans real pages: each one rendered its title and gives a long text to the rules', async () => {
    const scanned = await pages();

    expect(scanned.map(([name]) => name)).toEqual(['list', ...CASE_SLUGS.map((slug) => `case ${slug}`)]);
    for (const [name, text] of scanned) expect(text.length, name).toBeGreaterThan(MIN_TEXT_LENGTH);
    expect(scanned[0][1]).toContain('Projetos');
    CASE_SLUGS.forEach((slug, index) => expect(scanned[index + 1][1]).toContain(getProjectBySlug(slug)?.title));
  });

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
