import { contactFormCopy } from './contactFormCopy';

interface FieldCapHintProps {
  /** Characters the field holds now. */
  length: number;
  /** The cap of the field (its maxLength); a field with no cap shows no hint. */
  max?: number;
}

/**
 * A short line under a field that has reached its cap: typing stops there and a longer paste is cut, and without this
 * line the visitor would not know the end of the text is gone. A polite status, not an alert: nothing is wrong yet, the
 * text is only as long as it can be. It is shown from the cap on and goes away as soon as the text gets shorter.
 */
export default function FieldCapHint({ length, max }: FieldCapHintProps) {
  if (max === undefined || length < max) return null;

  return (
    <p role="status" aria-live="polite" className="text-sm text-vn-gray-light">
      {contactFormCopy.capHint(max)}
    </p>
  );
}
