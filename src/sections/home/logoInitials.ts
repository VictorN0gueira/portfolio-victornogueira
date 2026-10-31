// Connectors of Brazilian company names: they do not give a letter to the initials.
const CONNECTORS = /^(de|da|do|das|dos|e)$/i;
const MAX_INITIALS = 2;

/** Up to two capital letters from a company name: its first two words, leaving out de, da, do, das, dos and e. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word !== '' && !CONNECTORS.test(word))
    .slice(0, MAX_INITIALS)
    .map((word) => Array.from(word)[0].toLocaleUpperCase('pt-BR'))
    .join('');
}
