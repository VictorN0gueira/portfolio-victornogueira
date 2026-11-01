import type { ClipboardEvent, DragEvent, FormEvent, KeyboardEvent, SyntheticEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { range } from '../../test/range';
import { handleWhatsappDrop, handleWhatsappPaste, keepSelectionAfterPrefix, whatsappInputProps } from './whatsappInput';

// These test the guards on their own, with a real input and a stand in for the event, so they do not depend on what React
// does with its select event (it raises it only when the selection differs from the last one it sampled). The form level
// behavior is in ContactForm.whatsapp.test.tsx and, in a real browser, in e2e/contact-form.spec.ts.

const PREFIX = '+55 ';
const char = (codePoint: number): string => String.fromCodePoint(codePoint);
const LRE = char(0x202a);
const PDF = char(0x202c);
const fullwidth = (digits: string): string => [...digits].map((digit) => char(0xff10 + Number(digit))).join('');

function phoneInput(value = `${PREFIX}11 9 0000-0000`): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'tel';
  document.body.append(input);
  input.value = value;
  return input;
}

const eventOf = (input: HTMLInputElement) => ({ currentTarget: input }) as unknown as SyntheticEvent<HTMLInputElement>;

function dropOf(input: HTMLInputElement, dataTransfer: { getData: (type: string) => string } | null | undefined) {
  const preventDefault = vi.fn();
  const event = { currentTarget: input, dataTransfer, preventDefault } as unknown as DragEvent<HTMLInputElement>;
  return { event, preventDefault };
}

