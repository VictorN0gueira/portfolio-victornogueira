import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { faqs } from '../data/faqs';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import { rejectUnexpectedFetch } from '../test/contactForm';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import HomePage from './HomePage';

const LAZY_WAIT = { timeout: 20_000 } as const;
const FINAL_HEADING = 'Qual processo a gente automatiza primeiro?';
const QUOTE_BUTTON = 'Quero automatizar esse processo';
const QUOTE_START = 'Olá, VN One! Usei a calculadora do site';
const OLD_SECTION_TEXTS = ['Cases em Destaque', 'Vamos criar', 'Respondo em até'];

// The h2 of every section after the hero, in the order the page shows them. The statement of the second section
// is read from the page, since it is a long sentence that lives in the section.
const SECTION_HEADINGS = [
  'Comece pelo processo que mais pesa na rotina',
  'Três jeitos de tirar trabalho manual da sua frente',
  'Do primeiro papo ao fluxo rodando',
  'Quanto o trabalho manual custa por ano',
  'Quem já automatizou com a gente',
  'Perguntas que a gente sempre ouve',
  FINAL_HEADING,
];

// Eight lazy chunks are fetched and rendered in jsdom on every render of the page: slow on a busy machine.
vi.setConfig({ testTimeout: 30_000 });

expectNoConsoleOutput();

const scrollIntoView = vi.fn();

beforeEach(() => {
  stubMatchMedia();
  // The form must never reach the network from a test.
  rejectUnexpectedFetch();
  scrollIntoView.mockClear();
  // jsdom has no scrollIntoView. It is put back to nothing after every test, so a failing one cannot leak it.
  Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true, writable: true });
});

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

/** Renders the home and waits until every lazy section (the statement, the seven headings and the form) is in. */
async function renderHome(route = '/') {
  const view = renderWithProviders(<HomePage />, { route });
  await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(SECTION_HEADINGS.length + 1), LAZY_WAIT);
  return view;
}

const messageField = () => screen.getByLabelText('Mensagem') as HTMLTextAreaElement;

describe('HomePage structure', () => {
  it('shows the hero first and then the sections in the order of the brief', async () => {
    await renderHome();

    const h2s = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    // The statement of the second section is the first h2: it is not one of the named ones.
    expect(h2s.slice(1)).toEqual(SECTION_HEADINGS);
    expect(h2s[0]).toMatch(/^O trabalho repetitivo/);

    const h1 = screen.getByRole('heading', { level: 1 });
    const first = screen.getAllByRole('heading', { level: 2 })[0];
    expect(h1.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts the integrations strip between the hero and the statement', async () => {
    await renderHome();
    const strip = screen.getByText('Conectamos o que você já usa');
    const h1 = screen.getByRole('heading', { level: 1 });
    const statement = screen.getAllByRole('heading', { level: 2 })[0];

    expect(h1.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(strip.compareDocumentPosition(statement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('leaves none of the old home sections behind', async () => {
    await renderHome();

    for (const text of OLD_SECTION_TEXTS) {
      expect(screen.queryByText(new RegExp(text))).toBeNull();
    }
  });

  it('has exactly one contato anchor and one form: the contact fields use fixed ids', async () => {
    const { container } = await renderHome();

    expect(container.querySelectorAll('#contato')).toHaveLength(1);
    expect(container.querySelectorAll('form')).toHaveLength(1);
    expect(container.querySelectorAll('#contact-nome')).toHaveLength(1);
    expect(screen.getByRole('region', { name: FINAL_HEADING })).toHaveAttribute('id', 'contato');
  });

  it('exposes the metodo and clientes anchors on their sections', async () => {
    const { container } = await renderHome();

    expect(container.querySelector('#metodo')).toBe(screen.getByRole('region', { name: 'Do primeiro papo ao fluxo rodando' }));
    expect(container.querySelector('#clientes')).toBe(screen.getByRole('region', { name: 'Quem já automatizou com a gente' }));
  });
});

describe('HomePage SEO', () => {
  it('describes the page as a FAQPage built from the same faqs as the accordion', async () => {
    await renderHome();

    await waitFor(() => {
      const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].map((script) =>
        JSON.parse(script.textContent ?? '{}'),
      );
      const faqPage = schemas.find((schema) => schema['@type'] === 'FAQPage');

      expect(faqPage).toBeDefined();
      expect(faqPage.mainEntity).toEqual(
        faqs.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })),
      );
    });
  });

  it('keeps the organization and website schemas of the home and the canonical address', async () => {
    await renderHome();

    await waitFor(() => {
      const types = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
        (script) => JSON.parse(script.textContent ?? '{}')['@type'],
      );

      expect(types).toEqual(expect.arrayContaining(['Organization', 'WebSite', 'FAQPage']));
      expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://vnone.com.br/');
    });
  });
});

describe('HomePage quote hand over', () => {
  it('fills the message of the form with the quote and scrolls to the contact section', async () => {
    const user = userEvent.setup();
    await renderHome();

    await user.click(screen.getByRole('button', { name: QUOTE_BUTTON }));

    await waitFor(() => expect(messageField().value.startsWith(QUOTE_START)).toBe(true));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('contato'));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('fills the same quote again after the visitor edited the field', async () => {
    const user = userEvent.setup();
    await renderHome();
    await user.click(screen.getByRole('button', { name: QUOTE_BUTTON }));
    await waitFor(() => expect(messageField().value.startsWith(QUOTE_START)).toBe(true));
    const quote = messageField().value;

    await user.clear(messageField());
    await user.type(messageField(), 'Outra coisa');
    expect(messageField()).toHaveValue('Outra coisa');

    await user.click(screen.getByRole('button', { name: QUOTE_BUTTON }));

    await waitFor(() => expect(messageField()).toHaveValue(quote));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('keeps what the visitor typed in the other fields when the quote arrives', async () => {
    const user = userEvent.setup();
    await renderHome();
    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');

    await user.click(screen.getByRole('button', { name: QUOTE_BUTTON }));

    await waitFor(() => expect(messageField().value.startsWith(QUOTE_START)).toBe(true));
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Lima');
  });

  it('sends nothing to the network while the quote is handed over', async () => {
    const user = userEvent.setup();
    const fetchMock = rejectUnexpectedFetch();
    await renderHome();

    await user.click(screen.getByRole('button', { name: QUOTE_BUTTON }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('HomePage anchors', () => {
  it('scrolls to the contact section when the address carries #contato', async () => {
    await renderHome('/#contato');

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('contato'));
  });

  it('does not scroll anywhere when the address has no hash', async () => {
    await renderHome();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('shows the form and the WhatsApp link inside the final section', async () => {
    await renderHome();
    const final = screen.getByRole('region', { name: FINAL_HEADING });

    expect(within(final).getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
    expect(within(final).getByRole('link', { name: 'Chamar no WhatsApp' })).toBeInTheDocument();
  });
});
