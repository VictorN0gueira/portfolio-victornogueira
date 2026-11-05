import { describe, expect, it } from 'vitest';
import { notFoundCopy } from './notFoundCopy';

describe('notFoundCopy', () => {
  it('is the draft text of the 404, in one place', () => {
    expect(notFoundCopy).toEqual({
      title: 'Página não encontrada',
      description: 'A página que você procura não existe ou foi movida para outro endereço.',
      back: 'Voltar ao início',
    });
  });

  it('has a description that fits a search result and ends like a sentence', () => {
    expect(notFoundCopy.description.length).toBeLessThanOrEqual(160);
    expect(notFoundCopy.description).toMatch(/\.$/);
  });
});
