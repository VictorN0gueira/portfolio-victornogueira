import { animate, motion, useInView } from 'motion/react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { ChoicePill } from '../../components/ui/ChoicePill';
import { Cursor } from '../../components/ui/Cursor';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { heroTasks, type HeroTaskId } from '../../data/heroFlows';
import { homeCopy, type HeroHourOption, type HeroSentencePart, type HeroSentenceSlot } from '../../data/homeCopy';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { formatBRL } from '../../lib/format';
import { DEFAULT_HOURLY_RATE, monthlySavings } from '../../lib/roi';

const DEFAULT_HOURS: HeroHourOption['value'] = 10;
// The hours the visitor picks already count the whole team, so the team multiplier stays at 1.
const TEAM_MULTIPLIER = 1;
const WORD_STAGGER_S = 0.05;
const COUNT_DURATION_S = 0.55;
const ARROW_DURATION_S = 0.8;
const ARROW_DELAY_S = 1.2;
// The design system easing, as the cubic bezier points motion expects.
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
// Punctuation that starts a piece of the sentence sticks to the piece before it, with no space.
const STICKY_PUNCTUATION = /^[.,;:!?)]/;
const ONLY_PUNCTUATION = /^[.,;:!?)]+$/;
const WHITESPACE = /\s+/;

// leading-[1.22] is the documented exception to the title line height (0.92 to 0.98) for this interactive sentence:
// inline pills are 44px tall and bordered, so at the tight title leading the pills of one line collide with the next.
const HEADING_CLASSES = [
  'font-display font-bold lowercase tracking-[-0.03em] leading-[1.22] break-words',
  'text-[length:clamp(1.75rem,0.95rem+2.9vw,3.75rem)]',
].join(' ');
// The pills sit in the sentence as one more word: they scale with the heading, and a long one may wrap inside.
const PILL_SIZE_CLASSES = 'px-[0.6em] py-[0.04em]';
// A period is about 0.3em wide: this keeps that much of the line free next to the pill.
const PILL_ROOM_FOR_SUFFIX = 'max-w-[calc(100%-0.45em)]';
const RESULT_CLASSES = [
  'relative inline-flex min-h-11 max-w-full items-center rounded-full bg-vn-accent text-vn-black',
  'font-bold normal-case tabular-nums align-baseline',
  PILL_SIZE_CLASSES,
].join(' ');

interface SentenceToken {
  key: string;
  hasSpaceBefore: boolean;
  /** A word of the sentence, or null when the token is a pill. */
  word: string | null;
  slot: HeroSentenceSlot | null;
  /** Punctuation glued to the end of this token. It lives in the same item, so a line break cannot separate them. */
  suffix: string;
}

/**
 * Splits the sentence into words and slots, and decides where a real space goes between them. Punctuation that
 * stands alone after a piece (the period after the task pill) joins that piece: two items side by side with no
 * space between them could still be broken across lines, text right after a pill cannot.
 */
function tokenize(parts: readonly HeroSentencePart[]): SentenceToken[] {
  const tokens: SentenceToken[] = [];

  parts.forEach((part, partIndex) => {
    if (typeof part !== 'string') {
      tokens.push({ key: `slot-${part.slot}`, hasSpaceBefore: tokens.length > 0, word: null, slot: part.slot, suffix: '' });
      return;
    }

    const isSticky = STICKY_PUNCTUATION.test(part);
    part
      .split(WHITESPACE)
      .filter(Boolean)
      .forEach((word, wordIndex) => {
        const previous = tokens.at(-1);
        if (isSticky && wordIndex === 0 && previous && ONLY_PUNCTUATION.test(word)) {
          tokens[tokens.length - 1] = { ...previous, suffix: previous.suffix + word };
          return;
        }
        const hasSpaceBefore = tokens.length > 0 && !(wordIndex === 0 && isSticky);
        tokens.push({ key: `word-${partIndex}-${wordIndex}`, hasSpaceBefore, word, slot: null, suffix: '' });
      });
  });

  return tokens;
}

const SENTENCE_TOKENS = tokenize(homeCopy.hero.sentence);

interface ResultPillProps {
  amount: number;
}

/**
 * The monthly savings, as the only accent element of the hero. It is a live region (output), so a change is
 * announced once, as a whole. Screen readers get the final value from a text that only React updates; the number
 * people see counts through `data-value`, which the frames write straight to the DOM through a ref (no React
 * render per frame) and a pseudo element draws. That keeps the text of the region still while it counts.
 * Without motion the number jumps to its value.
 */
function ResultPill({ amount }: ResultPillProps) {
  const isMotionAllowed = useMotionAllowed();
  const finalText = formatBRL(amount);
  // Never changes, so React never rewrites data-value after mount and the frames own it from then on.
  const [initialText] = useState(finalText);
  const numberRef = useRef<HTMLSpanElement>(null);
  const shownRef = useRef(amount);

  useEffect(() => {
    const node = numberRef.current;
    if (!node || shownRef.current === amount) return undefined;

    const show = (value: number) => {
      shownRef.current = value;
      node.dataset.value = formatBRL(value);
    };

    if (!isMotionAllowed) {
      show(amount);
      return undefined;
    }

    const controls = animate(shownRef.current, amount, {
      duration: COUNT_DURATION_S,
      ease: EASE_OUT,
      onUpdate: (latest) => show(Math.round(latest)),
      onComplete: () => show(amount),
    });
    return () => controls.stop();
  }, [amount, isMotionAllowed]);

  return (
    <output aria-live="polite" aria-atomic="true" className={RESULT_CLASSES}>
      <span
        ref={numberRef}
        aria-hidden="true"
        data-value={initialText}
        className="before:content-[attr(data-value)]"
      />
      <span className="sr-only">{finalText}</span>
    </output>
  );
}

