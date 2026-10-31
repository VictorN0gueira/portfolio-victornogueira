import { contactFormCopy } from './contactFormCopy';

interface FieldCapHintProps {
  /** Id of the live region (one per field, `contact-<field>-cap`). */
  id: string;
  /** Characters the field holds now. */
  length: number;
  /** The cap of the field (its maxLength); a field with no cap has no hint. */
  max?: number;
}

/**
 * What tells the visitor that a field has reached its cap: typing stops there and a longer paste is cut, and without
 * this the end of the text would be gone without a word. Two parts, so it is read once and costs no space:
 * - a live region that is always in the DOM, visually hidden, which only changes its text at the cap (a live region that
 *   mounts together with its text is skipped by many screen readers, so it must already be there). It is polite, and it
 *   has no `role`: the form keeps exactly one status region, the thanks, and the cap is not an alert either;
 * - the visible line, hidden from assistive tech so nothing is announced twice, and out of the layout flow (it sits in
 *   the gap under the field, see FieldFrame), so reaching the cap moves nothing below it.
 * Both appear from the cap on and go as soon as the text gets shorter.
 */
export function FieldCapHint({ id, length, max }: FieldCapHintProps) {
  if (max === undefined) return null;
  const text = length >= max ? contactFormCopy.capHint(max) : '';

  return (
    <>
      <p id={id} aria-live="polite" aria-atomic="true" className="sr-only">
        {text}
      </p>
      {text && (
        <p aria-hidden="true" className="pointer-events-none absolute left-0 top-full text-sm leading-5 text-vn-gray-light">
          {text}
        </p>
      )}
    </>
  );
}
