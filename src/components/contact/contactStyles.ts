// Class names of the contact form on a black surface, in VN One tokens only. They are plain strings, not cn() calls,
// so no class merge can drop one of them; the tests read the rendered class lists to pin that.

/** The rounded panel the whole form (and its success message) sits in. */
export const PANEL_CLASS =
  'rounded-card border border-vn-white/10 bg-vn-white/5 p-4 xs:p-6 md:p-8';

export const LABEL_CLASS = 'block text-sm font-medium text-vn-white';

/** A link inside the form: underlined, with the white ring every other control of the black panel has. */
export const LINK_CLASS =
  'rounded-sm text-vn-white underline vn-focus-ring';

// 16px text at every width (iOS zooms the page into a field below 16px), a 44px height and a white focus ring (more than
// 3:1 on the black). Shared by the text fields and the trigger of the service select; the display is left to the user.
// The side padding is 2px smaller below 360px so the longest placeholder still fits a 280px screen, and a placeholder or
// a value that is still too long ends in an ellipsis instead of being cut.
export const FIELD_CLASS = [
  'min-h-11 w-full rounded-xl border bg-vn-white/5 px-3.5 py-3 text-base text-vn-white text-ellipsis xs:px-4',
  'placeholder:text-vn-gray-mid',
  'vn-focus-ring',
].join(' ');

export const FIELD_VALID_CLASS = 'border-vn-gray-mid';

// A field in error gets a white border drawn twice as heavy (the border plus an inset line), so the state does not
// depend on color: the message with its icon and aria-invalid say it too.
export const FIELD_INVALID_CLASS = 'border-vn-white shadow-[inset_0_0_0_1px_var(--color-vn-white)]';
