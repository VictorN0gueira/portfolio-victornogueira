// Class names and measures of the choice list (see ChoiceList.tsx), in VN One tokens only.

/** The two surfaces a list sits on: `light` is the hero (white panel, ink ring), `dark` is the black contact form. */
export type ChoiceTone = 'light' | 'dark';

const COLLISION_PADDING_PX = 12;
// The dark list stays inside the form, below the page's fixed header (z-50) in stacking order, so it must not open under
// it: the top edge keeps clear of the header (12px offset plus its height, with room for the larger font).
const FIXED_HEADER_CLEARANCE_PX = 96;
export const COLLISION_PADDING: Record<ChoiceTone, number | { top: number; right: number; bottom: number; left: number }> = {
  light: COLLISION_PADDING_PX,
  dark: { top: FIXED_HEADER_CLEARANCE_PX, right: COLLISION_PADDING_PX, bottom: COLLISION_PADDING_PX, left: COLLISION_PADDING_PX },
};
export const PANEL_OFFSET_PX = 8;

// The dark panel is as wide as the field that opened it, so a long service name wraps instead of leaving the form.
const PANEL_BASE = [
  'vn-choice-panel relative z-[100] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto',
  'overscroll-contain font-sans text-base normal-case tracking-normal',
].join(' ');

export const PANEL_CLASSES: Record<ChoiceTone, string> = {
  light: [
    PANEL_BASE,
    'w-max min-w-[min(11rem,92vw)] max-w-[min(92vw,20rem)] rounded-2xl border border-vn-gray-light bg-vn-white p-1.5',
    'font-medium text-vn-ink shadow-[0_12px_32px_-12px_rgba(10,10,10,.35)]',
  ].join(' '),
  dark: [
    PANEL_BASE,
    'w-[var(--radix-popover-trigger-width)] rounded-xl border border-vn-gray-mid bg-vn-ink p-1.5',
    'text-vn-white shadow-2xl shadow-vn-black/40',
  ].join(' '),
};

// The ring is drawn inside the row (negative offset), so the scroll box of the panel never clips it. It shows for the
// active row (the one that holds the focus, also under the pointer) and for any row that takes the focus by keyboard.
// The outline is never switched off on these elements: in Tailwind v4 that sets the outline style to none, and the width
// classes then draw nothing (src/test/outlineGuard.test.ts keeps the two apart).
const OPTION_BASE = [
  'flex min-h-11 cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 leading-tight',
  'focus-visible:outline-2 focus-visible:-outline-offset-2 data-[active=true]:outline-2 data-[active=true]:-outline-offset-2',
].join(' ');

export const OPTION_CLASSES: Record<ChoiceTone, string> = {
  light: `${OPTION_BASE} focus-visible:outline-vn-ink data-[active=true]:outline-vn-ink data-[active=true]:bg-vn-gray-light/40`,
  dark: `${OPTION_BASE} focus-visible:outline-vn-white data-[active=true]:outline-vn-white data-[active=true]:bg-vn-white/10`,
};
