import { act, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { homeCopy } from '../../data/homeCopy';
import { renderWithProviders } from '../../test/render';
import { UseCaseTabs } from './UseCaseTabs';

export const ROTATE_MS = 4200;
export const A11Y_STORAGE_KEY = 'a11y-preferences';
export const TAB_NAMES = ['Atendimento', 'Comercial', 'Financeiro', 'Operações'] as const;
export const { useCases: copy } = homeCopy;

export function getTab(name: string): HTMLElement {
  return screen.getByRole('tab', { name });
}

export function getSelectedName(): string | undefined {
  return screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true')?.textContent ?? undefined;
}

export function getPauseToggle(): HTMLElement {
  return screen.getByRole('button', { name: copy.pause });
}

export function getTablist(): HTMLElement {
  return screen.getByRole('tablist', { name: copy.tablistLabel });
}

export function getPanelGroup(): HTMLElement {
  return screen.getByRole('tabpanel').querySelector('[data-reveal-group]') as HTMLElement;
}

export function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

export function renderTabs() {
  return renderWithProviders(<UseCaseTabs />);
}
