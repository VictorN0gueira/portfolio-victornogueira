/** The class names of an element, one by one, so a test can assert on a token without a substring match. */
export const tokensOf = (element: Element): string[] => (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
