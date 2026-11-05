import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { contactCopy } from '../../data/contactCopy';
import { CONTACT_EMAIL, WHATSAPP_DISPLAY, WHATSAPP_GREETING, whatsappUrl } from '../../lib/constants';
import { NEW_TAB_HINT } from '../../components/ui/NewTabHint';
import { renderWithProviders } from '../../test/render';
import { ContactChannels } from './ContactChannels';

const EMAIL_NAME = `${CONTACT_EMAIL}, ${contactCopy.channels.email}`;
const WHATSAPP_NAME = `${WHATSAPP_DISPLAY}, ${contactCopy.channels.whatsapp}`;

describe('ContactChannels', () => {
  it('lists the place first (not a control), then the e-mail and the WhatsApp, each with its label', () => {
    const { container } = renderWithProviders(<ContactChannels />);
    const terms = Array.from(container.querySelectorAll('dt')).map((term) => term.textContent);

    expect(container.querySelector('dl')).not.toBeNull();
    expect(terms).toEqual([contactCopy.channels.location, contactCopy.channels.email, contactCopy.channels.whatsapp]);
    expect(screen.getByText(contactCopy.channels.locationValue)).toBeInTheDocument();
  });

  it('takes the e-mail from the shared constants', () => {
    renderWithProviders(<ContactChannels />);

    expect(screen.getByRole('link', { name: EMAIL_NAME })).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`);
  });

  it('names the e-mail link by its visible text first and then the channel, so the name contains what is drawn (WCAG 2.5.3)', () => {
    renderWithProviders(<ContactChannels />);
    const link = screen.getByRole('link', { name: EMAIL_NAME });

    expect(link.textContent).toBe(CONTACT_EMAIL);
    expect(link.getAttribute('aria-label')).toContain(link.textContent);
    expect(link.getAttribute('aria-label')?.startsWith(CONTACT_EMAIL)).toBe(true);
  });

  it('names the WhatsApp link by its visible text first and then the channel', () => {
    renderWithProviders(<ContactChannels />);
    const link = screen.getByRole('link', { name: WHATSAPP_NAME });

    expect(link.textContent).toBe(WHATSAPP_DISPLAY);
    expect(link.getAttribute('aria-label')).toBe(WHATSAPP_NAME);
    expect(WHATSAPP_NAME.startsWith(WHATSAPP_DISPLAY)).toBe(true);
  });

  it('lets the address break after the @ and nowhere else, so it never splits in the middle of a word', () => {
    renderWithProviders(<ContactChannels />);
    const link = screen.getByRole('link', { name: EMAIL_NAME });
    const breaks = link.querySelectorAll('wbr');

    expect(breaks).toHaveLength(1);
    expect(breaks[0].previousSibling?.textContent).toMatch(/@$/);
    expect(link.textContent).toBe(CONTACT_EMAIL);
  });

  it('keeps the address in one span, so the inline-flex link has a single text item and no gap at the break', () => {
    renderWithProviders(<ContactChannels />);
    const link = screen.getByRole('link', { name: EMAIL_NAME });

    // A flex container makes each child text and each element a flex item: the wbr must not be one of them.
    expect(link.childNodes).toHaveLength(1);
    const span = link.firstElementChild as HTMLElement;
    expect(span.tagName).toBe('SPAN');
    expect(span.querySelectorAll('wbr')).toHaveLength(1);
    expect(span.textContent).toBe(CONTACT_EMAIL);
  });

  it('keeps the digits of the number together, so the only break in it is after the area code', () => {
    renderWithProviders(<ContactChannels />);
    const link = screen.getByRole('link', { name: WHATSAPP_NAME });
    const [areaCode, digits] = WHATSAPP_DISPLAY.split(' ');
    const nowrap = Array.from(link.querySelectorAll('span')).find((span) =>
      span.classList.contains('whitespace-nowrap'),
    );

    expect(nowrap?.textContent).toBe(digits);
    expect(digits).toMatch(/-/);
    expect(link.textContent).toBe(WHATSAPP_DISPLAY);
    expect(link.textContent?.startsWith(`${areaCode} `)).toBe(true);
    // One text item (the span with the number) and the icon: the number is not split into flex items of its own.
    expect(link.childNodes).toHaveLength(2);
    expect(link.lastElementChild?.tagName.toLowerCase()).toBe('svg');
  });

  it('opens WhatsApp from the shared constants, in a new tab that a screen reader is told about', () => {
    renderWithProviders(<ContactChannels />);
    const link = screen.getByRole('link', { name: WHATSAPP_NAME });

    expect(link).toHaveAttribute('href', whatsappUrl(WHATSAPP_GREETING));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAccessibleDescription(NEW_TAB_HINT);
  });

  it('draws the WhatsApp icon hidden from assistive tech, in the text color and not in green', () => {
    renderWithProviders(<ContactChannels />);
    const icon = screen.getByRole('link', { name: WHATSAPP_NAME }).querySelector('svg');

    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon?.getAttribute('class') ?? '').not.toMatch(/green|emerald|zinc/);
  });

  it('gives each link the ink focus ring of a light surface (the 44px size is measured in the browser by the page contract)', () => {
    renderWithProviders(<ContactChannels />);
    const links = screen.getAllByRole('link');

    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveClass('vn-focus-ring-ink');
    }
  });

  it('centres the place in its 44px row with flex, not with a grid alignment that a block does not honour', () => {
    renderWithProviders(<ContactChannels />);
    const place = screen.getByText(contactCopy.channels.locationValue);

    expect(place).toHaveClass('flex', 'items-center', 'min-h-11');
    expect(place.className).not.toMatch(/content-center/);
  });

  it('keeps the word of the old product out of the card', () => {
    const { container } = renderWithProviders(<ContactChannels />);

    expect(container.textContent).not.toMatch(/chat[\s-]?bot/i);
  });

  it('writes no wa.me address and no phone number in its source', () => {
    const source = readFileSync(resolve(__dirname, 'ContactChannels.tsx'), 'utf8');

    expect(source).not.toMatch(/wa\.me/);
    expect(source).not.toMatch(/\d{4}-?\d{4}/);
  });
});
