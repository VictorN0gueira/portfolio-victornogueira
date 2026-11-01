import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { testimonials } from '../../data/testimonials';
import { findAccentElements } from '../../test/accent';
import { expectNoConsoleOutput } from '../../test/consoleGuard';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { Testimonials } from './Testimonials';
import { A11Y_STORAGE_KEY } from '../../contexts/AccessibilityContext';

const OPEN_NAME = /ler depoimento completo/i;
// Pristine output: no act warning, no Radix missing title or description warning.
expectNoConsoleOutput();

afterEach(() => {
  localStorage.clear();
});

const openButtons = (): HTMLElement[] => screen.getAllByRole('button', { name: OPEN_NAME });

function renderSection() {
  const view = renderWithProviders(<Testimonials />);
  return { ...view, user: userEvent.setup() };
}

async function openCard(user: ReturnType<typeof userEvent.setup>, position: number) {
  await user.click(openButtons()[position]);
  return screen.findByRole('dialog');
}

const overlay = (): HTMLElement => document.querySelector('[data-state="open"].fixed.inset-0') as HTMLElement;

describe('Testimonials dialog', () => {
  it('is closed until a card button is activated, and no dialog is mounted for the other cards', async () => {
    const { user } = renderSection();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await openCard(user, 0);

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('opens a dialog with the full text of Adailton Amancio, verbatim', async () => {
    const { user } = renderSection();

    const dialog = await openCard(user, 0);

    expect(testimonials[0].name).toBe('Adailton Amancio');
    expect(within(dialog).getByText(testimonials[0].text)).toBeInTheDocument();
    expect(within(dialog).getByText('Adailton Amancio')).toBeInTheDocument();
  });

  it.each(testimonials.map((item, position) => [position, item] as const))(
    'opening card %i shows that testimonial and no other: its text, logo, name, role and company',
    async (position, item) => {
      const { user } = renderSection();

      const dialog = await openCard(user, position);

      expect(within(dialog).getByText(item.text)).toBeInTheDocument();
      expect(within(dialog).getByText(item.name)).toBeInTheDocument();
      expect(dialog.textContent).toContain(item.role);
      expect(dialog.textContent).toContain(item.company);
      expect(dialog.querySelector('img')).toHaveAttribute('src', item.logo);
      for (const other of testimonials.filter((candidate) => candidate.id !== item.id)) {
        expect(within(dialog).queryByText(other.text)).not.toBeInTheDocument();
      }
    },
  );

  it('shows the draft testimonials (ids 5 and 6) in the dialog as well', async () => {
    const { user } = renderSection();
    const [fifth, sixth] = testimonials.filter((item) => item.isDraft);

    const dialog = await openCard(user, testimonials.indexOf(fifth));
    expect(within(dialog).getByText(fifth.text)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const second = await openCard(user, testimonials.indexOf(sixth));
    expect(within(second).getByText(sixth.text)).toBeInTheDocument();
  });

  it('changes the content when another card is opened after the first was closed, still with one dialog', async () => {
    const { user } = renderSection();

    await openCard(user, 0);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const dialog = await openCard(user, 2);

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(within(dialog).getByText(testimonials[2].text)).toBeInTheDocument();
    expect(within(dialog).queryByText(testimonials[0].text)).not.toBeInTheDocument();
  });

  it('names itself with the visible author name, once: the lead in is sr-only text inside it', async () => {
    const { user } = renderSection();
    const { name } = testimonials[0];

    const dialog = await openCard(user, 0);
    const title = within(dialog).getByText(name);
    const text = dialog.textContent;
    if (text === null) throw new Error('the dialog has no text content');

    expect(within(dialog).getAllByText(name)).toHaveLength(1);
    expect(text.split(name)).toHaveLength(2);
    expect(dialog).toHaveAttribute('aria-labelledby', title.id);
    expect(title.tagName).toBe('P');
    expect(title.querySelector('.sr-only')).toHaveTextContent('Depoimento de');
    expect(dialog).toHaveAccessibleName(`Depoimento de ${name}`);
    // twMerge keeps every class of the visible name.
    expect(title).toHaveClass('break-words', 'text-lg', 'font-medium', 'leading-snug');
  });

  it.each(testimonials.map((item) => [item.name] as const))('shows the name of %s once as an element of its own', async (name) => {
    const { user } = renderSection();
    const position = testimonials.findIndex((item) => item.name === name);

    const dialog = await openCard(user, position);

    expect(within(dialog).getAllByText(name)).toHaveLength(1);
    expect(dialog).toHaveAccessibleName(`Depoimento de ${name}`);
  });

  it('has an accessible name with the author and the full text as its description', async () => {
    const { user } = renderSection();

    const dialog = await openCard(user, 1);

    expect(dialog).toHaveAccessibleName(`Depoimento de ${testimonials[1].name}`);
    expect(dialog).toHaveAccessibleDescription(testimonials[1].text);
  });

  it('quotes the full text in a blockquote and adds no heading to the outline', async () => {
    const { user } = renderSection();

    const dialog = await openCard(user, 0);

    expect(dialog.querySelector('blockquote')).toHaveTextContent(testimonials[0].text);
    expect(within(dialog).queryAllByRole('heading')).toHaveLength(0);
  });

  it('closes on Escape and gives the focus back to the button that opened it', async () => {
    const { user } = renderSection();
    const trigger = openButtons()[0];
    await openCard(user, 0);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('closes with the Fechar button and gives the focus back to the right card button', async () => {
    const { user } = renderSection();
    const trigger = openButtons()[3];
    const dialog = await openCard(user, 3);

    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('closes when the overlay is clicked', async () => {
    const { user } = renderSection();
    const trigger = openButtons()[1];
    await openCard(user, 1);

    await user.click(overlay());

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('stays open when the text inside it is clicked', async () => {
    const { user } = renderSection();
    const dialog = await openCard(user, 0);

    await user.click(within(dialog).getByText(testimonials[0].text));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has a Fechar button with the exact name, an X icon, a 44px target and a visible focus ring', async () => {
    const { user } = renderSection();
    const dialog = await openCard(user, 0);
    const close = within(dialog).getByRole('button', { name: 'Fechar' });

    expect(close.getAttribute('aria-label') ?? close.textContent).toBe('Fechar');
    expect(close).toHaveClass('size-11', 'vn-focus-ring-ink');
    expect(close.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the focus inside while Tab runs forwards and backwards', async () => {
    const { user } = renderSection();
    const dialog = await openCard(user, 0);

    for (let press = 0; press < 3; press += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let press = 0; press < 3; press += 1) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('hides the page behind it from assistive tech while it is open', async () => {
    const { user } = renderSection();
    await openCard(user, 0);

    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('scrolls on its own on a short screen, never wider than the viewport, and keeps clear of the safe area, in CSS only', async () => {
    const { user } = renderSection();
    const dialog = await openCard(user, 0);

    expect(dialog).toHaveClass('overflow-y-auto', 'overscroll-contain', 'fixed', 'm-auto', 'h-fit', 'max-w-2xl');
    // Each side keeps at least 1rem and more where the safe area needs it.
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(dialog).toHaveClass(`${side}-[max(1rem,env(safe-area-inset-${side}))]`);
    }
    // The 90dvh cap also stays between the top and the bottom inset, so a big notch never pushes the panel under it.
    expect(dialog.className).toContain(
      'max-h-[min(90dvh,calc(100dvh_-_max(1rem,env(safe-area-inset-top))_-_max(1rem,env(safe-area-inset-bottom))))]',
    );
    // Nothing is set inline: the style of the panel holds no inset and no max-height that could override a class.
    for (const property of ['top', 'right', 'bottom', 'left', 'maxHeight'] as const) {
      expect(dialog.style[property], property).toBe('');
    }
    // No fixed width: the insets give it the width of the viewport minus the margins, up to max-w-2xl.
    expect(dialog.className).not.toMatch(/(^|\s)w-(\[|\d)/);
  });

  it('breaks long words in the author block and the text', async () => {
    const { user } = renderSection();
    const dialog = await openCard(user, 0);

    expect(within(dialog).getByText(testimonials[0].name)).toHaveClass('break-words');
    expect(dialog.querySelector('blockquote')).toHaveClass('break-words');
  });

  it('swaps a logo that fails to load for the initials, hidden from assistive tech', async () => {
    const { user } = renderSection();
    const dialog = await openCard(user, 0);

    fireEvent.error(dialog.querySelector('img') as HTMLImageElement);

    const fallback = dialog.querySelector('[data-logo-fallback]') as HTMLElement;
    expect(dialog.querySelector('img')).toBeNull();
    expect(fallback).toHaveTextContent('CP');
    expect(fallback).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws the dialog logo sized, lazy and async, with an empty alt', async () => {
    const { user } = renderSection();
    const dialog = await openCard(user, 0);
    const img = dialog.querySelector('img') as HTMLImageElement;

    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('width');
    expect(img).toHaveAttribute('height');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('keeps the accent out of the page and out of the portaled dialog and overlay', async () => {
    const { user, container } = renderSection();
    const dialog = await openCard(user, 0);

    expect(findAccentElements(container)).toHaveLength(0);
    expect(findAccentElements(dialog)).toHaveLength(0);
    expect(findAccentElements(overlay())).toHaveLength(0);
    expect(findAccentElements(document.body)).toHaveLength(0);
  });
});

describe('Testimonials dialog motion', () => {
  it('animates the panel and the overlay while motion is allowed', async () => {
    const { user } = renderSection();
    const dialog = await openCard(user, 0);

    expect(dialog).toHaveClass('vn-dialog-panel');
    expect(overlay()).toHaveClass('vn-dialog-overlay');
  });

  it('carries no animation class under prefers-reduced-motion', async () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    const { user } = renderSection();

    const dialog = await openCard(user, 0);

    expect(dialog.className).not.toContain('vn-dialog');
    expect(overlay().className).not.toContain('vn-dialog');
  });

  it('carries no animation class when the accessibility toggle paused animations', async () => {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    const { user } = renderSection();

    const dialog = await openCard(user, 0);

    expect(dialog.className).not.toContain('vn-dialog');
    expect(overlay().className).not.toContain('vn-dialog');
  });

  it('closes at once without motion, and still gives the focus back', async () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    const { user } = renderSection();
    const trigger = openButtons()[0];
    await openCard(user, 0);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
