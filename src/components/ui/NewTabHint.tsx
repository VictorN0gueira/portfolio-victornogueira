/** What a screen reader adds to a link that opens a new tab. */
export const NEW_TAB_HINT = 'abre em nova aba';

interface NewTabHintProps {
  /** The id the links of the page that open a new tab point at with aria-describedby. */
  id: string;
}

/**
 * The text that tells a screen reader a link opens in a new tab. Render it once next to the links and give each of them
 * `aria-describedby={id}`: the name of the link does not change (a link named "Falar no WhatsApp" stays that), the
 * hint is read after it as the description. It carries the `hidden` attribute, not a visually hidden class: a node
 * that is hidden still counts when an aria-describedby names it, but it is out of the reading flow, so browse mode
 * never reads "abre em nova aba" as a loose sentence of its own.
 */
export function NewTabHint({ id }: NewTabHintProps) {
  return (
    <span id={id} hidden>
      {NEW_TAB_HINT}
    </span>
  );
}
