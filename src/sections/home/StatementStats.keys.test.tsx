import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoConsoleOutput } from '../../test/consoleGuard';
import { renderWithProviders } from '../../test/render';
import { StatementStats } from './StatementStats';

// R:M25: two stats that show the same number (a copy edit can do that) must not share a React key. The key is the id
// of the stat, never the displayed text. React reports a repeated key through console.error, which the guard fails on.
vi.mock('../../data/stats', () => ({
  stats: [
    { id: 'first-stat', value: '10+', label: 'Primeira medida', description: 'Primeira descrição' },
    { id: 'second-stat', value: '10+', label: 'Segunda medida', description: 'Segunda descrição' },
  ],
}));

expectNoConsoleOutput();

describe('StatementStats keys', () => {
  it('renders two stats with the same displayed number without a duplicate key warning', () => {
    renderWithProviders(<StatementStats />);

    expect(screen.getByText('Primeira medida')).toBeInTheDocument();
    expect(screen.getByText('Segunda medida')).toBeInTheDocument();
  });
});
