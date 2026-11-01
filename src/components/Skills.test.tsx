import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import Skills from './Skills';

describe('Skills (the stack block of /sobre)', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('names the heading "Stack tecnológica" once, in sentence case', () => {
    renderWithProviders(<Skills />);

    expect(screen.getByRole('heading', { level: 2, name: 'Stack tecnológica' })).toBeInTheDocument();
    expect(screen.queryByText('Stack Tecnológica')).toBeNull();
  });

  it('says what the stack is for without the "soluções completas" filler', () => {
    renderWithProviders(<Skills />);

    expect(screen.getByText('Da automação de fluxos às interfaces rápidas.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Soluções completas/);
  });

  it('keeps the lead and the category notes at readable contrast, and the big numerals out of the reading order', () => {
    renderWithProviders(<Skills />);

    for (const line of [screen.getByText('Da automação de fluxos às interfaces rápidas.'), screen.getByText('Fluxos automáticos e agentes de IA.')]) {
      expect(line.className).not.toMatch(/zinc-[3-5]00/);
    }
    const numerals = ['01', '02', '03'].map((numeral) => screen.getByText(numeral, { ignore: '[hidden]' }));
    for (const numeral of numerals) expect(numeral).toHaveAttribute('aria-hidden', 'true');
  });
});
