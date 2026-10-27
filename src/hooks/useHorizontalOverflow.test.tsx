import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHorizontalOverflow } from './useHorizontalOverflow';

type ResizeCallback = () => void;

class ControllableResizeObserver {
  static instances: ControllableResizeObserver[] = [];
  observed: Element[] = [];
  disconnect = vi.fn();

  constructor(private readonly callback: ResizeCallback) {
    ControllableResizeObserver.instances.push(this);
  }

  observe(element: Element): void {
    this.observed.push(element);
  }

  unobserve(): void {}

  fire(): void {
    this.callback();
  }
}

function Row() {
  const ref = useRef<HTMLUListElement>(null);
  const isOverflowing = useHorizontalOverflow(ref);

  return (
    <ul ref={ref} data-testid="row" data-overflowing={isOverflowing}>
      <li>um</li>
      <li>dois</li>
    </ul>
  );
}

describe('useHorizontalOverflow', () => {
  let scrollWidth = 0;
  let clientWidth = 0;

  beforeEach(() => {
    ControllableResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', ControllableResizeObserver);
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(() => scrollWidth);
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => clientWidth);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is true when the content is wider than the box, from the first render on', () => {
    scrollWidth = 500;
    clientWidth = 300;
    render(<Row />);

    expect(screen.getByTestId('row')).toHaveAttribute('data-overflowing', 'true');
  });

  it('is false when the content fits, also when it is exactly as wide as the box', () => {
    scrollWidth = 300;
    clientWidth = 300;
    render(<Row />);

    expect(screen.getByTestId('row')).toHaveAttribute('data-overflowing', 'false');
  });

  it('measures again when the box or one of its items changes size', () => {
    scrollWidth = 500;
    clientWidth = 300;
    render(<Row />);
    const [observer] = ControllableResizeObserver.instances;
    expect(observer.observed).toHaveLength(3);

    scrollWidth = 300;
    act(() => observer.fire());
    expect(screen.getByTestId('row')).toHaveAttribute('data-overflowing', 'false');

    scrollWidth = 520;
    act(() => observer.fire());
    expect(screen.getByTestId('row')).toHaveAttribute('data-overflowing', 'true');
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<Row />);
    const [observer] = ControllableResizeObserver.instances;

    unmount();

    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  it('still measures once where ResizeObserver does not exist, without throwing', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    scrollWidth = 500;
    clientWidth = 300;

    render(<Row />);

    expect(screen.getByTestId('row')).toHaveAttribute('data-overflowing', 'true');
  });
});
