import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { homeCopy } from '../data/homeCopy';
import { stubMatchMedia } from '../test/matchMedia';
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
      expect(figure).toHaveClass('text-3xl', 'min-[360px]:text-4xl', 'md:text-5xl');
    }
  });
});
