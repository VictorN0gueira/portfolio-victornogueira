import type { CSSProperties } from 'react';
import { Button } from '../../components/ui/Button';
import { homeCopy } from '../../data/homeCopy';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatBRL } from '../../lib/format';
import { cn } from '../../lib/utils';
import { AnimatedCurrency } from './AnimatedCurrency';
import { amountWidthEm } from './amountFit';

/** How long the values must stay still before the status region announces them. */
const STATUS_DEBOUNCE_MS = 600;

// Each number is sized to fit its FINAL text: the size is the brief clamp, capped by the width of its box divided by the
// width of that text in em (--vn-fit-em, set on the box from amountFit.ts). So a short amount gets the full clamp and a
// longer one steps down, and nothing ever overflows the panel. The line box reserves the clamp (min-h), so the panel
// keeps its height whatever the number of digits. All of them are literal classes, because Tailwind only finds class
// names written out whole.
const COST_SIZE_CLASSES = 'text-[length:min(clamp(1.75rem,1.2rem+2.4vw,2.75rem),calc(100cqi/var(--vn-fit-em)))]';
const SAVINGS_SIZE_CLASSES = 'text-[length:min(clamp(2.5rem,1.5rem+5vw,5rem),calc(100cqi/var(--vn-fit-em)))]';
const COST_LINE_CLASSES = 'min-h-[clamp(1.75rem,1.2rem+2.4vw,2.75rem)]';
const SAVINGS_LINE_CLASSES = 'min-h-[clamp(2.5rem,1.5rem+5vw,5rem)]';
// leading-none must come after the font size class when they are merged: twMerge drops a leading class that sits before a
// font size one, and the line would take the 1.5 line height of the body and outgrow the line box that is reserved for it.
const NUMBER_CLASSES = 'block font-display font-bold leading-none tracking-[-0.03em]';
// Forced colors drop the white background of the button, so it keeps a border in the system text color there.
const CTA_CLASSES = 'w-full sm:w-auto sm:self-start forced-colors:border forced-colors:border-[color:ButtonText]';

interface ResultFigureProps {
  label: string;
  value: number;
  numberClassName: string;
  lineClassName: string;
}

/**
 * A label over a number. The @container is the box the number measures itself against, and it carries the width of
 * the final text in em for the number to divide by. React writes a number custom property without a unit.
 */
function ResultFigure({ label, value, numberClassName, lineClassName }: ResultFigureProps) {
  return (
    <div className="@container min-w-0" style={{ '--vn-fit-em': amountWidthEm(value) } as CSSProperties}>
      <p className="text-sm text-vn-gray-light">{label}</p>
      <div className={cn('mt-2', lineClassName)}>
        <AnimatedCurrency value={value} className={cn(numberClassName, NUMBER_CLASSES)} />
      </div>
    </div>
  );
}

interface RoiResultsProps {
  /** The cost a year of the work as it is today, in whole reais. */
  cost: number;
  /** The estimated savings a year, in whole reais. */
  savings: number;
  /** Said after the values when the rate was counted at its ceiling, so a screen reader hears it too. */
  rateCapNote?: string | null;
  /** Said after the values when the rate typed cannot be used (negative, unreadable): the field alone does not speak on change. */
  rateIssueNote?: string | null;
  onQuoteRequest: () => void;
}

/**
 * The results panel: the yearly cost in white and the yearly savings in the accent (the only accent of the
 * section), the note that says it is an estimate, and the call to action.
 * The figures count, so they are hidden from assistive tech together with their labels, and one visually hidden
 * status region says both final values instead: it starts with them, so a reader browsing the page finds them, and it
 * changes only after the values have stayed still for 600ms, so a drag of the slider is announced once, at its end.
 * The note about the rate ceiling and the note about a rate that cannot be used, when there is one, end the same
 * sentence: there is only this one status region.
 */
export function RoiResults({ cost, savings, rateCapNote = null, rateIssueNote = null, onQuoteRequest }: RoiResultsProps) {
  const { results, note, cta, aria } = homeCopy.roi;
  const sentence = [aria.status(formatBRL(cost), formatBRL(savings)), rateCapNote, rateIssueNote].filter(Boolean).join(' ');
  const announcement = useDebouncedValue(sentence, STATUS_DEBOUNCE_MS);

  return (
    <div className="flex flex-col gap-6 rounded-[clamp(20px,3vw,28px)] border border-vn-white/10 bg-vn-white/5 p-5 min-[360px]:p-6 md:p-8">
      <div aria-hidden="true" className="flex flex-col gap-6">
        <ResultFigure
          label={results.cost}
          value={cost}
          numberClassName={cn(COST_SIZE_CLASSES, 'text-vn-white')}
          lineClassName={COST_LINE_CLASSES}
        />
        <div className="h-px bg-vn-white/10" />
        <ResultFigure
          label={results.savings}
          value={savings}
          numberClassName={cn(SAVINGS_SIZE_CLASSES, 'text-vn-accent')}
          lineClassName={SAVINGS_LINE_CLASSES}
        />
      </div>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
      <p className="text-sm text-vn-gray-light">{note}</p>
      <Button tone="dark" size="lg" className={CTA_CLASSES} onClick={onQuoteRequest}>
        {cta}
      </Button>
    </div>
  );
}
