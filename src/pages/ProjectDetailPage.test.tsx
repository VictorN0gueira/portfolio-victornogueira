import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { coverOf, getProjectBySlug, projects, REMOVED_PROJECT_SLUGS } from '../data/projects';
import { projectsCopy } from '../data/projectsCopy';
import { projectMetaFor } from '../seo/projectMeta';
import { renderWithProviders } from '../test/render';
import { PROJECT_CTA_TEXT } from '../components/projectLabels';
import ProjectDetailPage from './ProjectDetailPage';

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/projetos" element={<p>lista de projetos</p>} />
      <Route path="/projetos/:slug" element={<ProjectDetailPage />} />
    </Routes>,
    { route },
  );
}

function meta(attribute: 'name' | 'property', key: string): string | null {
  return document.querySelector(`meta[${attribute}="${key}"]`)?.getAttribute('content') ?? null;
}

describe('ProjectDetailPage', () => {
  it.each(projects.map((project) => [project.slug, project.title] as const))(
    'shows the case of %s with the way back and the contact call to action',
    (slug, title) => {
      renderAt(`/projetos/${slug}`);

      expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /todos os projetos/i })).toHaveAttribute('href', '/projetos');
      for (const link of screen.getAllByRole('link', { name: /vamos conversar/i })) expect(link).toHaveAttribute('href', '/contato');
      expect(screen.getByText(PROJECT_CTA_TEXT)).toBeInTheDocument();
    },
  );

  it('opens with the page hero: the category as the kicker, the name as the one h1, the description as the lead', () => {
    const project = getProjectBySlug('travel-ia')!;
    renderAt('/projetos/travel-ia');

    const hero = screen.getByRole('region', { name: project.title });

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(within(hero).getByText(project.category)).toBeInTheDocument();
    expect(within(hero).getByText(project.description)).toBeInTheDocument();
  });

  it('makes the way back a target of at least 44 px and hides its arrow from assistive technology', () => {
    renderAt('/projetos/dizpara');

    const back = screen.getByRole('link', { name: /todos os projetos/i });

    expect(back.className).toContain('min-h-11');
    expect(back.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it.each(['dizpara', 'hub081'])('shows the highlight phrase of %s', (slug) => {
    renderAt(`/projetos/${slug}`);

    expect(screen.getByText(getProjectBySlug(slug)?.highlight as string)).toBeInTheDocument();
  });

  it('shows no highlight phrase for a project that has none, and no number made up', () => {
    const { container } = renderAt('/projetos/travel-ia');

    expect(container.querySelector('[class*="border-t-[3px]"]')).toBeNull();
  });

  it('ends with the next project of the list, and the last one leads back to the first', () => {
    const { unmount } = renderAt('/projetos/dizpara');
    expect(screen.getByRole('link', { name: new RegExp(`${projectsCopy.nextKicker} Hub081`) })).toHaveAttribute('href', '/projetos/hub081');
    unmount();

    renderAt(`/projetos/${projects[projects.length - 1].slug}`);
    expect(screen.getByRole('link', { name: new RegExp(`${projectsCopy.nextKicker} DizPara`) })).toHaveAttribute('href', '/projetos/dizpara');
  });

  it.each(['dizpara', 'travel-ia'])('goes h1 then h2 only on %s, with one h1 first and no level skipped', (slug) => {
    renderAt(`/projetos/${slug}`);

    const levels = screen.getAllByRole('heading').map((heading) => Number(heading.tagName.slice(1)));

    expect(levels[0]).toBe(1);
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels.every((level) => level <= 2)).toBe(true);
  });

  it('has no link that opens a new tab to a place outside the site except the WhatsApp of the closing band', () => {
    const { container } = renderAt('/projetos/dizpara');

    const outside = [...container.querySelectorAll<HTMLAnchorElement>('a[target="_blank"], a[href^="http"]')];

    expect(outside).toHaveLength(1);
    expect(outside[0].href).toContain('https://wa.me/5581984451243');
  });

  it.each(projects.map((project) => project.slug))('sets the head of %s: title, canonical, share image and its alt text, breadcrumb', async (slug) => {
    const project = projects.find((item) => item.slug === slug)!;
    const routeMeta = projectMetaFor(slug)!;
    renderAt(`/projetos/${slug}`);

    // The title and the description are the ones of the route metadata (the same ones the static head of the build writes).
    await waitFor(() => expect(document.title).toBe(routeMeta.title));
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', `https://vnone.com.br/projetos/${slug}`);
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    expect(meta('property', 'og:image')).toBe(coverOf(project).shareUrl);
    expect(meta('name', 'twitter:image')).toBe(coverOf(project).shareUrl);
    expect(meta('property', 'og:image:alt')).toBe(project.shots[0].alt);
    expect(meta('property', 'og:image:width')).toBe('1200');
    expect(meta('property', 'og:image:height')).toBe('630');
    expect(meta('name', 'description')).toBe(routeMeta.description);
    expect(meta('property', 'og:description')).toBe(routeMeta.description);
    expect(document.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    const breadcrumb = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}');
    expect(breadcrumb['@type']).toBe('BreadcrumbList');
    expect(breadcrumb.itemListElement.map((item: { name: string }) => item.name)).toEqual(['Início', 'Projetos', project.title]);
  });

  it.each([...REMOVED_PROJECT_SLUGS])('sends the old address of %s to the list of projects, with no not found page', async (slug) => {
    renderAt(`/projetos/${slug}`);

    expect(await screen.findByText('lista de projetos')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('shows the not found page for an address that never existed, with noindex, no canonical and no JSON-LD', async () => {
    renderAt('/projetos/nao-existe');

    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /vamos conversar/i })).toBeNull();
    await waitFor(() => expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex'));
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(meta('property', 'og:url')).toBeNull();
    expect(document.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(0);
  });
});

// App.tsx loads NotFound on its own chunk; a static import here would pull it into the chunk of every project page.
describe('ProjectDetailPage and the NotFound chunk', () => {
  const source = readFileSync(resolve(__dirname, 'ProjectDetailPage.tsx'), 'utf8');

  it('does not import NotFound statically, so the code split of that module holds', () => {
    expect(source).not.toMatch(/^import\s+(?!type\b).*from '\.\.\/components\/NotFound'/m);
    expect(source).toMatch(/lazyWithRetry\(\(\) => import\('\.\.\/components\/NotFound'\)\)/);
  });

  // The noindex while the chunk is on its way is in ProjectDetailPage.pending.test.tsx: it needs a chunk that never arrives.
});
