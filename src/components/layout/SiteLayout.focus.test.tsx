import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shellCopy } from '../../data/shellCopy';
import { renderWithProviders } from '../../test/render';
import SiteLayout from './SiteLayout';

const EXIT_TIMEOUT_MS = 3000;
const state = { shouldBreak: true };

/** A page that sets the document title the way SEO does, from an effect. */
function Page({ title, children }: { title: string; children?: React.ReactNode }) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  return (
    <>
      <h1>{title}</h1>
      {children}
    </>
  );
}

function Home() {
  const navigate = useNavigate();
  return (
    <Page title="Início | VN One">
      <Link to="/sobre">ir para sobre</Link>
      <Link to="/#metodo">ir para o método</Link>
      <Link to="/quebrada">ir para a quebrada</Link>
      <button type="button" onClick={() => navigate('/sobre')}>
        ir por código
      </button>
    </Page>
  );
}

function About() {
  const navigate = useNavigate();
  return (
    <Page title="Sobre | VN One">
      <button type="button" onClick={() => navigate(-1)}>
        voltar
      </button>
    </Page>
  );
}

function Broken() {
  if (state.shouldBreak) throw new Error('page failed');
  return <Page title="Quebrada | VN One" />;
}

function renderSite(route = '/', strict = false) {
  return renderWithProviders(
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/sobre" element={<About />} />
        <Route path="/quebrada" element={<Broken />} />
      </Route>
    </Routes>,
    { route, strict },
  );
}

const main = () => screen.getByRole('main');

describe('SiteLayout focus and announcement on route change', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn());
    state.shouldBreak = true;
    document.title = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not move focus on the first load', async () => {
    renderSite();

    await screen.findByRole('heading', { name: 'Início | VN One' });
    expect(main()).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it('keeps an announcement region in the page from the start, empty on the first load', async () => {
    renderSite();

    await screen.findByRole('heading', { name: 'Início | VN One' });
    const regions = screen.getAllByRole('status').filter((region) => region.classList.contains('sr-only'));
    expect(regions).toHaveLength(1);
    expect(regions[0]).toBeEmptyDOMElement();
  });

  it('moves focus to the main landmark, without scrolling, once the old page has faded out', async () => {
    const user = userEvent.setup();
    renderSite();
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');

    await user.click(screen.getByRole('link', { name: 'ir para sobre' }));

    await screen.findByRole('heading', { name: 'Sobre | VN One' }, { timeout: EXIT_TIMEOUT_MS });
    await waitFor(() => expect(main()).toHaveFocus());
    expect(focus.mock.calls.some(([options]) => options?.preventScroll === true)).toBe(true);
  });

  it('announces the title of the new page in the polite region', async () => {
    const user = userEvent.setup();
    renderSite();

    await user.click(screen.getByRole('link', { name: 'ir para sobre' }));

    await waitFor(() => expect(screen.getByText('Sobre | VN One', { selector: '.sr-only' })).toBeInTheDocument(), {
      timeout: EXIT_TIMEOUT_MS,
    });
  });

  it('does the same when the route changes from code, and when the visitor goes back', async () => {
    const user = userEvent.setup();
    renderSite();
    await user.click(screen.getByRole('button', { name: 'ir por código' }));
    await screen.findByRole('heading', { name: 'Sobre | VN One' }, { timeout: EXIT_TIMEOUT_MS });
    await waitFor(() => expect(main()).toHaveFocus());

    (document.activeElement as HTMLElement).blur();
    await user.click(screen.getByRole('button', { name: 'voltar' }));

    await screen.findByRole('heading', { name: 'Início | VN One' }, { timeout: EXIT_TIMEOUT_MS });
    await waitFor(() => expect(main()).toHaveFocus());
    await waitFor(() => expect(screen.getByText('Início | VN One', { selector: '.sr-only' })).toBeInTheDocument());
  });

  it('does not fire on a change of the hash alone', async () => {
    const user = userEvent.setup();
    renderSite();
    await screen.findByRole('heading', { name: 'Início | VN One' });

    await user.click(screen.getByRole('link', { name: 'ir para o método' }));
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(main()).not.toHaveFocus();
    expect(screen.queryByText('Início | VN One', { selector: '.sr-only' })).toBeNull();
  });

  it('works under StrictMode: one announcement region and the focus lands on main', async () => {
    const user = userEvent.setup();
    renderSite('/', true);

    await user.click(await screen.findByRole('link', { name: 'ir para sobre' }));

    await waitFor(() => expect(main()).toHaveFocus(), { timeout: EXIT_TIMEOUT_MS });
    expect(screen.getAllByRole('status').filter((region) => region.classList.contains('sr-only'))).toHaveLength(1);
  });
});

describe('SiteLayout takes the focus back for main after a route change', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn());
    document.title = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function arriveOnAbout() {
    const user = userEvent.setup();
    renderSite();
    await user.click(screen.getByRole('link', { name: 'ir para sobre' }));
    await screen.findByRole('heading', { name: 'Sobre | VN One' }, { timeout: EXIT_TIMEOUT_MS });
    await waitFor(() => expect(main()).toHaveFocus());
    return screen.getByRole('button', { name: 'voltar' });
  }

  it('takes focus back when it moves by itself right after, as a closing menu returns it to its button', async () => {
    const other = await arriveOnAbout();

    other.focus();

    await waitFor(() => expect(main()).toHaveFocus());
  });

  it.each(['keydown', 'pointerdown', 'touchstart', 'wheel'])('leaves focus where the visitor puts it after a %s', async (type) => {
    const other = await arriveOnAbout();

    window.dispatchEvent(new Event(type));
    other.focus();

    expect(other).toHaveFocus();
  });

  it('stops guarding after a short while, so a later focus change is never fought', async () => {
    const other = await arriveOnAbout();
    await new Promise((resolve) => setTimeout(resolve, 1200));

    other.focus();

    expect(other).toHaveFocus();
  });

  it('lets go of its input listeners once the guard has ended, without waiting for an unmount', async () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    await arriveOnAbout();
    expect(remove.mock.calls.some(([type]) => type === 'wheel')).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
      expect(remove.mock.calls.some(([name]) => name === type), type).toBe(true);
    }
  });

  it('removes its listeners when the layout unmounts', async () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const user = userEvent.setup();
    const view = renderSite();
    await user.click(screen.getByRole('link', { name: 'ir para sobre' }));
    await screen.findByRole('heading', { name: 'Sobre | VN One' }, { timeout: EXIT_TIMEOUT_MS });
    await waitFor(() => expect(main()).toHaveFocus());

    view.unmount();

    expect(remove.mock.calls.some(([type]) => type === 'focusin')).toBe(true);
  });
});

describe('SiteLayout error boundary around the page', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn());
    state.shouldBreak = true;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows the recovery panel inside the layout when a page fails, and keeps the header and the footer', async () => {
    const user = userEvent.setup();
    renderSite();

    await user.click(screen.getByRole('link', { name: 'ir para a quebrada' }));

    const alert = await screen.findByRole('alert', {}, { timeout: EXIT_TIMEOUT_MS });
    expect(within(main()).getByText(shellCopy.errorBoundary.heading)).toBeInTheDocument();
    expect(alert).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('resets when the visitor navigates to another page', async () => {
    const user = userEvent.setup();
    renderSite('/quebrada');
    await screen.findByRole('alert');

    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: /VN One/i }));

    expect(await screen.findByRole('heading', { name: 'Início | VN One' }, { timeout: EXIT_TIMEOUT_MS })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
