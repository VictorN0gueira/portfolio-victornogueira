import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { faqs } from '../data/faqs';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import FAQ from './FAQ';

describe('FAQ (the old accordion of /contato)', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('names its heading "Perguntas" once for assistive technology', () => {
    renderWithProviders(<FAQ />);

    expect(screen.getByRole('heading', { level: 2, name: 'Perguntas' })).toBeInTheDocument();
  });

  it('points every question at its answer with aria-controls, and the answer is there while it is open', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FAQ />);
    const button = screen.getByRole('button', { name: faqs[0].question });
    const panelId = button.getAttribute('aria-controls');

    expect(panelId).toBeTruthy();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(panelId as string)).toBeNull();

    await user.click(button);

    const panel = document.getElementById(panelId as string) as HTMLElement;
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveTextContent(faqs[0].answer);
    expect(screen.getByRole('region', { name: faqs[0].question })).toBe(panel);
  });

  it('gives each question its own panel id', () => {
    renderWithProviders(<FAQ />);

    const ids = screen.getAllByRole('button').map((button) => button.getAttribute('aria-controls'));

    expect(new Set(ids).size).toBe(faqs.length);
  });

  it('keeps the kicker and the answers off the low contrast grays', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FAQ />);
    await user.click(screen.getByRole('button', { name: faqs[0].question }));

    expect(screen.getByText('Dúvidas frequentes').className).not.toMatch(/zinc-[3-6]00/);
    expect(screen.getByText(faqs[0].answer).className).not.toMatch(/zinc-[3-6]00/);
  });
});
