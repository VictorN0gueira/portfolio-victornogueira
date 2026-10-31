import { useEffect, useRef, type RefObject } from 'react';
import type { ContactErrors } from '../../lib/contact';
import type { ContactStatus } from './useContactForm';

const FIRST_INVALID_FIELD = '[aria-invalid="true"]';
const WHATSAPP_LINK_IN_ALERT = '[role="alert"] a';
const SUBMIT_BUTTON = 'button[type="submit"]';

/** Focus has nowhere useful to be: it fell to the page, or it sits on a button that was just switched off. */
function isFocusLost(): boolean {
  const active = document.activeElement;
  return !active || active === document.body || (active instanceof HTMLButtonElement && active.disabled);
}

/**
 * Where the focus goes as the form moves between its states. The submit (handleSubmit) is not touched: this only reacts
 * to what it left behind.
 * - A submit that ended in errors puts the focus on the first invalid field, in page order. `submitCount` is bumped on
 *   every submit, so typing (which also changes the errors) never takes the focus back.
 * - Enviar switches itself off while the request is out, and the browser then drops the focus: the panel takes it, so
 *   a keyboard visitor is not sent back to the top of the page.
 * - A failed send puts the focus on the link to WhatsApp inside the alert; closing the alert puts it back on Enviar.
 */
export function useContactFocus(
  panelRef: RefObject<HTMLElement | null>,
  status: ContactStatus,
  errors: ContactErrors,
  submitCount: number,
) {
  const handledSubmit = useRef(0);
  const previousStatus = useRef(status);

  useEffect(() => {
    if (submitCount === handledSubmit.current) return;
    handledSubmit.current = submitCount;
    panelRef.current?.querySelector<HTMLElement>(FIRST_INVALID_FIELD)?.focus();
  }, [submitCount, errors, panelRef]);

  useEffect(() => {
    const before = previousStatus.current;
    previousStatus.current = status;
    const panel = panelRef.current;
    if (!panel || before === status) return;

    if (status === 'sending' && isFocusLost()) panel.focus({ preventScroll: true });
    else if (status === 'error') panel.querySelector<HTMLElement>(WHATSAPP_LINK_IN_ALERT)?.focus();
    else if (before === 'error' && status === 'idle' && isFocusLost()) {
      panel.querySelector<HTMLElement>(SUBMIT_BUTTON)?.focus();
    }
  }, [status, panelRef]);
}
