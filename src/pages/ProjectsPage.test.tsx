import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { projects } from '../data/projects';
import { renderWithProviders } from '../test/render';
import ProjectsPage from './ProjectsPage';

const PAGE_TITLE = 'Projetos';

async function renderPage(): Promise<HTMLElement> {
  renderWithProviders(<ProjectsPage />, { route: '/projetos' });
  return screen.findByRole('region', { name: PAGE_TITLE });
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

    const [featured, regular] = within(section).getAllByRole('list');

    expect(within(featured).getAllByRole('listitem')).toHaveLength(2);
    expect(within(regular).getAllByRole('listitem')).toHaveLength(5);
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
});
