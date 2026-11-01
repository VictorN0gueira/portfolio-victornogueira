import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { coverOf, projects, REMOVED_PROJECT_SLUGS } from '../data/projects';
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
      expect(screen.getByRole('link', { name: /vamos conversar/i })).toHaveAttribute('href', '/contato');
      expect(screen.getByText(PROJECT_CTA_TEXT)).toBeInTheDocument();
    },
  );

  it('makes the way back a target of at least 44 px and hides its arrow from assistive technology', () => {
    renderAt('/projetos/dizpara');

    const back = screen.getByRole('link', { name: /todos os projetos/i });

    expect(back.className).toContain('min-h-11');
    expect(back.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no link that opens a new tab or leaves the site', () => {
    const { container } = renderAt('/projetos/dizpara');

    expect(container.querySelector('a[target="_blank"]')).toBeNull();
    expect(container.querySelector('a[href^="http"]')).toBeNull();
  });

  it.each(projects.map((project) => project.slug))('sets the head of %s: title, canonical, share image and its alt text, breadcrumb', async (slug) => {
    const project = projects.find((item) => item.slug === slug)!;
    renderAt(`/projetos/${slug}`);

    await waitFor(() => expect(document.title).toBe(`${project.title} | VN One`));
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', `https://vnone.com.br/projetos/${slug}`);
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    expect(meta('property', 'og:image')).toBe(coverOf(project).shareUrl);
    expect(meta('name', 'twitter:image')).toBe(coverOf(project).shareUrl);
    expect(meta('property', 'og:image:alt')).toBe(project.shots[0].alt);
    expect(meta('property', 'og:image:width')).toBe('1200');
    expect(meta('property', 'og:image:height')).toBe('630');
    expect(meta('property', 'og:description')).toBe(project.description);
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

  it('puts noindex in the head at once, without waiting for the chunk of the not found page', async () => {
    renderAt('/projetos/nao-existe');

    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
    await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' });
  });
});
