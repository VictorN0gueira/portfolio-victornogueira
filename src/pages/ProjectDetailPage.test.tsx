import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { projects } from '../data/projects';
import { renderWithProviders } from '../test/render';
import ProjectDetailPage from './ProjectDetailPage';

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/projetos/:slug" element={<ProjectDetailPage />} />
    </Routes>,
    { route },
  );
}

describe('ProjectDetailPage', () => {
  it.each(projects.map((project) => [project.slug, project.title] as const))(
    'shows the case of %s with the way back and the contact call to action',
    (slug, title) => {
      renderAt(`/projetos/${slug}`);

      expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /todos os projetos/i })).toHaveAttribute('href', '/projetos');
      expect(screen.getByRole('link', { name: /vamos conversar/i })).toHaveAttribute('href', '/contato');
    },
  );

  it('has no link that opens a new tab or leaves the site', () => {
    const { container } = renderAt('/projetos/dizpara');

    expect(container.querySelector('a[target="_blank"]')).toBeNull();
    expect(container.querySelector('a[href^="http"]')).toBeNull();
  });

  it.each(['troco', 'importacao-massiva-nfe', 'nao-existe'])('shows the not found page for %s, without crashing', (slug) => {
    renderAt(`/projetos/${slug}`);

    expect(screen.queryByRole('heading', { level: 1, name: /Trocô|Importação/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /vamos conversar/i })).toBeNull();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
  });
});
