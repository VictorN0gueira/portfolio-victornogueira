import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PROJECT_CTA_TEXT, PROJECTS_INTRO, PROJECTS_PAGE_DESCRIPTION } from '../components/projectLabels';
import { projects } from '../data/projects';
import { projectsCopy } from '../data/projectsCopy';
import { routeMetaFor } from '../seo/routeMeta';
import { renderWithProviders } from '../test/render';
import ProjectsPage from './ProjectsPage';

const PAGE_TITLE = 'Projetos';
const CASE_HREF = '/projetos/';

function renderPage(): HTMLElement {
  return renderWithProviders(<ProjectsPage />, { route: '/projetos' }).container;
}

function caseLinks(): HTMLElement[] {
  return screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith(CASE_HREF));
}

/** The two lists of projects: the tags of a card are lists too, so the ones that hold a link to a case are picked. */
function listsOfProjects(): HTMLElement[] {
  return screen.getAllByRole('list').filter((list) => list.querySelector(`:scope > li a[href^="${CASE_HREF}"]`));
}

describe('ProjectsPage', () => {
  it('opens with the page hero: the kicker, the one h1 and the intro', () => {
    renderPage();

    const hero = screen.getByRole('region', { name: PAGE_TITLE });

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(PAGE_TITLE);
    expect(within(hero).getByText(projectsCopy.listKicker)).toBeInTheDocument();
    expect(within(hero).getByText(PROJECTS_INTRO)).toBeInTheDocument();
  });

  it('has no tabs and no split between own products and client cases', () => {
    const container = renderPage();

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(container.textContent).not.toMatch(/produtos pr[oó]prios|cases de clientes?|case de cliente/i);
  });

  it('lists the seven projects, each linking to its own page, DizPara and Hub081 first', () => {
    renderPage();

    const hrefs = caseLinks().map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(projects.map((project) => `${CASE_HREF}${project.slug}`));
    expect(hrefs.slice(0, 2)).toEqual(['/projetos/dizpara', '/projetos/hub081']);
  });

  it('shows the two featured projects in their own list, apart from the five regular ones', () => {
    renderPage();

    const [featured, regular] = listsOfProjects();

    expect(listsOfProjects()).toHaveLength(2);
    expect(featured.querySelectorAll(':scope > li')).toHaveLength(2);
    expect(regular.querySelectorAll(':scope > li')).toHaveLength(5);
  });

  it('goes h1, then every project title as an h2, then the closing h2, with no level skipped', () => {
    renderPage();

    const headings = screen.getAllByRole('heading');

    expect(headings.map((heading) => heading.tagName)).toEqual(['H1', ...projects.map(() => 'H2'), 'H2']);
    expect(headings.slice(1, -1).map((heading) => heading.textContent)).toEqual(
      projects.map((project) => project.title),
    );
    expect(headings.at(-1)).toHaveTextContent(PROJECT_CTA_TEXT);
  });

  it('names every card with its title and the visible "Ver detalhes", and no two names are alike', () => {
    renderPage();

    const names = caseLinks()
      .map((link) => link.getAttribute('aria-labelledby'))
      .map((ids) =>
        (ids ?? '')
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent)
          .join(' '),
      );

    expect(names).toEqual(projects.map((project) => `${project.title} Ver detalhes`));
    expect(new Set(names).size).toBe(projects.length);
  });

  it('loads only the first featured cover right away: eager and high priority, every other image lazy', () => {
    renderPage();

    const images = screen.getAllByRole('img', { hidden: true });
    const eager = images.filter((image) => image.getAttribute('loading') === 'eager');

    expect(eager).toHaveLength(1);
    expect(eager[0]).toHaveAttribute('src', projects[0].shots[0].image.src);
    expect(eager[0]).toHaveAttribute('fetchpriority', 'high');
    expect(images.filter((image) => image.getAttribute('fetchpriority') === 'high')).toHaveLength(1);
  });

  it('has no card that leaves the site, opens a new tab or promises access', () => {
    renderPage();

    for (const list of listsOfProjects()) {
      expect(list.querySelector('a[target="_blank"]')).toBeNull();
      expect(list.querySelector('a[href^="http"]')).toBeNull();
      expect(list.textContent).not.toMatch(/acessar|ver projeto|demo|visitar/i);
    }
  });

  it('closes with the band that asks for a conversation: a link to /contato and a WhatsApp link', () => {
    renderPage();

    const band = screen.getByRole('region', { name: PROJECT_CTA_TEXT });

    expect(within(band).getByText(projectsCopy.ctaBody)).toBeInTheDocument();
    expect(within(band).getByRole('link', { name: 'Vamos conversar' })).toHaveAttribute('href', '/contato');
    expect(
      within(band)
        .getByRole('link', { name: /WhatsApp/ })
        .getAttribute('href'),
    ).toContain(encodeURIComponent(projectsCopy.ctaWhatsappMessage));
  });

  it('shows no project that was removed', () => {
    renderPage();

    expect(screen.queryByText(/Trocô/)).toBeNull();
    expect(screen.queryByText(/Importação Massiva/)).toBeNull();
  });

  it('uses the brand only: no zinc, italic, dark: or legacy shadow in the markup', () => {
    const container = renderPage();

    expect(container.innerHTML).not.toMatch(/zinc|italic|dark:|shadow-2xl/);
  });

  it('sets the head of the page: title, description, canonical and no noindex', async () => {
    renderPage();

    await waitFor(() => expect(document.title).toBe(routeMetaFor('/projetos')?.title));
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', PROJECTS_PAGE_DESCRIPTION);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://vnone.com.br/projetos');
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });
});
