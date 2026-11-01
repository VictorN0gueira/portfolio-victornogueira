import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeCopy } from '../data/homeCopy';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import ROICalculator from './ROICalculator';

describe('ROICalculator (the old calculator of /contato)', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('states the real basis of the estimate, the same as the home simulator, and no claim about past projects', () => {
    renderWithProviders(<ROICalculator onQuoteRequest={() => undefined} />);

    // Testing Library collapses the non breaking spaces of the head count list into plain ones.
    const note = homeCopy.roi.note.replace(/\u00a0/g, ' ');
    expect(screen.getByText(new RegExp(note.slice(0, 40)))).toBeInTheDocument();
    expect(screen.getByText(/Considera 80% do tempo automatizado/)).toHaveTextContent(note);
    expect(screen.getByText(/Consulta gratuita e sem compromisso/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/baseada em projetos/i);
  });

  it('keeps the formal imperative out of its header', () => {
    renderWithProviders(<ROICalculator onQuoteRequest={() => undefined} />);

    expect(screen.getByText('Calcula o impacto')).toBeInTheDocument();
    expect(screen.getByText('Descobre o custo real dos seus processos manuais e quanto você pode recuperar.')).toBeInTheDocument();
  });

  it('sizes the two big figures down below 360 px so "R$ 249,6 mi" stays inside the card', () => {
    renderWithProviders(<ROICalculator onQuoteRequest={() => undefined} />);

    const figures = document.querySelectorAll('p.tabular-nums.leading-none');
    expect(figures).toHaveLength(2);
    for (const figure of figures) {
      expect(figure).toHaveClass('text-3xl', 'xs:text-4xl', 'md:text-5xl');
    }
  });
});

describe('ROICalculator team size', () => {
  const TEAM_LABELS = ['1 pessoa', '2 a 3 pessoas', '4 a 10 pessoas', 'mais de 10 pessoas'];

  beforeEach(() => {
    stubMatchMedia();
  });

  it('is a radio group named by its question, with the current choice marked as checked', () => {
    renderWithProviders(<ROICalculator onQuoteRequest={() => undefined} />);

    const group = screen.getByRole('radiogroup', { name: 'Pessoas que executam essa tarefa' });
    const radios = within(group).getAllByRole('radio');

    expect(radios.map((radio) => radio.closest('label')?.textContent)).toEqual(TEAM_LABELS);
    expect(screen.getByRole('radio', { name: '2 a 3 pessoas' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '1 pessoa' })).not.toBeChecked();
  });

  it('moves the check with a click and updates the figures', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ROICalculator onQuoteRequest={() => undefined} />);
    const before = document.querySelectorAll('p.tabular-nums.leading-none')[0].textContent;

    await user.click(screen.getByText('4 a 10 pessoas'));

    expect(screen.getByRole('radio', { name: '4 a 10 pessoas' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '2 a 3 pessoas' })).not.toBeChecked();
    await waitFor(() => expect(document.querySelectorAll('p.tabular-nums.leading-none')[0].textContent).not.toBe(before));
  });

  it('is one tab stop: arrows move the choice, Home and End jump to the first and the last', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ROICalculator onQuoteRequest={() => undefined} />);

    await user.click(screen.getByRole('radio', { name: '2 a 3 pessoas' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '4 a 10 pessoas' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '4 a 10 pessoas' })).toHaveFocus();

    await user.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'mais de 10 pessoas' })).toBeChecked();
    await user.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: '1 pessoa' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '1 pessoa' })).toHaveFocus();
  });
});

describe('ROICalculator motion', () => {
  it('shows the new figures at once, with no counting frames, when the visitor asked for reduced motion', async () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    const user = userEvent.setup();
    renderWithProviders(<ROICalculator onQuoteRequest={() => undefined} />);

    await user.click(screen.getByRole('radio', { name: 'mais de 10 pessoas' }));

    // 12 h x 15 people x R$ 50 x 52 weeks = R$ 468.000 a year, shown in the same render as the click.
    expect(screen.getByText(/468\.000 por ano/)).toBeInTheDocument();
    expect(raf).not.toHaveBeenCalled();
    raf.mockRestore();
  });

  it('still counts up to the new figure when motion is welcome', async () => {
    stubMatchMedia();
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    const user = userEvent.setup();
    renderWithProviders(<ROICalculator onQuoteRequest={() => undefined} />);

    await user.click(screen.getByRole('radio', { name: 'mais de 10 pessoas' }));

    expect(raf).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText(/468\.000 por ano/)).toBeInTheDocument());
    raf.mockRestore();
  });
});
