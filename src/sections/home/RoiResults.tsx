import { Button } from '../../components/ui/Button';
import { homeCopy } from '../../data/homeCopy';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatBRL } from '../../lib/format';
import { cn } from '../../lib/utils';
import { AnimatedCurrency } from './AnimatedCurrency';

/** How long the values must stay still before the status region announces them. */
const STATUS_DEBOUNCE_MS = 600;

// Both numbers take their size from the width of their own box (cqi), never from the digits they show, so the box
// never changes size while the number counts. The biggest number the simulator can draw is R$ 312.000.000 (80 hours,
// more than 10 people, R$ 5.000 per hour): 14 characters, 7.25em wide in Space Grotesk bold with tabular figures
// (measured in Chromium), so a size of 100cqi divided by 7.5 is the largest at which it fits its box, with a margin of
// 3%. The clamp before it is the size on a roomy screen. Both are literal classes, because Tailwind only finds class
// names written out whole.
const COST_SIZE_CLASSES = 'text-[length:min(clamp(1.75rem,1.2rem+2.4vw,2.75rem),calc(100cqi/7.5))]';
const SAVINGS_SIZE_CLASSES = 'text-[length:min(clamp(2.5rem,1.5rem+5vw,5rem),calc(100cqi/7.5))]';
const NUMBER_CLASSES = 'mt-2 block font-display font-bold leading-none tracking-[-0.03em]';
// Forced colors drop the white background of the button, so it keeps a border in the system text color there.
const CTA_CLASSES = 'w-full sm:w-auto sm:self-start forced-colors:border forced-colors:border-[color:ButtonText]';

interface ResultFigureProps {
  label: string;
  value: number;
  numberClassName: string;
}

/** A label over a number. The @container is the box the number measures itself against. */
function ResultFigure({ label, value, numberClassName }: ResultFigureProps) {
  return (
    <div className="@container min-w-0">
      <p className="text-sm text-vn-gray-light">{label}</p>
      <AnimatedCurrency value={value} className={cn(NUMBER_CLASSES, numberClassName)} />
    </div>
  );
}

interface RoiResultsProps {
  /** The cost a year of the work as it is today, in whole reais. */
  cost: number;
  /** The estimated savings a year, in whole reais. */
  savings: number;
  onQuoteRequest: () => void;
}

/**
 * The results panel: the yearly cost in white and the yearly savings in the accent (the only accent of the
 * section), the note that says it is an estimate, and the call to action.
 * The figures count, so they are hidden from assistive tech together with their labels, and one visually hidden
 * status region says both final values instead: it starts with them, so a reader browsing the page finds them, and it
 * changes only after the values have stayed still for 600ms, so a drag of the slider is announced once, at its end.
 */
export function RoiResults({ cost, savings, onQuoteRequest }: RoiResultsProps) {
  const { results, note, cta, aria } = homeCopy.roi;
  const announcement = useDebouncedValue(aria.status(formatBRL(cost), formatBRL(savings)), STATUS_DEBOUNCE_MS);

  return (
    <div className="flex flex-col gap-6 rounded-[clamp(20px,3vw,28px)] border border-vn-white/10 bg-vn-white/5 p-5 min-[360px]:p-6 md:p-8">
      <div aria-hidden="true" className="flex flex-col gap-6">
        <ResultFigure label={results.cost} value={cost} numberClassName={cn(COST_SIZE_CLASSES, 'text-vn-white')} />
        <div className="h-px bg-vn-white/10" />
        <ResultFigure
          label={results.savings}
          value={savings}
          numberClassName={cn(SAVINGS_SIZE_CLASSES, 'text-vn-accent')}
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

export default RoiResults;
