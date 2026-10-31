// The chevron is out of the flow (absolute, at the right padding), so the text is the only item of the pill: the
// baseline of the pill, first and last, is the baseline of its text. A parent can then line something up with the
// last line of a pill whose text wrapped (the period after the task pill of the hero sentence does).
// The right padding is the chevron (0.55em) with its 0.6em margin and the 0.3em gap the pill had before.
export const TRIGGER_CLASSES = [
  'group relative inline-flex min-h-11 max-w-full items-center rounded-full border border-vn-gray-mid bg-vn-white',
  'py-[0.04em] pr-[1.45em] pl-[0.6em] text-left align-baseline text-vn-ink cursor-pointer select-none',
  'hover:bg-vn-cream data-[state=open]:bg-vn-cream',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-ink',
].join(' ');
