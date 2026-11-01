import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { Kicker } from './Kicker';

function findRule(label: HTMLElement): Element | null {
  return label.parentElement?.querySelector('span[aria-hidden="true"]') ?? null;
}

describe('Kicker', () => {
  it('renders its text in mono caps with wide tracking', () => {
    renderWithProviders(<Kicker>servicos</Kicker>);

    expect(screen.getByText('servicos').parentElement).toHaveClass(
      'font-mono',
      'uppercase',
      'tracking-[.18em]',
      'text-xs',
    );
  });

  it('renders the 64 by 3 rule below the text at 40% opacity', () => {
    renderWithProviders(<Kicker>servicos</Kicker>);

    const rule = findRule(screen.getByText('servicos'));
    expect(rule).not.toBeNull();
    expect(rule).toHaveClass('block', 'h-[3px]', 'w-[64px]', 'bg-current', 'opacity-40');
  });

  it('hides the rule from assistive tech', () => {
    renderWithProviders(<Kicker>servicos</Kicker>);

    expect(findRule(screen.getByText('servicos'))).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses ink text on light sections by default', () => {
    renderWithProviders(<Kicker>servicos</Kicker>);

    expect(screen.getByText('servicos').parentElement).toHaveClass('text-vn-ink');
  });

  it('uses white text on dark sections', () => {
    renderWithProviders(<Kicker tone="dark">servicos</Kicker>);

    const kicker = screen.getByText('servicos').parentElement;
    expect(kicker).toHaveClass('text-vn-white');
    expect(kicker).not.toHaveClass('text-vn-ink');
  });

  it('merges a consumer className', () => {
    renderWithProviders(<Kicker className="mb-6">servicos</Kicker>);

    expect(screen.getByText('servicos').parentElement).toHaveClass('mb-6', 'font-mono');
  });
});
