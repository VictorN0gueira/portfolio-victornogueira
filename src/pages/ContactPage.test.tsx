import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contactCopy } from '../data/contactCopy';
import { homeCopy } from '../data/homeCopy';
import { shellCopy } from '../data/shellCopy';
import { CONTACT_EMAIL } from '../lib/constants';
import { routeMetaFor } from '../seo/routeMeta';
import { rejectUnexpectedFetch } from '../test/contactForm';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import ContactPage from './ContactPage';

interface ScrollOptions {
  focus: (section: HTMLElement) => HTMLElement | null;
  onFocused?: () => void;
}

const scrollToIdWhenMounted = vi.hoisted(() =>
  vi.fn<(id: string, options: unknown) => () => void>(() => () => undefined),
);
vi.mock('../lib/scrollToIdWhenMounted', () => ({ scrollToIdWhenMounted }));

const QUOTE_BUTTON = homeCopy.roi.cta;

function renderPage() {
  return renderWithProviders(<ContactPage />, { route: '/contato' });
}

/** The options the page gave the scroll helper on its first call. */
function firstScrollOptions(): ScrollOptions {
  return scrollToIdWhenMounted.mock.calls[0][1] as ScrollOptions;
}

describe('ContactPage', () => {
  beforeEach(() => {
    scrollToIdWhenMounted.mockClear();
    stubMatchMedia();
    // The page mounts the real form: nothing in this file may reach the network, and nothing submits it.
    rejectUnexpectedFetch();
  });

  it('takes its head from the route metadata and writes the FAQ once, with one breadcrumb', async () => {
    renderPage();
    const meta = routeMetaFor('/contato')!;

    await waitFor(() => expect(document.title).toBe(meta.title));
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', meta.description);
    const types = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
      (node) => JSON.parse(node.textContent ?? '{}')['@type'],
    );
    expect(types.sort()).toEqual(['BreadcrumbList', 'FAQPage']);
  });

  it('has one h1, the title of the page, before every other heading', () => {
    renderPage();

    const titles = screen.getAllByRole('heading', { level: 1 });
    expect(titles.map((title) => title.textContent)).toEqual([contactCopy.title]);
    expect(screen.getAllByRole('heading')[0]).toBe(titles[0]);
  });

  it('shows the simulator, then the form, then the questions, each under its own h2', () => {
    renderPage();

    const names = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(names).toEqual([homeCopy.roi.heading, homeCopy.finalCta.heading, homeCopy.faq.heading]);
  });

  it('puts the lead and the channels in the hero, with the e-mail from the shared constants', () => {
    renderPage();
    const hero = screen.getByRole('heading', { level: 1 }).closest('section') as HTMLElement;

    expect(within(hero).getByRole('link', { name: `${CONTACT_EMAIL}, ${contactCopy.channels.email}` })).toHaveAttribute(
      'href',
      `mailto:${CONTACT_EMAIL}`,
    );
    expect(hero).toHaveTextContent(contactCopy.lead);
  });

  it('has one form, one message field and one anchor called contato', () => {
    renderPage();

    expect(document.querySelectorAll('form[name="contact"]')).toHaveLength(1);
    expect(document.querySelectorAll('textarea')).toHaveLength(1);
    expect(document.querySelectorAll('#contato')).toHaveLength(1);
  });

  it('keeps the old visual out: no dark variant, italic, zinc, green or gradient, no blur glow, no 10px text', () => {
    const { container } = renderPage();

    // What the old Contact block carried (italic title, zinc grays, a green icon, a blurred circle) and what the system bans.
    expect(container.innerHTML).not.toMatch(
      /dark:|italic|zinc-|green-|emerald|purple|cyan|blur-\[|gradient|text-\[10px\]/,
    );
    expect(container.innerHTML).not.toMatch(/[\s"'](from|to|via)-/);
  });

  it('after "Quero automatizar esse processo" scrolls to the form and moves focus into the message once it holds the quote', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: QUOTE_BUTTON }));

    expect(scrollToIdWhenMounted).toHaveBeenCalledTimes(1);
    expect(scrollToIdWhenMounted.mock.calls[0][0]).toBe('contato');
    const message = screen.getByRole('textbox', { name: 'Mensagem' }) as HTMLTextAreaElement;
    expect(message.value).not.toBe('');
    expect(firstScrollOptions().focus(document.getElementById('contato') as HTMLElement)).toBe(message);
  });

  it('does not take the message as the focus target while it is not the quote', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: QUOTE_BUTTON }));
    await user.clear(screen.getByRole('textbox', { name: 'Mensagem' }));

    expect(firstScrollOptions().focus(document.getElementById('contato') as HTMLElement)).toBeNull();
  });

  it('says that the quote is in the message when the focus gets there, in a polite status that starts empty', async () => {
    const user = userEvent.setup();
    renderPage();
    const status = () => document.querySelector('div[role="status"]') as HTMLElement;
    expect(status()).toHaveAttribute('role', 'status');
    expect(status()).toHaveTextContent('');

    await user.click(screen.getByRole('button', { name: QUOTE_BUTTON }));
    expect(status()).toHaveTextContent('');
    firstScrollOptions().onFocused?.();

    await waitFor(() => expect(status()).toHaveTextContent(shellCopy.quoteFilled));
  });

  it('clears the announcement as soon as the visitor edits the message, so it never describes a changed field', async () => {
    const user = userEvent.setup();
    renderPage();
    const status = () => document.querySelector('div[role="status"]') as HTMLElement;
    await user.click(screen.getByRole('button', { name: QUOTE_BUTTON }));
    firstScrollOptions().onFocused?.();
    await waitFor(() => expect(status()).toHaveTextContent(shellCopy.quoteFilled));

    await user.type(screen.getByRole('textbox', { name: 'Mensagem' }), ' e mais uma coisa');

    expect(status()).toHaveTextContent('');
  });

  it('keeps the announcement while the visitor only edits another field', async () => {
    const user = userEvent.setup();
    renderPage();
    const status = () => document.querySelector('div[role="status"]') as HTMLElement;
    await user.click(screen.getByRole('button', { name: QUOTE_BUTTON }));
    firstScrollOptions().onFocused?.();
    await waitFor(() => expect(status()).toHaveTextContent(shellCopy.quoteFilled));

    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Ana');

    expect(status()).toHaveTextContent(shellCopy.quoteFilled);
  });

  it('cancels the pending scroll when the visitor leaves the page, so Back within seconds cannot scroll the next page', async () => {
    const cancel = vi.fn();
    scrollToIdWhenMounted.mockReturnValueOnce(cancel);
    const user = userEvent.setup();
    const { unmount } = renderPage();
    await user.click(screen.getByRole('button', { name: QUOTE_BUTTON }));
    expect(cancel).not.toHaveBeenCalled();

    unmount();

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('cancels the previous scroll before starting the next one when the quote is requested twice', async () => {
    const firstCancel = vi.fn();
    const secondCancel = vi.fn();
    scrollToIdWhenMounted.mockReturnValueOnce(firstCancel).mockReturnValueOnce(secondCancel);
    const user = userEvent.setup();
    renderPage();
    const button = screen.getByRole('button', { name: QUOTE_BUTTON });

    await user.click(button);
    expect(firstCancel).not.toHaveBeenCalled();
    await user.click(button);

    expect(firstCancel).toHaveBeenCalledTimes(1);
    expect(secondCancel).not.toHaveBeenCalled();
    expect(scrollToIdWhenMounted).toHaveBeenCalledTimes(2);
  });

  it('puts the quote back in the message on a second click with the same figures, after the visitor changed the text', async () => {
    const user = userEvent.setup();
    renderPage();
    const button = screen.getByRole('button', { name: QUOTE_BUTTON });
    const message = screen.getByRole('textbox', { name: 'Mensagem' });

    await user.click(button);
    const quote = (message as HTMLTextAreaElement).value;
    expect(quote).not.toBe('');
    await user.clear(message);
    await user.type(message, 'outro texto');
    expect(message).toHaveValue('outro texto');
    await user.click(button);

    expect(message).toHaveValue(quote);
  });
});
