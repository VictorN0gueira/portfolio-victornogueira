/**
 * The quiet defences of the contact form against bots and double sends. None of them adds a key to the payload and
 * none asks the visitor for anything: the form posts to the n8n webhooks, the only lead channel of the business,
 * and a real lead must never be lost to a defence.
 *
 * - Honeypot: a field no human sees. A bot that fills every input fills it too, and then gets what a real send gives
 *   (the thanks) while nothing leaves the browser, so it learns nothing and does not adapt. A person never fills it.
 * - Time trap: a form submitted less than MIN_FILL_MS after the visitor first touched it is not dropped. It is held:
 *   the form shows its normal Enviando state, waits the rest of the time (at most MIN_FILL_MS), and then sends the
 *   real request and shows the real answer. The clock starts at the first keyboard or pointer gesture on the fields
 *   (the mount, for a visitor with no gesture at all, such as autofill followed by Enter). A fast person only waits a
 *   moment; a bot that does not wait is still caught by the honeypot.
 * - Cooldown: after a send that worked (never after an error), another send within COOLDOWN_MS is not made and the
 *   visitor is told so in a visible line, so a double click on Enviar outra or a script cannot flood the inbox.
 */

/** The shortest honest time between the first gesture on the form and the request. A faster submit waits the rest. */
export const MIN_FILL_MS = 2_000;

/** How long after a successful send the next send is held. */
export const COOLDOWN_MS = 30_000;

export const COOLDOWN_MESSAGE = 'Já recebemos a sua mensagem. Aguarde alguns segundos para enviar outra.';

/** Name of the hidden input. Valid, boring and not one of the names a browser autofills. */
export const HONEYPOT_NAME = 'ref_interna';

export type SubmitVerdict =
  /** Send the real request after `waitMs` (0 when the visitor already took their time). */
  | { action: 'send'; waitMs: number }
  /** Honeypot filled: answer with the thanks and send nothing. */
  | { action: 'bot' }
  /** A send worked less than COOLDOWN_MS ago: send nothing and say so. */
  | { action: 'cooldown' };

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
    return { action: 'bot' };
  }
  if (clock.lastSentAt !== null && clock.now - clock.lastSentAt < COOLDOWN_MS) {
    return { action: 'cooldown' };
  }
  const startedAt = clock.firstGestureAt ?? clock.mountedAt;
  return { action: 'send', waitMs: Math.max(0, MIN_FILL_MS - (clock.now - startedAt)) };
}
