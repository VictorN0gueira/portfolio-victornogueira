import type { ClipboardEvent, SyntheticEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { handleWhatsappPaste, keepSelectionAfterPrefix, whatsappInputProps } from './whatsappInput';

// These test the guards on their own, with a real input and a stand in for the event, so they do not depend on what React
// does with its select event (it raises it only when the selection differs from the last one it sampled). The form level
// behavior is in ContactForm.whatsapp.test.tsx and, in a real browser, in e2e/contact-form.spec.ts.

const PREFIX = '+55 ';

function phoneInput(value = `${PREFIX}11 9 0000-0000`): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'tel';
  document.body.append(input);
  input.value = value;
  return input;
}

const eventOf = (input: HTMLInputElement) => ({ currentTarget: input }) as unknown as SyntheticEvent<HTMLInputElement>;

function pasteOf(input: HTMLInputElement, clipboardData: { getData: (type: string) => string } | null | undefined) {
  const preventDefault = vi.fn();
  const event = { currentTarget: input, clipboardData, preventDefault } as unknown as ClipboardEvent<HTMLInputElement>;
  return { event, preventDefault };
}

const range = (input: HTMLInputElement) => [input.selectionStart, input.selectionEnd];

describe('keepSelectionAfterPrefix', () => {
  it.each([
    [0, 0, 4, 4],
    [1, 1, 4, 4],
    [2, 2, 4, 4],
    [3, 3, 4, 4],
    [0, 2, 4, 4],
    [2, 4, 4, 4],
    [0, 4, 4, 4],
    [0, 11, 4, 11],
    [1, 18, 4, 18],
    [2, 18, 4, 18],
    [3, 18, 4, 18],
  ])('moves the selection %i to %i to %i to %i', (start, end, expectedStart, expectedEnd) => {
    const input = phoneInput();
    input.setSelectionRange(start, end);

    keepSelectionAfterPrefix(eventOf(input));

    expect(range(input)).toEqual([expectedStart, expectedEnd]);
  });

  it.each([
    [4, 4],
    [5, 5],
    [18, 18],
    [4, 18],
    [6, 12],
  ])('leaves the selection %i to %i alone', (start, end) => {
    const input = phoneInput();
    input.setSelectionRange(start, end);
    const spy = vi.spyOn(input, 'setSelectionRange');

    keepSelectionAfterPrefix(eventOf(input));

    expect(range(input)).toEqual([start, end]);
    expect(spy).not.toHaveBeenCalled();
  });

  it.each(['forward', 'backward'] as const)('keeps the %s direction of the selection it moves', (direction) => {
    const input = phoneInput();
    input.setSelectionRange(2, 18, direction);

    keepSelectionAfterPrefix(eventOf(input));

    expect(range(input)).toEqual([4, 18]);
    expect(input.selectionDirection).toBe(direction);
  });

  it('does nothing for an input that has no selection (a type that does not support it)', () => {
    const input = document.createElement('input');
    input.type = 'email';
    document.body.append(input);
    input.value = 'ana@example.com';
    expect(input.selectionStart).toBeNull();

    expect(() => keepSelectionAfterPrefix(eventOf(input))).not.toThrow();
  });
});

describe('whatsappInputProps', () => {
  const props = whatsappInputProps(() => undefined);

  // Each event is a moment the selection may be inside the prefix with React having raised nothing: a click, the select
  // event, the key that is about to insert a character and the text that is about to be inserted (a key, a dictation or
  // an input method). All of them read the live selection.
  it.each(['onSelect', 'onClick', 'onKeyDown', 'onBeforeInput'] as const)('guards the selection on %s', (name) => {
    const input = phoneInput();
    input.setSelectionRange(2, 18);

    props[name](eventOf(input));

    expect(range(input)).toEqual([4, 18]);
  });

  it('asks for the numeric keyboard', () => {
    expect(props.inputMode).toBe('tel');
  });
});

describe('handleWhatsappPaste', () => {
  it('moves the selection out of the prefix before anything is pasted', () => {
    const input = phoneInput(PREFIX);
    input.setSelectionRange(1, 1);
    const { event } = pasteOf(input, { getData: () => '11900000000' });

    handleWhatsappPaste(event, vi.fn());

    expect(range(input)).toEqual([4, 4]);
  });

  it('replaces the field with a whole number and cancels the browser paste', () => {
    const input = phoneInput(PREFIX);
    const onChange = vi.fn();
    const { event, preventDefault } = pasteOf(input, { getData: () => '\u202a+55 11 90000-0000\u202c' });

    handleWhatsappPaste(event, onChange);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledExactlyOnceWith('+55 11 90000-0000');
  });

  it('cancels the browser paste and changes nothing for a number from another country', () => {
    const input = phoneInput(PREFIX);
    const onChange = vi.fn();
    const { event, preventDefault } = pasteOf(input, { getData: () => '+1 415 555 2671' });

    handleWhatsappPaste(event, onChange);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('leaves a local number to the browser', () => {
    const input = phoneInput(PREFIX);
    const onChange = vi.fn();
    const { event, preventDefault } = pasteOf(input, { getData: () => '11900000000' });

    handleWhatsappPaste(event, onChange);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('does not throw when the clipboard data is %s, and leaves the paste to the browser', (_label, clipboardData) => {
    const input = phoneInput(PREFIX);
    const onChange = vi.fn();
    const { event, preventDefault } = pasteOf(input, clipboardData);

    expect(() => handleWhatsappPaste(event, onChange)).not.toThrow();

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reads the text format of the clipboard', () => {
    const input = phoneInput(PREFIX);
    const getData = vi.fn(() => '');
    const { event } = pasteOf(input, { getData });

    handleWhatsappPaste(event, vi.fn());

    expect(getData).toHaveBeenCalledWith('text');
  });
});
