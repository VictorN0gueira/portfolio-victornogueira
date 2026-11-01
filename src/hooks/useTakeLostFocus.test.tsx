import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTakeLostFocus } from './useTakeLostFocus';

function Panel() {
  const ref = useTakeLostFocus<HTMLHeadingElement>();
  return (
    <>
      <button type="button">menu</button>
      <h2 ref={ref} tabIndex={-1}>
        Algo deu errado
      </h2>
    </>
  );
}

describe('useTakeLostFocus', () => {
  it('takes the focus when it is lost on the body', () => {
    render(<Panel />);

    expect(screen.getByRole('heading')).toHaveFocus();
  });

  it('leaves the focus on a button the visitor is on', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    render(<Panel />);

    expect(button).toHaveFocus();
    button.remove();
  });

  it('takes the focus back when a menu returns it to its button with no input of the visitor', () => {
    render(<Panel />);
    expect(screen.getByRole('heading')).toHaveFocus();

    act(() => screen.getByRole('button', { name: 'menu' }).focus());

    expect(screen.getByRole('heading')).toHaveFocus();
  });

  it('lets a focus move that follows a key press stand', () => {
    render(<Panel />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      screen.getByRole('button', { name: 'menu' }).focus();
    });

    expect(screen.getByRole('button', { name: 'menu' })).toHaveFocus();
  });

  it('stops guarding when the panel unmounts', () => {
    const { unmount } = render(<Panel />);
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    unmount();
    act(() => outside.focus());

    expect(outside).toHaveFocus();
    outside.remove();
  });
});
