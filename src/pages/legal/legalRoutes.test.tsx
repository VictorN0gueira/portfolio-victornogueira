import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { legalCopy } from '../../data/legalCopy';
import { LGPD_TEXT_HASH, PRIVACY_TEXT_HASH, hashOfText, visibleText } from '../../test/legalText';
import { renderWithProviders } from '../../test/render';

// The two modules App loads with import() for /privacidade and /lgpd: the frozen page inside the frame, and nothing else.

const ROUTES = [
  ['PrivacyRoute', () => import('./PrivacyRoute'), 'Política de Privacidade', PRIVACY_TEXT_HASH],
  ['LgpdRoute', () => import('./LgpdRoute'), 'LGPD', LGPD_TEXT_HASH],
] as const;

describe.each(ROUTES)('%s', (_name, load, title, hash) => {
  it('renders the page with its only h1, a table of contents and the text it had', async () => {
    const { default: Route } = await load();
    const { container } = renderWithProviders(<Route />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: legalCopy.tocLabel })).toBeInTheDocument();
    const body = container.querySelector('[data-legal-body]');
    expect(hashOfText(visibleText(body as Element))).toBe(hash);
  });
});
