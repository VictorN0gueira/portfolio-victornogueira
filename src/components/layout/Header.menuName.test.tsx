import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MENU_BUTTON_NAME } from '../../data/navigation';
import { renderWithProviders } from '../../test/render';
import { Header } from './Header';

describe('Header menu button name', () => {
  it('is the exported MENU_BUTTON_NAME, the constant the e2e helper looks for', () => {
    renderWithProviders(<Header />);

    expect(screen.getByRole('button', { name: MENU_BUTTON_NAME })).toHaveAttribute('aria-haspopup', 'dialog');
  });
});
