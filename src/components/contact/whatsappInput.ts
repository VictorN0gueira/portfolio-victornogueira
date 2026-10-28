import type { ClipboardEvent, SyntheticEvent } from 'react';
import { EMPTY_FORM_DATA } from './useContactForm';

// The number is the one thing of a lead that cannot be wrong: a number that passes the validation but is not the one the
// visitor meant sends the lead to somebody else. The field is filled with "+55 " from the start and the formatter reads
// the digits again after every change, so two things used to corrupt it: a caret inside the prefix (the next digits land
// in front of the country code and are read as the DDD), and an international number pasted behind the prefix (its own
// "+55" is read as the DDD). The two guards below fix the input only: the formatter, the validation and the payload are
// the ones of lib/phone.ts and lib/contact.ts, untouched.

/** "+55 ": the part of the field that is always there. */
const PHONE_PREFIX_LENGTH = EMPTY_FORM_DATA.whatsapp.length;

const COUNTRY_CODE = '55';
// 55 and a DDD and the eight or nine digits of the line: a DDD 55 local number has 10 or 11 digits, never 12.
const INTERNATIONAL_MIN_DIGITS = 12;
// Only what a phone number is written with: digits, spaces and newlines, dashes and parentheses.
const DIAL_CHARACTERS = /^[\d\s\-()]+$/;

/**
 * Moves the caret out of the prefix. Any selection that ends inside it (a caret, a double click on the "+" or on the
 * "55", Home then Shift+Right) collapses to the caret just after it: nothing in the prefix is worth selecting, and a
 * digit typed over or in front of it would corrupt the number. A selection that reaches past the prefix (Ctrl+A, the
 * select all of a Tab, a drag over the number) is left alone and still replaces everything. Needs a type that supports
 * selection ranges (tel does).
 *
 * It runs on select and on click. React raises `select` only when the selection differs from the last one it sampled,
 * and our own setSelectionRange does not refresh that sample, so a second click or tap at the same place raises no
 * select event: the click handler, which fires every time, is what covers it. Moving the caret with the keyboard
 * (Home, the arrows, Shift+Home) needs nothing more: React samples the selection again on key up, which refreshes
 * its last one, and a real Chromium run with a double Home press confirmed it.
 */
export function keepCaretAfterPrefix(event: SyntheticEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const { selectionStart, selectionEnd } = input;
  if (selectionStart === null || selectionEnd === null) return;

  const endsInsidePrefix = selectionEnd <= PHONE_PREFIX_LENGTH;
  const isAlreadyAfterPrefix = selectionStart === PHONE_PREFIX_LENGTH && selectionEnd === PHONE_PREFIX_LENGTH;
  if (!endsInsidePrefix || isAlreadyAfterPrefix) return;

  input.setSelectionRange(PHONE_PREFIX_LENGTH, PHONE_PREFIX_LENGTH);
}

/**
 * True for a whole number with its country code: text that starts with "+", or that is written only with dialing
 * characters and has 12 or more digits starting with 55. A DDD 55 local number (Rio Grande do Sul, 10 or 11 digits,
 * such as "55 90000-0000") is not one: it is a number that happens to start with 55 and keeps the browser's paste.
 */
export function isInternationalNumber(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith('+')) return true;
  if (!DIAL_CHARACTERS.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, '');
  return digits.startsWith(COUNTRY_CODE) && digits.length >= INTERNATIONAL_MIN_DIGITS;
}

/**
 * A pasted international number replaces the whole field, through the same path as typing (`onChange` takes the text
 * and the form formats it with formatWhatsappDisplay, which reads "+55" and a leading 55 as the country code). Left to
 * the browser it would be inserted behind the "+55 " that is already there and its country code read as the DDD.
 * Every other paste (a local number, an empty clipboard, other text) keeps the browser default.
 */
export function replaceWithInternationalPaste(event: ClipboardEvent<HTMLInputElement>, onChange: (text: string) => void) {
  const text = event.clipboardData.getData('text');
  if (!isInternationalNumber(text)) return;

  event.preventDefault();
  onChange(text);
}

/** What the WhatsApp field adds to a plain input. `onChange` is the one of the field: it formats the text it is given. */
export function whatsappInputProps(onChange: (text: string) => void) {
  return {
    inputMode: 'tel' as const,
    onSelect: keepCaretAfterPrefix,
    onClick: keepCaretAfterPrefix,
    onPaste: (event: ClipboardEvent<HTMLInputElement>) => replaceWithInternationalPaste(event, onChange),
  };
}
