import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { Section } from './Section';

describe('Section', () => {
  it('renders a section element with its children', () => {
    renderWithProviders(
      <Section>
        <p>conteudo</p>
      </Section>,
    );

    const section = screen.getByText('conteudo').closest('section');
    expect(section).not.toBeNull();
  });

  it('defaults to the cream tone', () => {
    renderWithProviders(<Section>x</Section>);

    const section = screen.getByText('x');
    expect(section).toHaveAttribute('data-tone', 'cream');
    expect(section).toHaveClass('bg-vn-cream', 'text-vn-ink');
  });

  it('sets the white tone background and text', () => {
    renderWithProviders(<Section tone="white">x</Section>);

    const section = screen.getByText('x');
    expect(section).toHaveAttribute('data-tone', 'white');
    expect(section).toHaveClass('bg-vn-white', 'text-vn-ink');
  });

  it('sets the black tone background and text', () => {
    renderWithProviders(<Section tone="black">x</Section>);

    const section = screen.getByText('x');
    expect(section).toHaveAttribute('data-tone', 'black');
    expect(section).toHaveClass('bg-vn-black', 'text-vn-white');
  });

  it('uses the fluid vertical padding', () => {
    renderWithProviders(<Section>x</Section>);

    expect(screen.getByText('x')).toHaveClass('py-[clamp(4rem,3rem+5vw,9rem)]');
  });

  it('becomes a stacking context so a ScanGrid can sit behind the content', () => {
    renderWithProviders(<Section>x</Section>);

    expect(screen.getByText('x')).toHaveClass('relative', 'isolate');
  });

  it('turns labelledBy into aria-labelledby', () => {
    renderWithProviders(
      <Section labelledBy="titulo">
        <h2 id="titulo">Titulo</h2>
      </Section>,
    );

    const region = screen.getByRole('region', { name: 'Titulo' });
    expect(region).toHaveAttribute('aria-labelledby', 'titulo');
  });

  it('omits aria-labelledby when labelledBy is not given', () => {
    renderWithProviders(<Section>x</Section>);

    expect(screen.getByText('x')).not.toHaveAttribute('aria-labelledby');
  });

  it('forwards id and merges className', () => {
    renderWithProviders(
      <Section id="servicos" className="min-h-dvh">
        x
      </Section>,
    );

    const section = screen.getByText('x');
    expect(section).toHaveAttribute('id', 'servicos');
    expect(section).toHaveClass('min-h-dvh', 'bg-vn-cream');
  });
});
