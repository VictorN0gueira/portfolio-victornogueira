import type { ClipboardEvent, DragEvent, SyntheticEvent } from 'react';
import { isWholeDialingText, normalizePastedText, readPastedNumber } from './pastedNumber';
import { EMPTY_FORM_DATA } from './useContactForm';

// The number is the one thing of a lead that cannot be wrong: a number that passes the validation but is not the one the
// visitor meant sends the lead to somebody else. The field is filled with "+55 " from the start and the formatter reads
// the digits again after every change, so three things used to corrupt it: a selection that touches the prefix (the next
// digits land in front of the country code, or leave a stray "5" of it behind, and are read as the DDD), an
// international number pasted behind the prefix (its own "+55" is read as the DDD), and the same text dropped on the
// field. The guards below fix the input only: the formatter, the validation and the payload are the ones of lib/phone.ts
// and lib/contact.ts, untouched.

/** "+55 ": the part of the field that is always there. */
const PHONE_PREFIX_LENGTH = EMPTY_FORM_DATA.whatsapp.length;

/**
 * Keeps the selection out of the prefix: both ends move to the end of the prefix when they are before it. A caret in the
 * prefix becomes a caret just after it; a range that starts inside it (a double click on the "+" or on the "55", a drag
 * or Shift+Arrow that stops between the two 5s, Ctrl+A, the select all of a Tab) starts just after it and keeps its end,
 * so it still replaces the whole number but never a piece of the prefix, and nothing typed lands in front of it or leaves
 * a "5" of it behind. The direction of the selection is kept, so Shift+Arrow goes on extending the same way. The prefix
 * is protected on purpose: a select all selects the number only, so a copy or a cut gives the number without "+55 ".
 * Needs a type that supports selection ranges (tel does).
 *
 * It reads the LIVE selection, so it can run whenever the input may be about to change. It runs on select and click
 * (the moment the selection moves), on key down and before input (the moment before a character is inserted by a key, or
 * by text that arrives with no key such as a dictation) and on composition start (an input method that begins with the
 * caret in the prefix). React raises `select` only when the selection differs from the last one it sampled, and our own
 * setSelectionRange does not refresh that sample: a second click at the same place, or a caret that returns to a place
 * it was already snapped from (a touch caret handle, the space bar swipe of a phone keyboard), raises no select event at
 * all. Key down, before input and composition start do not depend on that sample. A composition that the controlled
 * field rewrites while it is still open (the formatter changes the value on every input) is not covered: that is the
 * same with or without this guard.
 */
export function keepSelectionAfterPrefix(event: SyntheticEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const { selectionStart, selectionEnd, selectionDirection } = input;
  if (selectionStart === null || selectionEnd === null) return;

  const start = Math.max(selectionStart, PHONE_PREFIX_LENGTH);
  const end = Math.max(selectionEnd, PHONE_PREFIX_LENGTH);
  if (start === selectionStart && end === selectionEnd) return;

  input.setSelectionRange(start, end, selectionDirection ?? 'none');
}

/** The `text` of a clipboard or of a drag, or an empty string when there is none (a synthetic event from a script). */
function textOf(data: Pick<DataTransfer, 'getData'> | null | undefined): string {
  const text = data?.getData('text');
  return typeof text === 'string' ? text : '';
}

/**
 * What a paste does in the WhatsApp field (see readPastedNumber for the cases). First the selection is kept out of the
 * prefix, so a paste that the browser inserts lands after it. A whole Brazilian number replaces the whole field, through
 * the same path as typing (`onChange` takes the text and the form formats it with formatWhatsappDisplay). A number from
 * another country, or a bare "+", cancels the paste and leaves the field as it is. Every other paste keeps the default.
 * A paste with no clipboard data (a synthetic event from a script or an extension) is left alone; a `getData` that throws
 * is not caught: a real event never does it, and a failure there should not be hidden.
 */
export function handleWhatsappPaste(event: ClipboardEvent<HTMLInputElement>, onChange: (text: string) => void) {
  keepSelectionAfterPrefix(event);

  const read = readPastedNumber(textOf(event.clipboardData));
  if (read.action === 'default') return;

  event.preventDefault();
  if (read.action === 'replace') onChange(read.text);
}

/**
 * What a drop does in the WhatsApp field. The paste guards do not run for a drop, and the drop point can sit inside the
 * prefix, so the browser's own drop is always cancelled. The field is set only from a whole number: one that readPastedNumber
 * takes as it is (a country coded number), or a text that is nothing but a number (a local number, with or without
 * punctuation, which the formatter reads as typed digits). Any other text (a sentence with digits, letters only), a number
 * from another country and a bare plus leave the field as it is. It all goes through `onChange`.
 */
export function handleWhatsappDrop(event: DragEvent<HTMLInputElement>, onChange: (text: string) => void) {
  event.preventDefault();

  const text = normalizePastedText(textOf(event.dataTransfer));
  const read = readPastedNumber(text);
  if (read.action === 'replace') onChange(read.text);
  else if (read.action === 'default' && isWholeDialingText(text)) onChange(text);
}

/** What the WhatsApp field adds to a plain input. `onChange` is the one of the field: it formats the text it is given. */
export function whatsappInputProps(onChange: (text: string) => void) {
  return {
    inputMode: 'tel' as const,
    onSelect: keepSelectionAfterPrefix,
    onClick: keepSelectionAfterPrefix,
    onKeyDown: keepSelectionAfterPrefix,
    onBeforeInput: keepSelectionAfterPrefix,
    onCompositionStart: keepSelectionAfterPrefix,
    onPaste: (event: ClipboardEvent<HTMLInputElement>) => handleWhatsappPaste(event, onChange),
    onDrop: (event: DragEvent<HTMLInputElement>) => handleWhatsappDrop(event, onChange),
  };
}
