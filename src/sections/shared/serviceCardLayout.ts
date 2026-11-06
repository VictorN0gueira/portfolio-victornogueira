// 1 column, 2 from md and 3 from lg. The cards of a row share their five parts (kicker, name, description, list, term)
// through a subgrid from md: the grid, the item, the article and the surface each span the five rows and take them
// from the level above, so the name, the divider, the list and the term line up across the cards whatever wraps.
// There is no row gap in the grid (it would open a gap between the five rows of one card): each item carries its own
// bottom margin from md.
export const SERVICE_GRID_CLASSES = 'grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-5 md:gap-y-0 lg:grid-cols-3';
export const SERVICE_SUBGRID_CLASSES = 'md:row-span-5 md:grid md:grid-cols-[minmax(0,1fr)] md:grid-rows-subgrid';
/** The item that wraps a card in the grid: it is a subgrid too, and carries the space between rows. */
export const SERVICE_ITEM_CLASSES = `flex md:mb-5 ${SERVICE_SUBGRID_CLASSES}`;
