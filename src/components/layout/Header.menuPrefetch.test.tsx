import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { Header } from './Header';

// The loader is the network: its calls are the requests for the code of the menu.
const requests = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('./menuLoader', () => ({ loadMobileMenu: requests.load }));

describe('Header prefetch of the menu code', () => {
  beforeEach(() => {
    requests.load.mockReset();
    requests.load.mockResolvedValue({ default: () => null });
  });

  it('requests nothing until the button is touched', () => {
    renderWithProviders(<Header />);

    expect(requests.load).not.toHaveBeenCalled();
  });

  it('requests the code when the pointer reaches the button, before any tap', () => {
    renderWithProviders(<Header />);

    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Menu' }));

    expect(requests.load).toHaveBeenCalledTimes(1);
  });

  it('requests the code when the button gets the focus, before any tap (a keyboard user)', () => {
    renderWithProviders(<Header />);

    fireEvent.focus(screen.getByRole('button', { name: 'Menu' }));

    expect(requests.load).toHaveBeenCalledTimes(1);
  });
});
