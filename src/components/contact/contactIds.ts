import { createContext, useContext } from 'react';
import type { ContactFields } from '../../lib/contact';

/** The DOM ids of one contact form, all built from one prefix so a page can hold more than one form. */
export function contactIds(prefix: string) {
  return {
    /** Id of the control of a field (`<prefix>-nome`). */
    field: (field: keyof ContactFields) => `${prefix}-${field}`,
    /** Id of the error line of a field, the one its aria-describedby points at. */
    error: (field: keyof ContactFields) => `${prefix}-${field}-error`,
    /** Id of the live region that tells a field has reached its cap. */
    cap: (field: keyof ContactFields) => `${prefix}-${field}-cap`,
    servicoLabel: `${prefix}-servico-label`,
    /** Id of the button of the service select, the one its label points at with `for`. */
    servicoTrigger: `${prefix}-servico`,
    whatsappHint: `${prefix}-whatsapp-hint`,
    submitHint: `${prefix}-submit-hint`,
    notice: `${prefix}-notice`,
  };
}

export type ContactIds = ReturnType<typeof contactIds>;

/** The prefix the form has always used. A page with one form needs nothing else. */
export const DEFAULT_ID_PREFIX = 'contact';

export const ContactIdsContext = createContext<ContactIds>(contactIds(DEFAULT_ID_PREFIX));

export function useContactIds(): ContactIds {
  return useContext(ContactIdsContext);
}
