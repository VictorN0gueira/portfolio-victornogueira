import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { contactFormCopy } from '../components/contact/contactFormCopy';
import { faqs } from '../data/faqs';
import { homeCopy } from '../data/homeCopy';
import { DEFAULT_HOURLY_RATE, buildQuoteMessage } from '../lib/roi';
import { SITE } from '../lib/site';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import { rejectUnexpectedFetch } from '../test/contactForm';
import { WARM_UP_HOOK_TIMEOUT_MS, preloadHomeSections, warmUpRender } from '../test/lazyPages';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import { removeScrollIntoViewStub, stubScrollIntoViewEverywhere } from '../test/scroll';
import HomePage from './HomePage';

const FINAL_HEADING = homeCopy.finalCta.heading;
const QUOTE_BUTTON = homeCopy.roi.cta;
// The words the quote opens with, up to the numbers. They come from the builder, so a new wording is one change.
const QUOTE_START = buildQuoteMessage({ hoursPerWeek: 1, teamMultiplier: 1, hourlyRate: DEFAULT_HOURLY_RATE }).split(':')[0];
const OLD_SECTION_TEXTS = ['Cases em Destaque', 'Vamos criar', 'Respondo em até'];

// The integrations strip is named by its own h2 (the line "A gente conecta o que você já usa"), the first one on the page.
const INTEGRATIONS_HEADING = 'A gente conecta o que você já usa';

// The h2 of every section after the hero, in the order the page shows them. The statement of the second section
// is read from the page, since it is a long sentence that lives in the section.
const SECTION_HEADINGS = [
  homeCopy.useCases.heading,
  homeCopy.services.heading,
  homeCopy.method.heading,
  homeCopy.roi.heading,
  homeCopy.testimonials.heading,
  homeCopy.faq.heading,
  FINAL_HEADING,
];

// The strip of integrations and the statement each carry an h2 of their own, before the named sections.
const EXPECTED_H2_COUNT = SECTION_HEADINGS.length + 2;

expectNoConsoleOutput();

let scrollIntoView: ReturnType<typeof stubScrollIntoViewEverywhere>;

// The eight lazy chunks are loaded once, here, and the first render is paid here too, so a test waits for nothing slow.
beforeAll(async () => {
  await preloadHomeSections();
  await warmUpRender(<HomePage />, () => expect(document.querySelectorAll('h2')).toHaveLength(EXPECTED_H2_COUNT));
}, WARM_UP_HOOK_TIMEOUT_MS);

beforeEach(() => {
  stubMatchMedia();
  // The form must never reach the network from a test.
  rejectUnexpectedFetch();
  // jsdom has no scrollIntoView. It is put back to nothing after every test, so a failing one cannot leak it.
  scrollIntoView = stubScrollIntoViewEverywhere();
});

afterEach(removeScrollIntoViewStub);

/** Renders the home and waits until every lazy section (the statement, the seven headings and the form) is in. */
async function renderHome(route = '/') {
  const view = renderWithProviders(<HomePage />, { route });
  await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(EXPECTED_H2_COUNT));
  return view;
}

const messageField = () => screen.getByLabelText(contactFormCopy.labels.mensagem) as HTMLTextAreaElement;

describe('HomePage structure', () => {
  it('shows the hero first and then the sections in the order of the brief', async () => {
    await renderHome();

    const h2s = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    // The strip of integrations is the first h2, the statement the second: it is not one of the named ones.
    expect(h2s[0]).toBe(INTEGRATIONS_HEADING);
    expect(h2s[1]).toBe(homeCopy.statement.heading);
    expect(h2s.slice(2)).toEqual(SECTION_HEADINGS);

    const h1 = screen.getByRole('heading', { level: 1 });
    const first = screen.getAllByRole('heading', { level: 2 })[0];
    expect(h1.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts the integrations strip between the hero and the statement', async () => {
    await renderHome();
    const strip = screen.getByText('A gente conecta o que você já usa');
    const h1 = screen.getByRole('heading', { level: 1 });
    const statement = screen.getAllByRole('heading', { level: 2 })[1];

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
    expect(container.querySelector('#clientes')).toBe(screen.getByRole('region', { name: homeCopy.testimonials.heading }));
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

  it('keeps the organization and website schemas, the title, the description and the canonical address of the home', async () => {
    await renderHome();

    await waitFor(() => {
      const types = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
        (script) => JSON.parse(script.textContent ?? '{}')['@type'],
      );

      expect(types).toEqual(expect.arrayContaining(['Organization', 'WebSite', 'FAQPage']));
      expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://vnone.com.br/');
      expect(document.title).toBe(SITE.title);
      expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute('content', SITE.description);
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
    expect(scrollIntoView).toHaveBeenCalledWith();
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
    expect(within(final).getByRole('link', { name: homeCopy.finalCta.cta })).toBeInTheDocument();
  });
});
