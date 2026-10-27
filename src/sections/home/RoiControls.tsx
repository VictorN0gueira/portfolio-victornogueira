import { useId, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import { homeCopy } from '../../data/homeCopy';
import { TEAM_OPTIONS } from '../../lib/roi';
import { HOURS_MAX, HOURS_MIN, MAX_HOURLY_RATE, hoursPercent } from './roiInput';

const LABEL_CLASSES = 'text-base font-medium text-vn-white';
// min-h-11 is the 44px touch target. The 16px text keeps iOS from zooming the page when the field takes the focus,
// and scheme-dark draws the spin buttons for a dark surface. The border is gray mid (5.7:1 on the black).
const RATE_FIELD_CLASSES = [
  'mt-3 block min-h-11 w-full rounded-xl border border-vn-gray-mid bg-transparent px-4 py-2.5',
  'text-base tabular-nums text-vn-white scheme-dark',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-white',
].join(' ');
// A radio is a native input, visually hidden, and the span after it draws the option: peer-checked and
// peer-focus-visible style it from the state of the input, so the keyboard and the screen reader get a real radio.
// Forced colors drop the white background, so the chosen option is underlined there: a Highlight background made
// Chromium paint a plain backplate behind the text, and a text decoration needs no color pairing at all.
const OPTION_BOX_CLASSES = [
  'flex w-full items-center justify-center rounded-xl border border-vn-gray-mid px-2 py-2.5',
  'text-center text-sm leading-tight text-vn-white',
  'hover:border-vn-white',
  'peer-checked:border-vn-white peer-checked:bg-vn-white peer-checked:text-vn-ink',
  'forced-colors:peer-checked:underline forced-colors:peer-checked:decoration-2 forced-colors:peer-checked:underline-offset-4',
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-vn-white',
].join(' ');

interface HoursSliderProps {
  hours: number;
  onChange: (hours: number) => void;
}

/**
 * The hours of repetitive work per week: a native range input with a real label and its value next to it. The value
 * beside the label is hidden from assistive tech (aria-valuetext says it), and nothing here is a live region, so a
 * drag never makes a screen reader speak on every tick. The input is 44px tall for the finger; vn-range draws the
 * track in its middle, with the filled part taken from --vn-range-fill.
 */
function HoursSlider({ hours, onChange }: HoursSliderProps) {
  const id = useId();
  const { labels, hoursShown, aria } = homeCopy.roi;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className={LABEL_CLASSES}>
          {labels.hours}
        </label>
        <span aria-hidden="true" className="shrink-0 font-mono text-xl tabular-nums text-vn-white">
          {hoursShown(hours)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={HOURS_MIN}
        max={HOURS_MAX}
        step={1}
        value={hours}
        aria-valuetext={aria.hoursValue(hours)}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ '--vn-range-fill': `${hoursPercent(hours)}%` } as CSSProperties}
        className="vn-range h-11 w-full"
      />
    </div>
  );
}

interface TeamRadiosProps {
  selectedIndex: number;
  onChange: (index: number) => void;
}

/**
 * How many people do the work: a radio group of native radio inputs (one name, so the browser gives the group a
 * single tab stop and moves the choice with the arrow keys, wrapping at the ends). Home and End are added here:
 * they focus and choose the first and the last option. Each option is at least 44px tall, a 2 by 2 grid below sm
 * and one row from sm.
 */
function TeamRadios({ selectedIndex, onChange }: TeamRadiosProps) {
  const labelId = useId();
  const groupName = useId();

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Home' && event.key !== 'End') return;
    if (!(event.target instanceof HTMLInputElement)) return;

    const radios = event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    const index = event.key === 'Home' ? 0 : radios.length - 1;
    event.preventDefault();
    radios[index].focus();
    onChange(index);
  };

  return (
    <div>
      <p id={labelId} className={LABEL_CLASSES}>
        {homeCopy.roi.labels.team}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={handleKeyDown}
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {TEAM_OPTIONS.map((option, index) => (
          <label key={option.label} className="relative flex min-h-11 cursor-pointer">
            <input
              type="radio"
              name={groupName}
              value={option.label}
              checked={index === selectedIndex}
              onChange={() => onChange(index)}
              className="peer sr-only"
            />
            <span className={OPTION_BOX_CLASSES}>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

interface RateFieldProps {
  text: string;
  /** Said under the field when the rate is counted at its ceiling, and linked to the field with aria-describedby. */
  capNote: string | null;
  /** The text as typed, and whether the browser calls it incomplete (a number field has no value for "12." yet). */
  onChange: (text: string, isIncomplete: boolean) => void;
}

/**
 * The hourly rate: a number field that holds the text as typed. Turning it into a number is parseHourlyRate's job.
 * One handler goes to onChange and to onInput. React calls onChange only when the value of the field changed, and
 * clearing text the browser called incomplete ("12." has no value) leaves the value '' (nothing changed) with badInput
 * going from true to false: only the input event, which React does not de-duplicate by value, reports it. For a
 * keystroke both run with the same arguments, and the handler is idempotent (it sets the same state twice in one
 * batch, so there is a single render and nothing loops).
 */
function RateField({ text, capNote, onChange }: RateFieldProps) {
  const id = useId();
  const noteId = useId();
  const handleInput = (event: FormEvent<HTMLInputElement>) =>
    onChange(event.currentTarget.value, event.currentTarget.validity.badInput);

  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASSES}>
        {homeCopy.roi.labels.rate}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={MAX_HOURLY_RATE}
        step="any"
        value={text}
        aria-describedby={capNote ? noteId : undefined}
        onChange={handleInput}
        onInput={handleInput}
        className={RATE_FIELD_CLASSES}
      />
      {capNote ? (
        <p id={noteId} className="mt-2 text-sm text-vn-gray-light">
          {capNote}
        </p>
      ) : null}
    </div>
  );
}

interface RoiControlsProps {
  hours: number;
  onHoursChange: (hours: number) => void;
  teamIndex: number;
  onTeamChange: (index: number) => void;
  rateText: string;
  rateCapNote: string | null;
  onRateChange: (text: string, isIncomplete: boolean) => void;
}

/** The three controls of the simulator, in the order of the formula: hours, people and the hourly rate. */
export function RoiControls({
  hours,
  onHoursChange,
  teamIndex,
  onTeamChange,
  rateText,
  rateCapNote,
  onRateChange,
}: RoiControlsProps) {
  return (
    <div className="flex flex-col gap-8">
      <HoursSlider hours={hours} onChange={onHoursChange} />
      <TeamRadios selectedIndex={teamIndex} onChange={onTeamChange} />
      <RateField text={rateText} capNote={rateCapNote} onChange={onRateChange} />
    </div>
  );
}

export default RoiControls;
