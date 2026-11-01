/** The grid has 2 columns below md, and the last logo spans both when the rows would end on a lone cell. */
const COLUMNS_BASE = 2;

/**
 * True for the last logo when the rows at 2 columns would end on a lone cell: it then spans both columns. From md it
 * stops spanning, because there the columns are 3 and the 9 logos make whole rows.
 */
export function spansLastRow(position: number, count: number): boolean {
  return position === count - 1 && count % COLUMNS_BASE === 1;
}
