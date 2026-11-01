import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { Container } from './Container';

describe('Container', () => {
  it('centers content with the 1216px max width and responsive gutters', () => {
    renderWithProviders(<Container>conteudo</Container>);

    expect(screen.getByText('conteudo')).toHaveClass(
      'mx-auto',
      'w-full',
      'max-w-[1216px]',
      'px-4',
      'xs:px-5',
      'md:px-12',
    );
  });

  it('merges a consumer className', () => {
    renderWithProviders(<Container className="relative">conteudo</Container>);

    expect(screen.getByText('conteudo')).toHaveClass('relative', 'max-w-[1216px]');
  });
});
