import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { whatsappUrl } from '../../lib/constants';
import { findAccentElements } from '../../test/accent';
import { expectNoConsoleOutput } from '../../test/consoleGuard';
import { SWAP_WAIT, findWhatsappField, rejectUnexpectedFetch, stubFetch, submitEmailForm } from '../../test/contactForm';
import { renderWithProviders } from '../../test/render';
import { FinalCta } from './FinalCta';

const HEADING = 'Qual processo a gente automatiza primeiro?';
const LINK_NAME = 'Chamar no WhatsApp';
const LINK_MESSAGE = 'Olá! Quero automatizar um processo da minha empresa.';

expectNoConsoleOutput();

beforeEach(() => {
  rejectUnexpectedFetch();
});

const sectionOf = (container: HTMLElement): HTMLElement => container.querySelector('section') as HTMLElement;
const itemOf = (element: HTMLElement): HTMLElement => element.closest('[data-reveal-item]') as HTMLElement;

describe('FinalCta copy and structure', () => {
  it('is the black section with the id contato, named by its only h2', () => {
    const { container } = renderWithProviders(<FinalCta />);

    expect(sectionOf(container)).toHaveAttribute('id', 'contato');
    expect(sectionOf(container)).toHaveAttribute('data-tone', 'black');
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getByRole('region', { name: HEADING })).toBe(sectionOf(container));
  });

  it('shows the kicker, the heading and the body', () => {
    renderWithProviders(<FinalCta />);

    expect(screen.getByText('próximo passo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: HEADING })).toBeInTheDocument();
    expect(
      screen.getByText('Conta como funciona hoje. Em 30 minutos a gente mostra por onde começar, sem compromisso.'),
    ).toBeInTheDocument();
  });

  it('draws the large heading, followed by the cursor hidden from assistive tech', () => {
    renderWithProviders(<FinalCta />);
    const heading = screen.getByRole('heading', { level: 2 });
    const cursor = heading.querySelector('.vn-cursor') as HTMLElement;

    expect(heading.className).toContain('clamp(2.25rem,1rem+6vw,6rem)');
    expect(cursor).toHaveAttribute('aria-hidden', 'true');
    expect(cursor).toHaveClass('bg-vn-accent');
  });

  it('caps the heading by the width of its column, so "automatiza" is never broken, and keeps its leading', () => {
    renderWithProviders(<FinalCta />);
    const heading = screen.getByRole('heading', { level: 2 });
    const sizeTokens = heading.className.split(/\s+/).filter((token) => token.startsWith('text-[length:'));

    expect(sizeTokens).toEqual(['text-[length:min(clamp(2.25rem,1rem+6vw,6rem),calc(100cqi/5.5))]']);
    expect(heading).toHaveClass('leading-[.95]', 'font-bold', 'lowercase');
    expect(heading.closest('[data-reveal-item]')).toHaveClass('@container');
  });

  it('keeps the last word and the cursor together, so the block never wraps onto a line of its own', () => {
    renderWithProviders(<FinalCta />);
    const heading = screen.getByRole('heading', { level: 2 });
    const nowrap = heading.querySelector('.whitespace-nowrap') as HTMLElement;

    expect(nowrap).toHaveTextContent('primeiro?');
    expect(nowrap.querySelector('.vn-cursor')).not.toBeNull();
  });

  it('puts the dark scan grid behind the content', () => {
    const { container } = renderWithProviders(<FinalCta />);

    expect(sectionOf(container).querySelector('.vn-scan-grid--dark')).not.toBeNull();
  });

  it('opens a WhatsApp chat with the official number and the automation message, in a new tab', () => {
    renderWithProviders(<FinalCta />);
    const link = screen.getByRole('link', { name: LINK_NAME });

    expect(link).toHaveAttribute('href', whatsappUrl(LINK_MESSAGE));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')?.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    expect(link).toHaveClass('text-vn-white', 'min-h-14', 'text-base', 'leading-tight');
    expect(link).not.toHaveClass('bg-vn-accent');
  });

  it('renders the contact form', () => {
    const { container } = renderWithProviders(<FinalCta />);

    expect(container.querySelector('form[name="contact"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });
});

describe('FinalCta layout', () => {
  it('lays the intro and the form side by side from lg and stacked below it', () => {
    const { container } = renderWithProviders(<FinalCta />);
    const heading = screen.getByRole('heading', { level: 2 });
    const form = container.querySelector('form') as HTMLElement;
    const grid = itemOf(heading).parentElement as HTMLElement;

    expect(grid).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2');
    expect(itemOf(form).parentElement).toBe(grid);
    expect(itemOf(form)).not.toBe(itemOf(heading));
    expect(heading.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lets both columns shrink so the form never widens a 280px page', () => {
    const { container } = renderWithProviders(<FinalCta />);

    expect(itemOf(screen.getByRole('heading', { level: 2 }))).toHaveClass('min-w-0');
    expect(itemOf(container.querySelector('form') as HTMLElement)).toHaveClass('min-w-0');
  });

  it('reveals through one group for its one container', () => {
    const { container } = renderWithProviders(<FinalCta />);

    expect(container.querySelectorAll('[data-reveal-group]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-reveal-item] [data-reveal-group]')).toHaveLength(0);
  });
});

describe('FinalCta accent', () => {
  it('has exactly one accent element, the cursor, with the form idle', () => {
    const { container } = renderWithProviders(<FinalCta />);
    const accents = findAccentElements(container);

    expect(accents).toHaveLength(1);
    expect(accents[0]).toHaveClass('vn-cursor');
  });

  it('keeps the one accent in the WhatsApp method', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<FinalCta />);

    await user.click(screen.getByRole('button', { name: 'Por WhatsApp' }));
    // The e-mail field leaves and the WhatsApp field comes in with a short animation: count once the swap is over.
    await findWhatsappField();
    await waitFor(() => expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument(), SWAP_WAIT);

    expect(findAccentElements(container)).toHaveLength(1);
  });

  it('keeps the one accent with the validation errors showing', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<FinalCta />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(screen.getAllByRole('alert')).toHaveLength(4);
    expect(findAccentElements(container)).toHaveLength(1);
  });

  it('keeps the one accent in the success state', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    const { container } = renderWithProviders(<FinalCta />);

    await submitEmailForm(user);

    expect(await screen.findByRole('heading', { level: 4, name: 'Recebemos sua mensagem' })).toBeInTheDocument();
    expect(findAccentElements(container)).toHaveLength(1);
  });

  it('keeps the one accent in the error state', async () => {
    stubFetch(() => Promise.resolve({ ok: false }));
    const user = userEvent.setup();
    const { container } = renderWithProviders(<FinalCta />);

    await submitEmailForm(user);

    expect(await screen.findByText(/Não deu pra enviar/)).toBeInTheDocument();
    expect(findAccentElements(container)).toHaveLength(1);
  });
});

describe('FinalCta prefill', () => {
  it('hands the prefill message to the message field', () => {
    renderWithProviders(<FinalCta prefillMessage="Quero automatizar notas fiscais" />);

    expect(screen.getByLabelText('Mensagem')).toHaveValue('Quero automatizar notas fiscais');
  });

  it('updates the message field when the prefill changes after mount', () => {
    const { rerender } = renderWithProviders(<FinalCta prefillMessage="Primeira mensagem do simulador" />);

    rerender(<FinalCta prefillMessage="Segunda mensagem do simulador" />);

    expect(screen.getByLabelText('Mensagem')).toHaveValue('Segunda mensagem do simulador');
  });

  it('fills the same message again when the nonce changes after the visitor edited the field', async () => {
    const user = userEvent.setup();
    const message = 'Quero automatizar notas fiscais';
    const { rerender } = renderWithProviders(<FinalCta prefillMessage={message} prefillNonce={1} />);
    await user.clear(screen.getByLabelText('Mensagem'));
    await user.type(screen.getByLabelText('Mensagem'), 'Outra coisa');

    rerender(<FinalCta prefillMessage={message} prefillNonce={2} />);

    expect(screen.getByLabelText('Mensagem')).toHaveValue(message);
  });

  it('leaves the edited message alone when neither the message nor the nonce changes', async () => {
    const user = userEvent.setup();
    const message = 'Quero automatizar notas fiscais';
    const { rerender } = renderWithProviders(<FinalCta prefillMessage={message} prefillNonce={1} />);
    await user.clear(screen.getByLabelText('Mensagem'));
    await user.type(screen.getByLabelText('Mensagem'), 'Outra coisa');

    rerender(<FinalCta prefillMessage={message} prefillNonce={1} />);

    expect(screen.getByLabelText('Mensagem')).toHaveValue('Outra coisa');
  });

  it('keeps the other fields when the nonce changes', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<FinalCta prefillMessage="Quero automatizar" prefillNonce={1} />);
    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');

    rerender(<FinalCta prefillMessage="Quero automatizar" prefillNonce={2} />);

    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Lima');
  });
});
