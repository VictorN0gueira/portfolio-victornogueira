import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { flowPanel } from '../../data/heroFlows';
import { HEADER_HEIGHT, HEADER_HEIGHT_LANDSCAPE, HEADER_LANDSCAPE_LIFT } from '../../components/layout/Header';
import { homeCopy } from '../../data/homeCopy';
import { findAccentElements } from '../../test/accent';
import { renderWithProviders } from '../../test/render';
import { HeroSection } from './HeroSection';

const TASK_TRIGGER = 'Tarefa: planilha e WhatsApp. Alterar';

function renderHero() {
  const user = userEvent.setup();
  const view = renderWithProviders(<HeroSection />);
  const section = view.container.querySelector('section') as HTMLElement;
  return { user, section, ...view };
}

async function chooseTask(user: ReturnType<typeof userEvent.setup>, optionName: string) {
  await user.click(screen.getByRole('button', { name: TASK_TRIGGER }));
  const list = await screen.findByRole('listbox');
  await user.click(within(list).getByRole('option', { name: optionName }));
}

describe('HeroSection structure', () => {
  it('renders one h1, which is the interactive sentence', () => {
    renderHero();

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Sua equipe perde 10 horas por semana com planilha e WhatsApp.');
  });

  it('shows the kicker, the supporting paragraph and the fine print from the copy file', () => {
    renderHero();

    expect(screen.getByText(homeCopy.hero.kicker)).toBeInTheDocument();
    expect(screen.getByText(homeCopy.hero.sub)).toBeInTheDocument();
    expect(screen.getByText(homeCopy.hero.finePrint)).toBeInTheDocument();
  });

  it('has the primary CTA to the contact anchor and the secondary one to the method anchor', () => {
    renderHero();

    expect(screen.getByRole('link', { name: 'Quero automatizar' })).toHaveAttribute('href', '/#contato');
    expect(screen.getByRole('link', { name: 'Ver como funciona' })).toHaveAttribute('href', '/#metodo');
  });

  it('draws the primary CTA in ink and the secondary one as an outline, never in the accent', () => {
    renderHero();

    expect(screen.getByRole('link', { name: 'Quero automatizar' })).toHaveClass('bg-vn-ink', 'text-vn-white');
    expect(screen.getByRole('link', { name: 'Ver como funciona' })).toHaveClass('border', 'bg-transparent');
  });

  it('shows the automation panel with its title and the first row of the default task', () => {
    renderHero();

    expect(screen.getByText(flowPanel.title)).toBeInTheDocument();
    expect(screen.getByText('Pedido chega no WhatsApp')).toBeInTheDocument();
  });

  it('puts the annotation directly under the sentence, between it and the paragraph, hidden below lg', () => {
    const { section } = renderHero();

    const note = screen.getByText(homeCopy.hero.annotation).closest('[data-hero-annotation]') as HTMLElement;
    expect(note).toHaveClass('hidden', 'lg:flex');
    const sentenceColumn = screen.getByRole('heading', { level: 1 }).closest('.max-w-5xl') as HTMLElement;
    const sub = screen.getByText(homeCopy.hero.sub);
    const slot = note.parentElement as HTMLElement;
    expect(section.contains(note)).toBe(true);
    expect(sentenceColumn.nextElementSibling).toBe(slot);
    expect(slot.nextElementSibling).toBe(sub);
  });

  it('right aligns the annotation under the sentence, so its arrow rises to the numbers', () => {
    renderHero();

    const slot = screen.getByText(homeCopy.hero.annotation).closest('[data-hero-annotation]')?.parentElement as HTMLElement;
    expect(slot).toHaveClass('max-w-5xl', 'lg:flex', 'lg:justify-end');
  });

  it('draws the arrow as it is, rising toward the sentence: nothing flips or rotates it', () => {
    const { section } = renderHero();

    expect(section.outerHTML).not.toMatch(/scale-y|-scale-|\[&_svg\]/);
    const note = screen.getByText(homeCopy.hero.annotation).closest('[data-hero-annotation]') as HTMLElement;
    for (let node: HTMLElement | null = note; node && node !== section; node = node.parentElement) {
      expect(node.className).not.toMatch(/scale|rotate/);
      expect(node.getAttribute('style') ?? '').not.toMatch(/scale|rotate/);
    }
    expect(note.querySelector('svg')?.getAttribute('style')).toBeNull();
  });

  it('orders the content as kicker, sentence, annotation, paragraph, CTAs, fine print, panel', () => {
    renderHero();

    const ordered = [
      screen.getByText(homeCopy.hero.kicker),
      screen.getByRole('heading', { level: 1 }),
      screen.getByText(homeCopy.hero.annotation),
      screen.getByText(homeCopy.hero.sub),
      screen.getByRole('link', { name: 'Quero automatizar' }),
      screen.getByText(homeCopy.hero.finePrint),
      screen.getByText(flowPanel.title),
    ];
    ordered.slice(1).forEach((node, index) => {
      expect(ordered[index].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});

describe('HeroSection card', () => {
  it('is a rounded cream card inset from the screen edges, growing from 8px to 24px', () => {
    const { section } = renderHero();

    expect(section).toHaveClass('bg-vn-cream', 'rounded-[clamp(24px,4vw,40px)]');
    expect(section).toHaveClass('mx-2', 'min-[360px]:mx-3', 'md:mx-6');
  });

  it('clips its own corners and the grid, so nothing of the tilted panel widens the page', () => {
    const { section } = renderHero();

    expect(section).toHaveClass('overflow-hidden', 'relative', 'isolate');
  });

  it('holds the scan grid, hidden from assistive tech, as a decoration', () => {
    const { section } = renderHero();

    expect(section.querySelector('.vn-scan-grid')).toHaveAttribute('aria-hidden', 'true');
  });

  it('clears the fixed header and the notch at the top, in rem, with the notch inset and the breathing room', () => {
    const { section } = renderHero();

    const content = Array.from(section.querySelectorAll<HTMLElement>('div')).find((node) =>
      node.style.getPropertyValue('--hero-top'),
    ) as HTMLElement;
    const top = content.style.getPropertyValue('--hero-top');
    expect(top).toContain('max(12px, env(safe-area-inset-top))');
    expect(top).toContain(HEADER_HEIGHT);
    expect(top).toContain('clamp(2rem, 1rem + 4vw, 5rem)');
    expect(top).not.toContain('58px');
    expect(content).toHaveClass('pt-[var(--hero-top)]');
  });

  it('clears the shorter, lifted header of a phone held sideways with its own offset', () => {
    const { section } = renderHero();

    const content = Array.from(section.querySelectorAll<HTMLElement>('div')).find((node) =>
      node.style.getPropertyValue('--hero-top-landscape'),
    ) as HTMLElement;
    const top = content.style.getPropertyValue('--hero-top-landscape');
    expect(top).toContain(HEADER_HEIGHT_LANDSCAPE);
    expect(top).toContain(`- ${HEADER_LANDSCAPE_LIFT}`);
    expect(content).toHaveClass('[@media(max-height:480px)]:pt-[var(--hero-top-landscape)]');
  });

  it('has no minimum height of a whole screen, so a phone held sideways sees the panel right under the sentence', () => {
    const { section } = renderHero();

    expect(section.outerHTML).not.toMatch(/min-h-(dvh|screen|svh|lvh)|min-h-\[100/);
    expect(section.style.minHeight).toBe('');
  });

  it('gives the sentence a wide, centered column, so the longest option stays on one line', () => {
    renderHero();

    const column = screen.getByRole('heading', { level: 1 }).closest('.max-w-5xl');
    expect(column).not.toBeNull();
    expect(column?.closest('.text-center')).not.toBeNull();
  });
});

describe('HeroSection accent', () => {
  it('has exactly one element in the accent: the result pill of the sentence', () => {
    const { section } = renderHero();

    const accents = findAccentElements(section);
    expect(accents).toHaveLength(1);
    expect(accents[0]).toBe(screen.getByRole('heading', { level: 1 }).querySelector('.bg-vn-accent'));
  });

  it('still has exactly one after the task changes the panel', async () => {
    const { user, section } = renderHero();

    await chooseTask(user, 'emissão de notas');

    expect(findAccentElements(section)).toHaveLength(1);
  });

  it('notices an accent that someone adds to the panel, which keeps the check honest', () => {
    const { section } = renderHero();
    const stray = document.createElement('span');
    stray.className = 'hover:bg-vn-accent/20';
    section.appendChild(stray);
    const strayStyle = document.createElement('span');
    strayStyle.setAttribute('style', 'color: #00E5A0');
    section.appendChild(strayStyle);
    const strayPaint = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    strayPaint.setAttribute('fill', '#00E5A0');
    section.appendChild(strayPaint);

    expect(findAccentElements(section)).toHaveLength(4);
  });
});

describe('HeroSection task', () => {
  it('starts on the spreadsheet and WhatsApp task, in the sentence and in the panel', () => {
    renderHero();

    expect(screen.getByRole('button', { name: TASK_TRIGGER })).toBeInTheDocument();
    expect(screen.getByText('Planilha atualizada')).toBeInTheDocument();
  });

  it('passes the task chosen in the sentence on to the panel', async () => {
    const { user } = renderHero();

    await chooseTask(user, 'emissão de notas');

    await waitFor(() => expect(screen.getByText('Nota emitida')).toBeInTheDocument());
    expect(screen.queryByText('Planilha atualizada')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tarefa: emissão de notas. Alterar' })).toBeInTheDocument();
  });

  it('restarts the panel from the first row when the task changes', async () => {
    const { user } = renderHero();

    await chooseTask(user, 'atendimento no WhatsApp');

    const rows = within(screen.getByRole('list', { name: flowPanel.aria.rows })).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Cliente manda mensagem');
    expect(rows[0]).toHaveAttribute('data-state', 'active');
  });
});
