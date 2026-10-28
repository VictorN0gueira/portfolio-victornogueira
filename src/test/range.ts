/** The start and the end of the selection of an input, for the caret and range tests. Pure: it needs no render helper. */
export const range = (input: HTMLInputElement): Array<number | null> => [input.selectionStart, input.selectionEnd];
