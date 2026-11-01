import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { Heading } from './Heading';

describe('Heading', () => {
  it('renders an h2 by default', () => {
    renderWithProviders(<Heading>titulo</Heading>);

    expect(screen.getByRole('heading', { level: 2, name: 'titulo' })).toBeInTheDocument();
  });

  it.each([
    ['h1', 1],
    ['h2', 2],
    ['h3', 3],
    ['h4', 4],
  ] as const)('renders the requested %s tag', (as, level) => {
    renderWithProviders(<Heading as={as}>titulo</Heading>);

    expect(screen.getByRole('heading', { level })).toHaveTextContent('titulo');
  });

  it('lowercases through CSS, tightens tracking and protects against long words', () => {
    renderWithProviders(<Heading>Titulo</Heading>);

    expect(screen.getByRole('heading')).toHaveClass(
      'lowercase',
      'tracking-[-0.03em]',
      'text-balance',
      'break-words',
      'font-display',
      'font-bold',
    );
  });

  it('keeps the original casing in the DOM text', () => {
    renderWithProviders(<Heading>Titulo Em Caixa Mista</Heading>);

    expect(screen.getByRole('heading')).toHaveTextContent('Titulo Em Caixa Mista');
  });

  it('uses the fluid l size by default', () => {
    renderWithProviders(<Heading>titulo</Heading>);

    expect(screen.getByRole('heading')).toHaveClass(
      'text-[length:clamp(1.875rem,1rem+4vw,4rem)]',
      'leading-[.98]',
    );
  });

  it('uses the fluid xl size', () => {
    renderWithProviders(<Heading size="xl">titulo</Heading>);

    expect(screen.getByRole('heading')).toHaveClass(
      'text-[length:clamp(2.25rem,1rem+6vw,6rem)]',
      'leading-[.95]',
    );
  });

  it('uses the fluid m size', () => {
    renderWithProviders(<Heading size="m">titulo</Heading>);

    expect(screen.getByRole('heading')).toHaveClass('text-[length:clamp(1.5rem,1.2rem+1vw,1.75rem)]');
  });

  it('does not set a color so the Section decides', () => {
    renderWithProviders(<Heading>titulo</Heading>);

    expect(screen.getByRole('heading').className).not.toMatch(/(^|\s)text-vn-/);
  });

  it('forwards id and merges className', () => {
    renderWithProviders(
      <Heading id="hero-titulo" className="mb-6">
        titulo
      </Heading>,
    );

    const heading = screen.getByRole('heading');
    expect(heading).toHaveAttribute('id', 'hero-titulo');
    expect(heading).toHaveClass('mb-6', 'lowercase');
  });
});
