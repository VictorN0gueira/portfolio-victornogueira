/**
 * A Radix modal locks the scroll of the page (react-remove-scroll). With a classic scrollbar, the lock removes the
 * scrollbar, so the viewport gets wider by the scrollbar width, and the library gives the body a margin of that width so
 * the content does not move. A fixed layer that sits at the edge of the viewport has no body around it: it moves by the
 * same width unless it carries this class, which the library styles with `right: <scrollbar width> !important` for as
 * long as the lock lasts (and which does nothing otherwise). The drawer and the overlay of the modals do not carry it:
 * they have to cover the whole, wider, viewport.
 * A layer with an offset of its own cannot use the class (`!important` replaces the offset), so it adds the width the
 * library keeps in a custom property of the body, and nothing when no modal is open.
 */
export const KEEPS_PLACE_UNDER_SCROLL_LOCK = 'right-scroll-bar-position';

/** The width of the scrollbar the open modal removed, as a CSS length (0px with no modal). */
export const SCROLL_LOCK_BAR_SIZE = 'var(--removed-body-scroll-bar-size, 0px)';
