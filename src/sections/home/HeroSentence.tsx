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
import { groupWords } from './heroWords';

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
// The size never goes below 9vw at the smallest phones: with the larger font, 1.75rem is 33.6px, and at 280px a word like
// "Automatizando," is wider than the 220px of the heading, so a line break would cut it. From about 330px the rem floor wins.
const HEADING_CLASSES = [
  'font-display font-bold lowercase tracking-[-0.03em] leading-[1.22] break-words [text-wrap:balance]',
  'text-[length:clamp(min(1.75rem,9vw),0.95rem+2.9vw,3.75rem)]',
].join(' ');
// The pills sit in the sentence as one more word: they scale with the heading, and a long one may wrap inside.
const PILL_SIZE_CLASSES = 'px-[0.6em] py-[0.04em]';
// An item with punctuation glued to it is a flex row. The punctuation never shrinks and the pill, which may shrink
// (min-w-0), takes the rest of the width, so the period always keeps its room and a pill that fits on the line is
// never narrowed. (A percentage max-width on the pill resolved against the item, which is only as wide as the pill
// and the period together, and cut the pill a few pixels short: its text wrapped on a line wide enough for it.)
// The row aligns the last baseline of its items. The text is the only item of a ChoicePill (its chevron is out of
// the flow), so the pill's last baseline is the baseline of its last text line: the period lands on it, on one line
// and on a pill whose text wrapped alike (measured in Chromium, 0px apart from 280px up to 1440px).
// The corner of a choice pill is 0.8em, not fully round: on one line the radius is capped at half the height, so
// the pill is still a capsule, and when a long option wraps it stays a soft rectangle where rounded-full would
// become an oval that clips the text at its corners.
const PILL_CORNER_CLASSES = 'lowercase rounded-[0.8em]';
const ITEM_CLASSES = 'inline-block max-w-full';
const ITEM_WITH_SUFFIX_CLASSES = 'inline-flex max-w-full items-baseline-last';
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
    groupWords(part.split(WHITESPACE).filter(Boolean)).forEach((word, wordIndex) => {
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
 * The monthly savings, as the only accent element of the hero. It is a plain span, with no status or output role
 * (a name built from content skips those, and the heading name has to carry the amount); the announcement of a
 * change is a separate status region outside the heading (see HeroSentence). Screen readers get the final value
 * from a visually hidden text that only React updates; the number people see counts through `data-value`, which the
 * frames write straight to the DOM through a ref (no React render per frame) and a pseudo element draws.
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
    <span className={RESULT_CLASSES}>
      <span
        ref={numberRef}
        aria-hidden="true"
        data-value={initialText}
        className="before:content-[attr(data-value)]"
      />
      <span className="sr-only">{finalText}</span>
    </span>
  );
}

interface SentenceSlotProps {
  slot: HeroSentenceSlot;
  hours: HeroHourOption['value'];
  task: HeroTaskId;
  amount: number;
  /** True when punctuation follows the pill in the same item, so the pill may shrink to leave room for it. */
  hasSuffix: boolean;
  onHoursChange: (hours: HeroHourOption['value']) => void;
  onTaskChange: (task: HeroTaskId) => void;
}

