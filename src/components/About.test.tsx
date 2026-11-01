import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import { NEW_TAB_HINT } from './ui/NewTabHint';
import { About } from './About';

describe('About', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('tells a screen reader that the CV opens in a new tab, without changing the name of the link', () => {
    renderWithProviders(<About />);

    const link = screen.getByRole('link', { name: 'Baixa o currículo' });

    expect(link).toHaveAccessibleDescription(NEW_TAB_HINT);
  });

  it('says where the work happens like the footer does', () => {
    renderWithProviders(<About />);

    expect(screen.getByText('Recife e remoto')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Remoto Global/);
  });

  it('does not promise that no project takes months, since the web system takes one to two', () => {
    renderWithProviders(<About />);

    expect(document.body.textContent).not.toMatch(/projetos de meses/);
  });

  it('ends every specialty line with a period, and drops the "foco total" filler', () => {
    renderWithProviders(<About />);

    expect(screen.getByText(/LLMs e agentes inteligentes integrados às operações do negócio\.$/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Foco total|forma rápida e medida/);
  });

  it('keeps its small gray lines off the low contrast zincs', () => {
    renderWithProviders(<About />);

    for (const line of [screen.getByText('Recife e remoto'), screen.getByText(/Fluxos automáticos que tiram/)]) {
      expect(line.className).not.toMatch(/zinc-[3-5]00/);
    }
  });

  it('keeps the intro text readable on white: zinc 500 is 4.8 to 1 at best, the dark gray is 7.5', () => {
    renderWithProviders(<About />);

    const intro = screen.getByText(/Especialista em montar fluxos/).parentElement as HTMLElement;

    expect(intro.className).not.toMatch(/zinc-[3-5]00/);
    expect(intro).toHaveClass('text-vn-gray-dark');
  });

  it('puts the specialties title at h2 and each specialty at h3, so nothing skips a level below the h1', () => {
    renderWithProviders(<About />);

    expect(screen.getByRole('heading', { level: 2, name: 'Minhas Especialidades' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Automação de Processos' })).toBeInTheDocument();
    expect(screen.queryAllByRole('heading', { level: 4 })).toHaveLength(0);
  });
});
