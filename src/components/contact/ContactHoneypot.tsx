import { HONEYPOT_NAME } from './botGuard';

interface ContactHoneypotProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * The honeypot: an input no person ever meets. It is out of the layout (the same visually hidden class the form already
 * uses), out of the accessibility tree (aria-hidden), out of the tab order (tabIndex -1), and told to browsers and
 * password managers to leave it alone (autocomplete off, a name with no word in it, no id and no label, and the ignore flags
 * of 1Password, LastPass and Bitwarden and a form type hint). A bot that fills every input
 * fills this one too, and the submit then sends nothing (see botGuard.ts). It is not a payload key: only the four
 * fields of the form are ever sent.
 */
export function ContactHoneypot({ value, onChange }: ContactHoneypotProps) {
  return (
    <div aria-hidden="true" className="sr-only">
      <input
        type="text"
        name={HONEYPOT_NAME}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-bwignore="true"
        data-form-type="other"
      />
    </div>
  );
}

export default ContactHoneypot;
