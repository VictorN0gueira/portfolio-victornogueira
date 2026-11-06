import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { ChoicePill } from './ChoicePill';
import { forgetChoicePopoverForTests } from './choicePopoverLoader';

/**
 * The popover (Radix Popover with floating-ui, 23.8 kB gzip measured) is a chunk of its own. The pill itself stays in the
 * entry as a plain button of the same markup; the chunk loads when the browser is idle or on the first pointer or focus
 * on the pill, and swaps in without moving the pill or losing the focus. A click before the chunk is there opens the list
 * as soon as it arrives. Each test forgets the loaded chunk first, so it starts from the plain pill.
 */
const OPTIONS = [
  { value: 5, label: '5 horas' },
  { value: 10, label: '10 horas' },
  { value: 20, label: '20 horas' },
] as const;
const ariaLabel = (label: string) => `Horas por semana: ${label}. Alterar`;
const TRIGGER_NAME = 'Horas por semana: 10 horas. Alterar';

function Harness({ onChange }: { onChange?: (value: number) => void }) {
  const [value, setValue] = useState<number>(10);
  return (
    <ChoicePill
      value={value}
      options={OPTIONS}
      ariaLabel={ariaLabel}
      listLabel="Horas por semana"
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe('ChoicePill popover chunk', () => {
  beforeEach(forgetChoicePopoverForTests);

  it('keeps Radix Popover out of the modules the entry imports', () => {
    for (const file of ['ChoicePill.tsx', 'choicePillFace.tsx']) {
      const source = readFileSync(resolve(__dirname, file), 'utf8');
      expect(source, file).not.toMatch(/from '@radix-ui\/react-popover'/);
      expect(source, file).not.toMatch(/^import\s+(?!type\b).*from '\.\/ChoiceList'/m);
    }
  });

  it('first shows a plain button with the markup of the real pill', () => {
    renderWithProviders(<Harness />);

    const pill = screen.getByRole('button', { name: TRIGGER_NAME });
    expect(pill).toHaveAttribute('aria-haspopup', 'listbox');
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    expect(pill).toHaveAttribute('data-state', 'closed');
    expect(pill).toHaveAttribute('type', 'button');
    expect(pill).toHaveClass('min-h-11', 'rounded-full');
    expect(pill.textContent).toBe('10 horas');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens the list when it is clicked before the chunk arrived, and the choice works', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Harness onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: TRIGGER_NAME }));
    const list = await screen.findByRole('listbox', { name: 'Horas por semana' });
    await user.click(screen.getByRole('option', { name: '20 horas' }));

    expect(list).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith(20);
  });

  it('keeps the focus on the pill when the real one swaps in', async () => {
    renderWithProviders(<Harness />);
    const staticPill = screen.getByRole('button', { name: TRIGGER_NAME });

    act(() => staticPill.focus());
    await waitFor(() => expect(staticPill.isConnected).toBe(false));

    const realPill = screen.getByRole('button', { name: TRIGGER_NAME });
    expect(realPill).toHaveFocus();
    expect(realPill).toHaveAttribute('aria-expanded', 'false');
  });

  describe('a list that opens in the middle of a press', () => {
    const press = { button: 0, pointerId: 1, pointerType: 'mouse' };

    it('gets the focus back on its option when the press ends and the browser had dropped the focus', async () => {
      renderWithProviders(<Harness />);

      fireEvent.pointerDown(screen.getByRole('button', { name: TRIGGER_NAME }), press);
      const option = await screen.findByRole('option', { name: '10 horas' });
      await waitFor(() => expect(option).toHaveFocus());
      // The browser's own mousedown comes after the swap and drops the focus: the pill that was pressed is gone.
      act(() => (document.activeElement as HTMLElement).blur());
      expect(document.body).toHaveFocus();

      fireEvent.pointerUp(document.body, press);

      await waitFor(() => expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus());
    });

    it('leaves the focus where the visitor put it when it is not lost', async () => {
      renderWithProviders(
        <>
          <button type="button">outro</button>
          <Harness />
        </>,
      );

      fireEvent.pointerDown(screen.getByRole('button', { name: TRIGGER_NAME }), press);
      await waitFor(() => expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus());
      act(() => screen.getByRole('button', { name: 'outro' }).focus());

      fireEvent.pointerUp(document.body, press);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(screen.getByRole('button', { name: 'outro' })).toHaveFocus();
    });

    it('also checks after the mouse events a tap sends later, as a touch screen does', async () => {
      renderWithProviders(<Harness />);

      fireEvent.pointerDown(screen.getByRole('button', { name: TRIGGER_NAME }), { ...press, pointerType: 'touch' });
      await waitFor(() => expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus());
      fireEvent.pointerUp(document.body, { ...press, pointerType: 'touch' });
      // The focus is still on the option when the pointer goes up: the compatibility mousedown comes later and drops it.
      await new Promise((resolve) => setTimeout(resolve, 30));
      act(() => (document.activeElement as HTMLElement).blur());
      fireEvent.mouseUp(document.body);

      await waitFor(() => expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus());
    });

    it('also puts the focus back when the press is cancelled', async () => {
      renderWithProviders(<Harness />);

      fireEvent.pointerDown(screen.getByRole('button', { name: TRIGGER_NAME }), press);
      await waitFor(() => expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus());
      act(() => (document.activeElement as HTMLElement).blur());

      fireEvent.pointerCancel(document.body, press);

      await waitFor(() => expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus());
    });

    it('does nothing when the pointer was already up at the swap, even if the focus is lost later', async () => {
      renderWithProviders(<Harness />);

      fireEvent.pointerDown(screen.getByRole('button', { name: TRIGGER_NAME }), press);
      fireEvent.pointerUp(document.body, press);
      await waitFor(() => expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus());
      act(() => (document.activeElement as HTMLElement).blur());
      fireEvent.pointerDown(document.body, press);
      fireEvent.pointerUp(document.body, press);
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(document.body).toHaveFocus();
    });

    it('does nothing to the focus when the list has closed before the check runs', async () => {
      renderWithProviders(<Harness />);

      fireEvent.pointerDown(screen.getByRole('button', { name: TRIGGER_NAME }), press);
      const option = await screen.findByRole('option', { name: '10 horas' });
      await waitFor(() => expect(option).toHaveFocus());
      fireEvent.pointerUp(document.body, press);
      fireEvent.keyDown(option, { key: 'Escape' });
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(screen.queryByRole('listbox')).toBeNull();
      expect(screen.getByRole('button', { name: TRIGGER_NAME })).toHaveFocus();
    });
  });

  it('opens with the arrow keys before the chunk arrived, as a native select does', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    screen.getByRole('button', { name: TRIGGER_NAME }).focus();
    await user.keyboard('{ArrowDown}');

    expect(await screen.findByRole('listbox', { name: 'Horas por semana' })).toBeTruthy();
  });
});
