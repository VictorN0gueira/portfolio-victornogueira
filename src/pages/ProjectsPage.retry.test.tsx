import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/render';
import ProjectsPage from './ProjectsPage';

const state = vi.hoisted(() => ({ attempts: 0 }));

// The first import of the list fails the way a dropped connection does; the second one works.
vi.mock('../components/Projects', () => {
  state.attempts += 1;
  if (state.attempts === 1) throw new Error('Failed to fetch dynamically imported module');
  return { default: () => <p>lista carregada</p> };
});

const RETRY_WAIT_MS = 6000;

describe('ProjectsPage when the chunk of the list fails once', () => {
  it('asks for it again instead of keeping the failure, and shows the list', async () => {
    renderWithProviders(<ProjectsPage />, { route: '/projetos' });

    expect(await screen.findByText('lista carregada', {}, { timeout: RETRY_WAIT_MS })).toBeInTheDocument();
    expect(state.attempts).toBe(2);
  });
});
