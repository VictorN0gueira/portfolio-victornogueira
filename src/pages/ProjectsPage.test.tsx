import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { projects } from '../data/projects';
import { renderWithProviders } from '../test/render';
import ProjectsPage, { PROJECTS_PAGE_DESCRIPTION } from './ProjectsPage';

const PAGE_TITLE = 'Projetos';
const LAZY_LOAD_TIMEOUT_MS = 8000;

async function renderPage(): Promise<HTMLElement> {
  renderWithProviders(<ProjectsPage />, { route: '/projetos' });
  return screen.findByRole('region', { name: PAGE_TITLE }, { timeout: LAZY_LOAD_TIMEOUT_MS });
}

describe('ProjectsPage', () => {
  it('has no tabs and no split between own products and client cases', async () => {
    const section = await renderPage();

    expect(within(section).queryByRole('tablist')).toBeNull();
    expect(within(section).queryByRole('tab')).toBeNull();
    expect(section.textContent).not.toMatch(/produtos pr[oó]prios|cases de clientes?|case de cliente/i);
  });

  it('lists the seven projects, each linking to its own page, DizPara and Hub081 first', async () => {
    const section = await renderPage();

    const hrefs = within(section)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(projects.map((project) => `/projetos/${project.slug}`));
    expect(hrefs.slice(0, 2)).toEqual(['/projetos/dizpara', '/projetos/hub081']);
  });

  it('shows the two featured projects in their own list, apart from the five regular ones', async () => {
    const section = await renderPage();

    // The tags of a card are lists too: the two lists of projects are the ones that sit directly in the section.
    const [featured, regular] = within(section)
      .getAllByRole('list')
      .filter((list) => list.parentElement === section);

    expect(featured.querySelectorAll(':scope > li')).toHaveLength(2);
    expect(regular.querySelectorAll(':scope > li')).toHaveLength(5);
  });

  it('goes h1 then h2 with no level skipped: one h1, and every project title is an h2', async () => {
    const section = await renderPage();

    const headings = within(section).getAllByRole('heading');

    expect(headings.map((heading) => heading.tagName)).toEqual(['H1', ...projects.map(() => 'H2')]);
    expect(headings.slice(1).map((heading) => heading.textContent)).toEqual(projects.map((project) => project.title));
  });

  it('names every card with its title and the visible "Ver detalhes", and no two names are alike', async () => {
    const section = await renderPage();

    const names = within(section)
      .getAllByRole('link')
      .map((link) => link.getAttribute('aria-labelledby'))
      .map((ids) => (ids ?? '').split(' ').map((id) => document.getElementById(id)?.textContent).join(' '));

    expect(names).toEqual(projects.map((project) => `${project.title} Ver detalhes`));
  });

  it('loads only the first featured cover right away: eager and high priority, every other image lazy', async () => {
    const section = await renderPage();

    const images = within(section).getAllByRole('img', { hidden: true });
    const eager = images.filter((image) => image.getAttribute('loading') === 'eager');

    expect(eager).toHaveLength(1);
    expect(eager[0]).toHaveAttribute('src', projects[0].shots[0].image.src);
    expect(eager[0]).toHaveAttribute('fetchpriority', 'high');
    expect(images.filter((image) => image.getAttribute('fetchpriority') === 'high')).toHaveLength(1);
  });

  it('has no link that leaves the site, no new tab and no access wording', async () => {
    const section = await renderPage();

    expect(section.querySelector('a[target="_blank"]')).toBeNull();
    expect(section.querySelector('a[href^="http"]')).toBeNull();
    expect(section.textContent).not.toMatch(/acessar|ver projeto|demo|visitar/i);
  });

  it('shows no project that was removed', async () => {
    const section = await renderPage();

    expect(within(section).queryByText(/Trocô/)).toBeNull();
    expect(within(section).queryByText(/Importação Massiva/)).toBeNull();
  });

  it('sets the head of the page: title, description, canonical and a share image of its own', async () => {
    await renderPage();

    await waitFor(() => expect(document.title).toBe('Projetos | VN One'));
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', PROJECTS_PAGE_DESCRIPTION);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://vnone.com.br/projetos');
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });
});
