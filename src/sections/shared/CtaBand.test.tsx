import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NEW_TAB_HINT } from '../../components/ui/NewTabHint';
import { WHATSAPP_NUMBER, whatsappUrl } from '../../lib/constants';
import { findAccentElements } from '../../test/accent';
import { renderWithProviders } from '../../test/render';
import { CtaBand } from './CtaBand';

const HEADING = 'Não sabe por onde começar?';
const BODY = 'Na consulta gratuita a gente identifica qual serviço resolve o seu gargalo.';
const MESSAGE = 'Olá! Vim pelo site da VN One e quero ajuda para escolher um serviço.';
const CTA = { label: 'Agenda uma consulta gratuita', to: '/contato' };

const sectionOf = (container: HTMLElement): HTMLElement => container.querySelector('section') as HTMLElement;

describe('CtaBand', () => {
  it('is the black section named by its h2', () => {
    const { container } = renderWithProviders(<CtaBand heading={HEADING} body={BODY} cta={CTA} />);
    const heading = screen.getByRole('heading', { level: 2, name: HEADING });

    expect(sectionOf(container)).toHaveAttribute('data-tone', 'black');
    expect(sectionOf(container)).toHaveAttribute('aria-labelledby', heading.id);
    expect(screen.getByRole('region', { name: HEADING })).toBe(sectionOf(container));
    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });

  it('shows the body and puts the dark scan grid behind the content', () => {
    const { container } = renderWithProviders(<CtaBand heading={HEADING} body={BODY} cta={CTA} />);

    expect(screen.getByText(BODY)).toBeInTheDocument();
    expect(container.querySelector('.vn-scan-grid--dark')).not.toBeNull();
  });

  it('points the primary link at the route given, as a router link', () => {
    renderWithProviders(<CtaBand heading={HEADING} body={BODY} cta={CTA} />);
    const link = screen.getByRole('link', { name: CTA.label });

    expect(link).toHaveAttribute('href', '/contato');
    expect(link).not.toHaveAttribute('target');
    expect(link).toHaveClass('bg-vn-white', 'text-vn-black');
  });

  it('draws the WhatsApp button only when a message comes, with the official number, in a new tab', () => {
    renderWithProviders(<CtaBand heading={HEADING} body={BODY} cta={CTA} whatsappMessage={MESSAGE} />);
    const link = screen.getByRole('link', { name: 'Falar no WhatsApp' });

    expect(link.getAttribute('href')).toBe(whatsappUrl(MESSAGE));
    expect(link.getAttribute('href')?.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(true);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')?.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    expect(link).not.toHaveClass('bg-vn-accent');
  });

  it('describes the new tab link by the hint, which is in the page and hidden', () => {
    const { container } = renderWithProviders(
      <CtaBand heading={HEADING} body={BODY} cta={CTA} whatsappMessage={MESSAGE} />,
    );
    const link = screen.getByRole('link', { name: 'Falar no WhatsApp' });
    const hint = container.querySelector(`#${CSS.escape(link.getAttribute('aria-describedby') as string)}`);

    expect(hint).toHaveTextContent(NEW_TAB_HINT);
    expect(hint).toHaveAttribute('hidden');
  });

  it('has no WhatsApp button without a message', () => {
    const { container } = renderWithProviders(<CtaBand heading={HEADING} body={BODY} cta={CTA} />);

    expect(screen.queryByRole('link', { name: 'Falar no WhatsApp' })).toBeNull();
    expect(container.querySelector('a[href*="wa.me"]')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('ends the heading with the cursor in one block with the last word, hidden from assistive tech', () => {
    renderWithProviders(<CtaBand heading={HEADING} body={BODY} cta={CTA} />);
    const heading = screen.getByRole('heading', { level: 2 });
    const nowrap = heading.querySelector('.whitespace-nowrap') as HTMLElement;
    const cursor = nowrap.querySelector('.vn-cursor') as HTMLElement;

    expect(nowrap).toHaveTextContent('começar?');
    expect(cursor).toHaveAttribute('aria-hidden', 'true');
    expect(heading.className).toContain('calc(100cqi/7.2)');
    expect(heading.closest('.\\@container')).not.toBeNull();
  });

  it('budgets the width of the last word for 12 letters plus the cursor, so a long word does not push a 280px page sideways', () => {
    renderWithProviders(<CtaBand heading="Pronto para automatizar?" body={BODY} cta={CTA} />);
    const heading = screen.getByRole('heading', { level: 2 });
    const budgetEm = Number(/calc\(100cqi\/([\d.]+)\)/.exec(heading.className)?.[1]);
    // "automatizar?" is 12 characters at about 0.5em each, plus the margin and the width of the cursor.
    const lastWordEm = 12 * 0.5 + 0.2 + 0.5;

    expect(heading.querySelector('.whitespace-nowrap')).toHaveTextContent('automatizar?');
    expect(budgetEm).toBeGreaterThanOrEqual(lastWordEm);
  });

  it('has exactly one accent element, the cursor, with or without WhatsApp', () => {
    const { container } = renderWithProviders(
      <CtaBand heading={HEADING} body={BODY} cta={CTA} whatsappMessage={MESSAGE} />,
    );
    const accents = findAccentElements(sectionOf(container));

    expect(accents).toHaveLength(1);
    expect(accents[0]).toHaveClass('vn-cursor', 'bg-vn-accent');
    expect(sectionOf(container).querySelectorAll('.bg-vn-accent')).toHaveLength(1);
  });

  it('uses the id given to the section', () => {
    const { container } = renderWithProviders(<CtaBand heading={HEADING} body={BODY} cta={CTA} id="fecha" />);

    expect(sectionOf(container)).toHaveAttribute('id', 'fecha');
  });

  it('reveals through one group for its one container', () => {
    const { container } = renderWithProviders(<CtaBand heading={HEADING} body={BODY} cta={CTA} />);

    expect(container.querySelectorAll('[data-reveal-group]')).toHaveLength(1);
  });
});