function pasteOf(input: HTMLInputElement, clipboardData: { getData: (type: string) => string } | null | undefined) {
  const preventDefault = vi.fn();
  const event = { currentTarget: input, clipboardData, preventDefault } as unknown as ClipboardEvent<HTMLInputElement>;
  return { event, preventDefault };
}

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
  // event, the key that is about to insert a character, the text that is about to be inserted (a key or a dictation) and
  // the start of an input method composition. All of them read the live selection. The row for onKeyDown is the pin of
  // that handler: in jsdom React raises its own select event on key down too, so the form level tests cannot tell it.
  it.each(['onSelect', 'onClick', 'onKeyDown', 'onBeforeInput', 'onCompositionStart'] as const)('guards the selection on %s', (name) => {
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

  it.each([
    ['undefined', undefined],
    ['a number', 5],
    ['an object', {}],
    ['null', null],
  ])('treats a clipboard whose getData gives %s as an empty one', (_label, given) => {
    const input = phoneInput(PREFIX);
    const onChange = vi.fn();
    const { event, preventDefault } = pasteOf(input, { getData: () => given as unknown as string });

    expect(() => handleWhatsappPaste(event, onChange)).not.toThrow();

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  // A real event never throws from getData, so a throw is a bug somewhere else and is not swallowed here.
  it('does not hide a getData that throws', () => {
    const input = phoneInput(PREFIX);
    const { event } = pasteOf(input, {
      getData: () => {
        throw new Error('getData failed');
      },
    });

    expect(() => handleWhatsappPaste(event, vi.fn())).toThrow('getData failed');
  });

  it('reads the text format of the clipboard', () => {
    const input = phoneInput(PREFIX);
    const getData = vi.fn(() => '');
    const { event } = pasteOf(input, { getData });

    handleWhatsappPaste(event, vi.fn());

    expect(getData).toHaveBeenCalledWith('text');
  });
});

describe('handleWhatsappDrop', () => {
  it('always cancels the drop of the browser: the drop point can sit inside the prefix', () => {
    for (const text of ['+55 11 90000-0000', '11900000000', '+1 415 555 2671', 'letters', '']) {
      const { event, preventDefault } = dropOf(phoneInput(PREFIX), { getData: () => text });

      handleWhatsappDrop(event, vi.fn());

      expect(preventDefault).toHaveBeenCalledOnce();
    }
  });

  it('sets the whole field from a whole Brazilian number', () => {
    const onChange = vi.fn();
    const { event } = dropOf(phoneInput(), { getData: () => `${LRE}+55 11 90000-0000${PDF}` });

    handleWhatsappDrop(event, onChange);

    expect(onChange).toHaveBeenCalledExactlyOnceWith('+55 11 90000-0000');
  });

  it('sets the whole field from a number with no plus and letters around it', () => {
    const onChange = vi.fn();
    const { event } = dropOf(phoneInput(), { getData: () => 'https://wa.me/5511900000000' });

    handleWhatsappDrop(event, onChange);

    expect(onChange).toHaveBeenCalledExactlyOnceWith('5511900000000');
  });

  it('sets the field from a text that is only a number, as typed digits, in the normalized form', () => {
    const onChange = vi.fn();
    const { event } = dropOf(phoneInput(), { getData: () => ` 11 90000-0000${PDF}` });

    handleWhatsappDrop(event, onChange);

    expect(onChange).toHaveBeenCalledExactlyOnceWith('11 90000-0000');
  });

  it('folds fullwidth digits before it sets the field, so they are not lost', () => {
    const onChange = vi.fn();
    const { event } = dropOf(phoneInput(), { getData: () => fullwidth('11900000000') });

    handleWhatsappDrop(event, onChange);

    expect(onChange).toHaveBeenCalledExactlyOnceWith('11900000000');
  });

  it('sets the field from a plain local number, with or without punctuation', () => {
    for (const text of ['11900000000', '(11) 90000-0000']) {
      const onChange = vi.fn();
      const { event } = dropOf(phoneInput(), { getData: () => text });

      handleWhatsappDrop(event, onChange);

      expect(onChange).toHaveBeenCalledExactlyOnceWith(text);
    }
  });

  it.each([
    ['a number from another country', '+1 415 555 2671'],
    ['a bare plus', '+'],
    ['a bare double zero', '00'],
    ['a sentence with digits and a date', 'Pedido 123 de 2026-10-28 total 4500'],
    ['a sentence with a time', 'Reuniao dia 12 as 15h'],
    ['a number and a date after it', '55 3222-1234 12/10/2026'],
    ['a local number and a stray plus', '11 90000-0000 +'],
    ['two lines of digits', '11900000000' + String.fromCharCode(10) + '21911111111'],
    ['letters only', 'meu numero'],
    ['nothing', ''],
    ['spaces', '   '],
  ])('leaves the field as it is for %s', (_label, text) => {
    const onChange = vi.fn();
    const { event } = dropOf(phoneInput(), { getData: () => text });

    handleWhatsappDrop(event, onChange);

    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('does not throw when the data transfer is %s', (_label, dataTransfer) => {
    const onChange = vi.fn();
    const { event, preventDefault } = dropOf(phoneInput(), dataTransfer);

    expect(() => handleWhatsappDrop(event, onChange)).not.toThrow();

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is the drop handler of the field props', () => {
    const onChange = vi.fn();
    const { event, preventDefault } = dropOf(phoneInput(), { getData: () => '+55 11 90000-0000' });

    whatsappInputProps(onChange).onDrop(event);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledExactlyOnceWith('+55 11 90000-0000');
  });
});

describe('a country code typed by hand', () => {
  const props = whatsappInputProps(() => undefined);
  const key = (input: HTMLInputElement, data: string | null) => {
    const preventDefault = vi.fn();
    props.onBeforeInput({ currentTarget: input, data, preventDefault } as unknown as FormEvent<HTMLInputElement>);
    return preventDefault;
  };

  it('swallows the plus and both 5s typed into the empty field', () => {
    const input = phoneInput(PREFIX);
    expect(key(input, '+')).toHaveBeenCalled();
    expect(key(input, '5')).toHaveBeenCalled();
    expect(key(input, '5')).toHaveBeenCalled();
    expect(key(input, '8')).not.toHaveBeenCalled();
  });

  it('swallows only two 5s: a third 5 is the DDD', () => {
    const input = phoneInput(PREFIX);
    key(input, '+');
    key(input, '5');
    key(input, '5');
    expect(key(input, '5')).not.toHaveBeenCalled();
  });

  it('does nothing for a 5 without a plus, nor for a plus when the field already holds digits', () => {
    expect(key(phoneInput(PREFIX), '5')).not.toHaveBeenCalled();
    expect(key(phoneInput(`${PREFIX}11`), '+')).not.toHaveBeenCalled();
  });

  it('forgets a plus that was followed by anything else, and a 5 typed later in the number is kept', () => {
    const input = phoneInput(PREFIX);
    key(input, '+');
    key(input, '8');
    input.value = `${PREFIX}8`;
    expect(key(input, '5')).not.toHaveBeenCalled();
    const other = phoneInput(PREFIX);
    key(other, '+');
    other.value = `${PREFIX}81`;
    expect(key(other, '5')).not.toHaveBeenCalled();
  });

  it('still guards the selection and tolerates an event with no data', () => {
    const input = phoneInput();
    input.setSelectionRange(2, 18);
    expect(() => key(input, null)).not.toThrow();
    expect(range(input)).toEqual([4, 18]);
  });

  it('does the same from the key down of a physical keyboard, and a swallowed key is not counted again by beforeinput', () => {
    const input = phoneInput(PREFIX);
    const down = (name: string) => {
      const preventDefault = vi.fn();
      props.onKeyDown({ currentTarget: input, key: name, preventDefault } as unknown as KeyboardEvent<HTMLInputElement>);
      return preventDefault;
    };
    expect(down('+')).toHaveBeenCalled();
    expect(down('5')).toHaveBeenCalled();
    expect(down('Shift')).not.toHaveBeenCalled();
    expect(down('Unidentified')).not.toHaveBeenCalled();
    expect(down('5')).toHaveBeenCalled();
    expect(down('8')).not.toHaveBeenCalled();
  });

  it('leaves the browser shortcuts alone: Ctrl, Cmd or Alt with a plus or a 5 is not swallowed and starts nothing', () => {
    const input = phoneInput(PREFIX);
    const down = (name: string, modifiers: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey', boolean>>) => {
      const preventDefault = vi.fn();
      props.onKeyDown({ currentTarget: input, key: name, ...modifiers, preventDefault } as unknown as KeyboardEvent<HTMLInputElement>);
      return preventDefault;
    };
    // Zoom in (Ctrl +, Cmd +), then a Cmd or Ctrl 5 (switch tab): nothing is prevented...
    expect(down('+', { ctrlKey: true })).not.toHaveBeenCalled();
    expect(down('+', { metaKey: true })).not.toHaveBeenCalled();
    expect(down('5', { ctrlKey: true })).not.toHaveBeenCalled();
    expect(down('5', { metaKey: true })).not.toHaveBeenCalled();
    expect(down('5', { altKey: true })).not.toHaveBeenCalled();
    // ...and a shortcut plus does not start the swallowing of the two 5s that follow.
    expect(down('5', {})).not.toHaveBeenCalled();
    // A plain plus still does.
    expect(down('+', {})).toHaveBeenCalled();
    expect(down('5', {})).toHaveBeenCalled();
  });

  it('ends the swallowing at any other key, even one that leaves the field empty (a letter, an arrow, Backspace, Tab)', () => {
    const typedKey = (input: HTMLInputElement, name: string) => {
      const preventDefault = vi.fn();
      props.onKeyDown({ currentTarget: input, key: name, preventDefault } as unknown as KeyboardEvent<HTMLInputElement>);
      return preventDefault;
    };
    for (const other of ['a', 'ArrowLeft', 'Backspace', 'Tab', 'Enter']) {
      // Through beforeinput: a "+", the other key, then 55. The field is still empty, so only the reset can stop it.
      const input = phoneInput(PREFIX);
      key(input, '+');
      if (other.length === 1) key(input, other);
      else typedKey(input, other);
      expect(key(input, '5')).not.toHaveBeenCalled();
      expect(key(input, '5')).not.toHaveBeenCalled();

      // The same from the key down of a physical keyboard.
      const keyed = phoneInput(PREFIX);
      typedKey(keyed, '+');
      typedKey(keyed, other);
      expect(typedKey(keyed, '5')).not.toHaveBeenCalled();
    }
  });
});