/** The interactive piece that fills a slot of the sentence: one of the two pills, or the result. */
function SentenceSlot({ slot, hours, task, amount, hasSuffix, onHoursChange, onTaskChange }: SentenceSlotProps) {
  const { aria, hourOptions } = homeCopy.hero;
  // A pill with punctuation after it is a shrinkable flex item, so a pill as wide as the screen cannot push it off the line.
  const pillClasses = hasSuffix ? `${PILL_CORNER_CLASSES} min-w-0` : PILL_CORNER_CLASSES;

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

/** The monthly savings the sentence shows for a number of weekly hours. */
function savingsFor(hours: HeroHourOption['value']): number {
  return monthlySavings({ hoursPerWeek: hours, teamMultiplier: TEAM_MULTIPLIER, hourlyRate: DEFAULT_HOURLY_RATE });
}

/**
 * The headline of the home: one sentence, readable as a whole, with two pills the visitor can change (hours per
 * week and the task) and a result pill that follows the hours. The task is controlled by the parent, because the
 * flow panel next to the headline shows the automation for that task; the hours are local. The pills sit inside
 * the h1 as buttons, each with its own accessible name, and the result is a plain span, so the name of the heading
 * carries every value. Every word enters with a rise (opacity and position, no blur filter: about twenty blurred
 * words are costly on weak GPUs and delay the first legible text), 0.05s apart, the last two words of a run of text stay together, and the heading wraps by itself, so
 * the pills move to the next line when they do not fit (nothing is nowrap). The reveal items are spans, because a
 * heading only holds phrasing content.
 * The announcement of a change lives next to the heading, not in it: a visually hidden status region (polite,
 * atomic) that is empty on first render and reads "Estimativa: R$ 3.467 por mês" after the hours change. It speaks
 * only when the hours change, because the task does not move the estimate, and it speaks the final number at once
 * while the visible one counts. The wrapper is a single block, so a parent that spaces its children sees one.
 * Needs AccessibilityProvider above it. The annotation and the fine print are separate components
 * (HeroAnnotation, HeroFinePrint) so the hero layout can place them.
 */
export function HeroSentence({ task, onTaskChange }: HeroSentenceProps) {
  const [hours, setHours] = useState<HeroHourOption['value']>(DEFAULT_HOURS);
  const [announcement, setAnnouncement] = useState('');
  const lastIndex = SENTENCE_TOKENS.length - 1;

  const handleHoursChange = (nextHours: HeroHourOption['value']) => {
    // ChoicePill reports a choice even when it is the option already chosen: nothing changed, so nothing is announced.
    if (nextHours === hours) return;
    setHours(nextHours);
    setAnnouncement(homeCopy.hero.aria.estimate(formatBRL(savingsFor(nextHours))));
  };

  return (
    <div className="relative">
      <RevealGroup as="h1" stagger={WORD_STAGGER_S} className={HEADING_CLASSES}>
        {SENTENCE_TOKENS.map((token, index) => (
          <Fragment key={token.key}>
            {token.hasSpaceBefore ? ' ' : null}
            <RevealItem
              as="span"
              variant="up"
              className={token.suffix ? ITEM_WITH_SUFFIX_CLASSES : ITEM_CLASSES}
            >
              {token.slot ? (
                <SentenceSlot
                  slot={token.slot}
                  hours={hours}
                  task={task}
                  amount={savingsFor(hours)}
                  hasSuffix={token.suffix !== ''}
                  onHoursChange={handleHoursChange}
                  onTaskChange={onTaskChange}
                />
              ) : (
                token.word
              )}
              {token.suffix ? <span className="shrink-0">{token.suffix}</span> : null}
              {/* The cursor travels with the last word, so it never ends up alone on a line. */}
              {index === lastIndex ? <Cursor tone="ink" className="ml-[0.2em]" /> : null}
            </RevealItem>
          </Fragment>
        ))}
      </RevealGroup>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/** The estimate behind the result pill: the rate and the share of time that the number is computed with. */
export function HeroFinePrint() {
  return <p className="text-sm text-vn-gray-dark">{homeCopy.hero.finePrint}</p>;
}

// A loose curve that starts beside the note and rises up and to the left, toward the numbers of the sentence
// above it, ending in an open arrowhead.
const ARROW_PATH = 'M64 50 C46 50 20 44 12 12 M4 22 L12 10 L22 18';

const COMMENT_GLYPH = /^(\/\/)\s*/;

/** A leading "//" is a comment glyph: it is drawn, but a screen reader does not say "slash slash". */
function AnnotationText({ text }: { text: string }) {
  const glyph = COMMENT_GLYPH.exec(text);
  if (!glyph) return <p className="mt-3">{text}</p>;

  return (
    <p className="mt-3">
      <span aria-hidden="true">{glyph[1]}</span> {text.slice(glyph[0].length)}
    </p>
  );
}

/**
 * The note that tells people the numbers are theirs to change.
 * HeroSection places it directly under the sentence, at its right side, so the arrow rises to the numbers in the
 * sentence (the hours pill and the result).
 * It is shown from the lg breakpoint and hidden below it, where the sentence takes the whole width.
 * The arrow draws itself once, when the note comes into view, with a growing dash (pathLength), and is complete
 * at once without motion.
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
      <AnnotationText text={homeCopy.hero.annotation} />
    </div>
  );
}
