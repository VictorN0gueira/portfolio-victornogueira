import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AccordionItem {
  /** Stable React key of the item: never shown, so a copy edit of the question cannot clash two items. */
  id: string;
  question: string;
  answer: string;
}

interface AccordionProps {
  items: ReadonlyArray<AccordionItem>;
  /** Shared by every item: the browser then keeps one item open at a time. Use a different name per accordion on a page. */
  name: string;
  /** Index of the item that starts open. -1 starts with all of them closed. */
  defaultOpenIndex?: number;
  className?: string;
}

const SUMMARY_CLASS = cn(
  'flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left',
  'text-base font-medium md:text-lg [&::-webkit-details-marker]:hidden',
  // The ring takes the text color, so it shows on light and dark sections alike.
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
);

/**
 * FAQ style list on native `<details name>`, so it works without JavaScript, is keyboard operable and is
 * exclusive (opening one closes the other) in browsers that support the name attribute. Colors follow the
 * surrounding text color. The open and close motion lives in tokens.css (.vn-accordion) and is instant
 * under reduced motion and the accessibility toggle.
 */
export function Accordion({ items, name, defaultOpenIndex = 0, className }: AccordionProps) {
  return (
    <div className={cn('border-t border-current/15', className)}>
      {items.map((item, index) => (
        <details key={item.id} name={name} open={index === defaultOpenIndex} className="vn-accordion border-b border-current/15">
          <summary className={SUMMARY_CLASS}>
            <span className="min-w-0 break-words">{item.question}</span>
            <Plus aria-hidden="true" className="vn-accordion-icon size-5 shrink-0" />
          </summary>
          <div className="vn-accordion-panel">
            <div className="min-h-0 overflow-hidden">
              <p className="pb-5 pr-9 text-sm leading-relaxed opacity-80 md:text-base">{item.answer}</p>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
