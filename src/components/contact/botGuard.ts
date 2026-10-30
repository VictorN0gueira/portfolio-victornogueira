/**
 * The quiet defences of the contact form against bots and double sends. None of them adds a key to the payload and
 * none asks the visitor for anything: the form posts to the n8n webhooks, the only lead channel of the business,
 * and nothing is allowed to sit in front of them.
 *
 * - Honeypot: a field no human sees. A bot that fills every input fills it too.
 * - Time trap: a form submitted less than MIN_FILL_MS after the visitor first touched it was not filled by a person.
 *   The clock starts at the first keyboard or pointer gesture on the fields (the mount, for a visitor with no gesture
 *   at all, such as autofill followed by Enter), so a visitor who simply arrives fast or reads for a while is never
 *   held back: only the time between the first gesture and Enviar counts.
 * - Cooldown: after a send that worked, another send waits COOLDOWN_MS, so a double click on Enviar outra or a
 *   script cannot flood the inbox.
 *
 * A bot caught by the honeypot or the time trap gets what a real send gives (the thanks), and nothing leaves the
 * browser, so it learns nothing and does not adapt.
 */

/** The shortest honest time between the first gesture on the form and Enviar. */
export const MIN_FILL_MS = 2_000;

/** How long after a successful send the next send is held. */
export const COOLDOWN_MS = 30_000;

export const COOLDOWN_MESSAGE = 'Já recebemos a sua mensagem. Aguarde alguns segundos para enviar outra.';

/** Name of the hidden input. Valid, boring and not one of the names a browser autofills. */
export const HONEYPOT_NAME = 'ref_interna';

export type SubmitVerdict = 'send' | 'bot' | 'cooldown';

export interface GuardClock {
  /** When the form mounted. */
  mountedAt: number;
  /** When the visitor first touched the fields, if they did. */
  firstGestureAt: number | null;
  /** When the last send that worked ended, if there was one. */
  lastSentAt: number | null;
  now: number;
}

/** What to do with a submit that already passed validation. */
export function judgeSubmit(honeypot: string, clock: GuardClock): SubmitVerdict {
  if (honeypot !== '') {
    return 'bot';
  }
  if (clock.lastSentAt !== null && clock.now - clock.lastSentAt < COOLDOWN_MS) {
    return 'cooldown';
  }
  const startedAt = clock.firstGestureAt ?? clock.mountedAt;
  return clock.now - startedAt < MIN_FILL_MS ? 'bot' : 'send';
}
