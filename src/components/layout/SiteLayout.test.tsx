import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { lazy } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import SiteLayout from './SiteLayout';

const EXIT_TIMEOUT_MS = 3000;

// A page that never finishes loading, to see the Suspense fallback of the layout.
const NeverLoadedPage = lazy(() => new Promise<{ default: () => null }>(() => undefined));

function Home() {
  return (
    <>
      <h1>página inicial</h1>
      <Link to="/sobre">ir para sobre</Link>
      <Link to="/sobre#equipe">ir para a equipe</Link>
    </>
  );
}

function About() {
  return <h1>página sobre</h1>;
}

function renderSite(route = '/') {
  return renderWithProviders(
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/sobre" element={<About />} />
        <Route path="/carregando" element={<NeverLoadedPage />} />
      </Route>
    </Routes>,
    { route },
  );
}

describe('SiteLayout', () => {
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the page inside one main landmark with id main-content that can take focus', () => {
    renderSite();

    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    expect(mains[0]).toHaveAttribute('id', 'main-content');
    expect(mains[0]).toHaveAttribute('tabindex', '-1');
    expect(within(mains[0]).getByRole('heading', { name: 'página inicial' })).toBeInTheDocument();
  });

  it('has exactly one skip link, and it is the first link of the page', () => {
    renderSite();

    const skipLinks = screen.getAllByRole('link', { name: 'Pular para o conteúdo' });
    expect(skipLinks).toHaveLength(1);
    expect(screen.getAllByRole('link')[0]).toBe(skipLinks[0]);
  });

  it('frames the page with the header before it and the footer after it', () => {
    renderSite();

    const main = screen.getByRole('main');
    const header = screen.getByRole('banner');
    const footer = screen.getByRole('contentinfo');
    expect(header.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(footer).toHaveAttribute('id', 'rodape');
  });

  it('floats the WhatsApp button outside of the main landmark', () => {
    renderSite();

    const whatsapp = screen.getByRole('link', { name: 'Falar no WhatsApp' });
    expect(screen.getByRole('main')).not.toContainElement(whatsapp);
  });

  it('shows a labelled loading state while a lazy page loads', () => {
    renderSite('/carregando');

    expect(within(screen.getByRole('main')).getByRole('status', { name: 'Carregando página' })).toBeInTheDocument();
  });

  it('fades the page out, swaps it and resets the scroll to the top', async () => {
    const user = userEvent.setup();
    renderSite();

    await user.click(screen.getByRole('link', { name: 'ir para sobre' }));

    expect(await screen.findByRole('heading', { name: 'página sobre' }, { timeout: EXIT_TIMEOUT_MS })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'página inicial' })).not.toBeInTheDocument();
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' }));
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('keeps showing the previous page while it fades out, instead of the next one', async () => {
    const user = userEvent.setup();
    renderSite();

    await user.click(screen.getByRole('link', { name: 'ir para sobre' }));

    expect(screen.getByRole('heading', { name: 'página inicial' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'página sobre' })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'página sobre' }, { timeout: EXIT_TIMEOUT_MS })).toBeInTheDocument();
  });

  it('leaves the scroll to the destination page when the link carries a hash', async () => {
    const user = userEvent.setup();
    renderSite();

    await user.click(screen.getByRole('link', { name: 'ir para a equipe' }));

    expect(await screen.findByRole('heading', { name: 'página sobre' }, { timeout: EXIT_TIMEOUT_MS })).toBeInTheDocument();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