interface SentenceSlotProps {
  slot: HeroSentenceSlot;
  hours: HeroHourOption['value'];
  task: HeroTaskId;
  amount: number;
  /** True when punctuation follows the pill in the same item, so the pill leaves room for it. */
  hasSuffix: boolean;
  onHoursChange: (hours: HeroHourOption['value']) => void;
  onTaskChange: (task: HeroTaskId) => void;
}

/** The interactive piece that fills a slot of the sentence: one of the two pills, or the result. */
function SentenceSlot({ slot, hours, task, amount, hasSuffix, onHoursChange, onTaskChange }: SentenceSlotProps) {
  const { aria, hourOptions } = homeCopy.hero;
  // A pill with punctuation after it leaves room for it, so a pill as wide as the screen cannot push it off the line.
  const pillClasses = hasSuffix ? `lowercase ${PILL_ROOM_FOR_SUFFIX}` : 'lowercase';

  if (slot === 'hours') {
    return (
      <ChoicePill
        value={hours}
        options={hourOptions}
        onChange={onHoursChange}
        ariaLabel={aria.hoursPill}
        listLabel={aria.hoursList}
        className={pillClasses}
      />
    );
  }
  if (slot === 'task') {
    return (
      <ChoicePill
        value={task}
        options={heroTasks}
        onChange={onTaskChange}
        ariaLabel={aria.taskPill}
        listLabel={aria.taskList}
        className={pillClasses}
      />
    );
  }
  return <ResultPill amount={amount} />;
}

interface HeroSentenceProps {
  task: HeroTaskId;
  onTaskChange: (task: HeroTaskId) => void;
}

/**
 * The headline of the home: one sentence, readable as a whole, with two pills the visitor can change (hours per
 * week and the task) and a result pill that follows the hours. The task is controlled by the parent, because the
 * flow panel next to the headline shows the automation for that task; the hours are local. The pills sit inside
 * the h1 as buttons, each with its own accessible name. Every word enters with a rise and a blur, 0.05s apart,
 * and the heading wraps by itself, so the pills move to the next line when they do not fit (nothing is nowrap).
 * The reveal items are spans, because a heading only holds phrasing content.
 * Needs AccessibilityProvider above it. The annotation and the fine print are separate components
 * (HeroAnnotation, HeroFinePrint) so the hero layout can place them.
 */
export function HeroSentence({ task, onTaskChange }: HeroSentenceProps) {
  const [hours, setHours] = useState<HeroHourOption['value']>(DEFAULT_HOURS);
  const amount = monthlySavings({ hoursPerWeek: hours, teamMultiplier: TEAM_MULTIPLIER, hourlyRate: DEFAULT_HOURLY_RATE });
  const lastIndex = SENTENCE_TOKENS.length - 1;

  return (
    <RevealGroup as="h1" stagger={WORD_STAGGER_S} className={HEADING_CLASSES}>
      {SENTENCE_TOKENS.map((token, index) => (
        <Fragment key={token.key}>
          {token.hasSpaceBefore ? ' ' : null}
          <RevealItem as="span" variant="rise-blur" className="inline-block max-w-full">
            {token.slot ? (
              <SentenceSlot
                slot={token.slot}
                hours={hours}
                task={task}
                amount={amount}
                hasSuffix={token.suffix !== ''}
                onHoursChange={setHours}
                onTaskChange={onTaskChange}
              />
            ) : (
              token.word
            )}
            {token.suffix ? <span className="align-bottom">{token.suffix}</span> : null}
            {/* The cursor travels with the last word, so it never ends up alone on a line. */}
            {index === lastIndex ? <Cursor tone="ink" className="ml-[0.2em]" /> : null}
          </RevealItem>
        </Fragment>
      ))}
    </RevealGroup>
  );
}

/** The estimate behind the result pill: the rate and the share of time that the number is computed with. */
export function HeroFinePrint() {
  return <p className="text-sm text-vn-gray-dark">{homeCopy.hero.finePrint}</p>;
}

// A loose curve that rises from the text toward the headline, ending in an open arrowhead.
const ARROW_PATH = 'M64 50 C46 50 20 44 12 12 M4 22 L12 10 L22 18';

/**
 * The note that tells people the numbers are theirs to change. Only from the lg breakpoint, where the panel sits
 * beside the headline and the arrow can point at it; below that the note is hidden. The arrow draws itself once,
 * when the note comes into view, with a growing dash (pathLength), and is complete at once without motion.
 */
export function HeroAnnotation() {
  const isMotionAllowed = useMotionAllowed();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div
      ref={ref}
      data-hero-annotation=""
      className="hidden items-start gap-2 font-mono text-sm text-vn-gray-dark lg:flex"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 72 56"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-12 w-16 shrink-0"
      >
        {isMotionAllowed ? (
          <motion.path
            d={ARROW_PATH}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isInView ? 1 : 0 }}
            transition={{ duration: ARROW_DURATION_S, ease: EASE_OUT, delay: ARROW_DELAY_S }}
          />
        ) : (
          <path d={ARROW_PATH} />
        )}
      </svg>
      <p className="mt-3">{homeCopy.hero.annotation}</p>
    </div>
  );
}
