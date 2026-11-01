import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { findAccentElements } from '../../test/accent';
import { PauseToggle } from './PauseToggle';

const LABEL = 'Pausar o que se move';

function getToggle(): HTMLElement {
  return screen.getByRole('button', { name: LABEL });
}

function getIcon(): SVGElement {
  return getToggle().querySelector('svg') as SVGElement;
}

describe('PauseToggle contract', () => {
  it('is a button that never submits, named by the label it is given, not pressed while not paused', () => {
    render(<PauseToggle isPaused={false} label={LABEL} onToggle={vi.fn()} tone="light" />);

    expect(getToggle()).toHaveAccessibleName(LABEL);
    expect(getToggle()).toHaveAttribute('type', 'button');
    expect(getToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(getToggle().getAttribute('aria-label')).toBe(LABEL);
  });

  it('keeps one constant name and carries the state in aria-pressed alone', () => {
    const { rerender } = render(<PauseToggle isPaused={false} label={LABEL} onToggle={vi.fn()} tone="light" />);

    rerender(<PauseToggle isPaused label={LABEL} onToggle={vi.fn()} tone="light" />);

    expect(getToggle()).toHaveAccessibleName(LABEL);
    expect(getToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('swaps the icon between pause and play, hides the icon from assistive tech and has no text of its own', () => {
    const { rerender } = render(<PauseToggle isPaused={false} label={LABEL} onToggle={vi.fn()} tone="dark" />);

    expect(getIcon()).toHaveClass('lucide-pause');
    expect(getIcon()).toHaveAttribute('aria-hidden', 'true');
    expect(getToggle().textContent).toBe('');

    rerender(<PauseToggle isPaused label={LABEL} onToggle={vi.fn()} tone="dark" />);

    expect(getIcon()).toHaveClass('lucide-play');
    expect(getIcon()).not.toHaveClass('lucide-pause');
    expect(getIcon()).toHaveAttribute('aria-hidden', 'true');
  });

  it('calls onToggle on a click and does not change by itself, since the state belongs to the parent', () => {
    const onToggle = vi.fn();
    render(<PauseToggle isPaused={false} label={LABEL} onToggle={onToggle} tone="light" />);

    fireEvent.click(getToggle());

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(getToggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('is operated with the Space and Enter keys', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<PauseToggle isPaused={false} label={LABEL} onToggle={onToggle} tone="light" />);
    getToggle().focus();

    await user.keyboard(' ');
    await user.keyboard('{Enter}');

    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('has a 44px hit area, with the icon button drawn smaller inside it', () => {
    render(<PauseToggle isPaused={false} label={LABEL} onToggle={vi.fn()} tone="light" />);

    expect(getToggle()).toHaveClass('size-11', 'group', 'grid', 'place-items-center', 'rounded-full');
    expect(getToggle().firstElementChild).toHaveClass('rounded-full', 'border');
  });

  it('passes a class name and every other attribute (a data attribute, an id) to the button', () => {
    render(
      <PauseToggle isPaused={false} label={LABEL} onToggle={vi.fn()} tone="dark" className="-my-2 -mr-2" id="toggle" data-hold-exempt="" />,
    );

    expect(getToggle()).toHaveClass('-my-2', '-mr-2', 'size-11');
    expect(getToggle()).toHaveAttribute('id', 'toggle');
    expect(getToggle()).toHaveAttribute('data-hold-exempt');
  });

  it('cannot be told another type, state or name through the rest of the props', () => {
    const rest = { type: 'submit', 'aria-pressed': true, 'aria-label': 'Outro nome' } as unknown as Record<string, never>;
    render(<PauseToggle isPaused={false} label={LABEL} onToggle={vi.fn()} tone="light" {...rest} />);

    expect(getToggle()).toHaveAttribute('type', 'button');
    expect(getToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(getToggle()).toHaveAccessibleName(LABEL);
  });
});

describe('PauseToggle tones', () => {
  it('draws the dark tone for a dark bar: a white focus ring, a 28px icon button and gray lines', () => {
    render(<PauseToggle isPaused={false} label={LABEL} onToggle={vi.fn()} tone="dark" />);

    expect(getToggle()).toHaveClass('focus-visible:outline-2', 'focus-visible:outline-vn-white');
    expect(getToggle().firstElementChild).toHaveClass('size-7', 'border-vn-gray-mid', 'text-vn-gray-light');
    expect(getIcon()).toHaveClass('size-3.5');
  });

  it('draws the light tone for a light section: an ink focus ring held off the button, a 36px icon button', () => {
    render(<PauseToggle isPaused={false} label={LABEL} onToggle={vi.fn()} tone="light" />);

    expect(getToggle()).toHaveClass('vn-focus-ring-ink');
    expect(getToggle().firstElementChild).toHaveClass('size-9', 'border-vn-gray-light', 'text-vn-ink');
    expect(getIcon()).toHaveClass('size-4');
  });

  it('uses no accent color in either tone', () => {
    const { container } = render(
      <>
        <PauseToggle isPaused={false} label="a" onToggle={vi.fn()} tone="dark" />
        <PauseToggle isPaused label="b" onToggle={vi.fn()} tone="light" />
      </>,
    );

    expect(findAccentElements(container)).toHaveLength(0);
  });
});
