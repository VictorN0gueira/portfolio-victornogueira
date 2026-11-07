import { useId } from 'react';
import { cardDescribedBy } from './blogMeta';

/**
 * The ids of the parts of a card. The name of the link is its text, the title, and the rest of the card (language and
 * topic, NOVO, summary, time and source) is its description, together with the new tab hint.
 */
export function useCardIds(hasNewPill: boolean) {
  const ids = useId();
  const tags = `${ids}-tags`;
  const novo = `${ids}-new`;
  const summary = `${ids}-summary`;
  const meta = `${ids}-meta`;

  return {
    tags,
    novo,
    summary,
    meta,
    describedBy: cardDescribedBy(tags, hasNewPill && novo, summary, meta),
  };
}
