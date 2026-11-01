import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SITE } from '../../lib/site';
import { RouteAnnouncer } from './RouteAnnouncer';

const FRAME_MS = 16;
const MAX_WAIT_MS = 3000;
const HOME_TITLE = SITE.title;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  document.title = 'Início | VN One';
});

afterEach(() => {
  vi.useRealTimers();
});

const status = () => screen.getByRole('status');

describe('RouteAnnouncer', () => {
  it('is a polite status region that only screen readers perceive, and it is empty on the first load', () => {
    render(<RouteAnnouncer pathname="/" />);

    expect(status()).toBeEmptyDOMElement();
    expect(status()).toHaveClass('sr-only');
    expect(status()).not.toHaveAttribute('aria-live', 'assertive');
  });

  it('announces the title of the new page once it has changed, after the route changed', () => {
    const { rerender } = render(<RouteAnnouncer pathname="/" />);

    rerender(<RouteAnnouncer pathname="/sobre" />);
    expect(status()).toBeEmptyDOMElement();
    // The new page is lazy: its title arrives a little after the route changes.
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 5);
    });
    expect(status()).toBeEmptyDOMElement();
    document.title = 'Sobre | VN One';
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 2);
    });

    expect(status()).toHaveTextContent('Sobre | VN One');
  });

  it('announces the title it has after the wait, when a new page keeps the same title', () => {
    const { rerender } = render(<RouteAnnouncer pathname="/" />);

    rerender(<RouteAnnouncer pathname="/outra" />);
    act(() => {
      vi.advanceTimersByTime(MAX_WAIT_MS + FRAME_MS * 2);
    });

    expect(status()).toHaveTextContent('Início | VN One');
  });

  it('does not announce the home title for another route, nor an empty title, while the new page loads', () => {
    document.title = 'Sobre | VN One';
    const { rerender } = render(<RouteAnnouncer pathname="/sobre" />);

    rerender(<RouteAnnouncer pathname="/servicos" />);
    // The old page left and the new one is still loading: the head shows nothing, or the static home title.
    document.title = '';
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 3);
    });
    document.title = HOME_TITLE;
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 3);
    });
    expect(status()).toBeEmptyDOMElement();

    document.title = 'Serviços | VN One';
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 2);
    });

    expect(status()).toHaveTextContent('Serviços | VN One');
  });

  it('announces the home title when the route is the home', () => {
    document.title = 'Sobre | VN One';
    const { rerender } = render(<RouteAnnouncer pathname="/sobre" />);

    rerender(<RouteAnnouncer pathname="/" />);
    document.title = HOME_TITLE;
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 2);
    });

    expect(status()).toHaveTextContent(HOME_TITLE);
  });

  it('says nothing when the pathname stays the same, as with a hash change or a plain re-render', () => {
    const { rerender } = render(<RouteAnnouncer pathname="/" />);

    document.title = 'Mudou | VN One';
    rerender(<RouteAnnouncer pathname="/" />);
    act(() => {
      vi.advanceTimersByTime(MAX_WAIT_MS * 2);
    });

    expect(status()).toBeEmptyDOMElement();
  });

  it('announces once under StrictMode and leaves no frame running after unmount', () => {
    const { rerender, unmount } = render(<RouteAnnouncer pathname="/" />, { reactStrictMode: true });

    rerender(<RouteAnnouncer pathname="/sobre" />);
    document.title = 'Sobre | VN One';
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 3);
    });
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(status()).toHaveTextContent('Sobre | VN One');

    rerender(<RouteAnnouncer pathname="/servicos" />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the old announcement as soon as the next route starts, so the same title is spoken again', () => {
    const { rerender } = render(<RouteAnnouncer pathname="/" />);
    rerender(<RouteAnnouncer pathname="/sobre" />);
    document.title = 'Sobre | VN One';
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 3);
    });
    expect(status()).toHaveTextContent('Sobre | VN One');

    rerender(<RouteAnnouncer pathname="/" />);

    expect(status()).toBeEmptyDOMElement();
  });
});
