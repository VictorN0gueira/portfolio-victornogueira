import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { shellCopy } from '../data/shellCopy';
import { renderWithProviders } from '../test/render';
import ProjectDetailPage from './ProjectDetailPage';

// The chunk of the not found page never arrives: what the page shows while it waits is what these tests look at.
vi.mock('../components/NotFound', () => new Promise(() => {}));

function renderMissingProject() {
  return renderWithProviders(
    <Routes>
      <Route path="/projetos/:slug" element={<ProjectDetailPage />} />
    </Routes>,
    { route: '/projetos/nao-existe' },
  );
}

describe('ProjectDetailPage while the chunk of the not found page is on its way', () => {
  it('has the noindex in the head already, because the SEO tag does not wait inside the Suspense', () => {
    renderMissingProject();

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it('holds the place of the final page: as tall as the screen and on the brand black', () => {
    renderMissingProject();

    const placeholder = screen.getByRole('status', { name: shellCopy.pageLoading });

    expect(placeholder.className).toContain('min-h-dvh');
    expect(placeholder.className).toContain('bg-vn-black');
  });
});
