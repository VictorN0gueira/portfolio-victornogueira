import { describe, expect, it } from 'vitest';
import { services, type Service } from '../../data/services';
import { FEATURED_CATEGORIES, featuredServices, pickFeatured } from './featuredServices';

const service = (nome: string, categoria: Service['categoria']): Service => ({
  nome,
  categoria,
  descricao: 'descricao',
  inclui: ['item'],
  prazo: 'prazo',
});

describe('featured categories', () => {
  it('lists Automação, Inteligência Artificial and Desenvolvimento Web, in that order', () => {
    expect(FEATURED_CATEGORIES).toEqual(['Automação', 'Inteligência Artificial', 'Desenvolvimento Web']);
  });

  it('all three featured categories exist in services', () => {
    for (const categoria of FEATURED_CATEGORIES) {
      expect(
        services.some((item) => item.categoria === categoria),
        categoria,
      ).toBe(true);
    }
  });
});

describe('featuredServices', () => {
  it('is the first service of each featured category, in the order of the categories', () => {
    expect(featuredServices.map((item) => item.nome)).toEqual([
      'Automação Essencial',
      'Agente de IA Sob Medida',
      'Landing Page ou Site',
    ]);
    expect(featuredServices.map((item) => item.categoria)).toEqual([...FEATURED_CATEGORIES]);
  });

  it('holds the very objects of the data file, so the copy of a card is never a second source of truth', () => {
    expect(featuredServices[0]).toBe(services.find((item) => item.nome === 'Automação Essencial'));
  });
});

describe('pickFeatured', () => {
  const catalog = [
    service('Web um', 'Desenvolvimento Web'),
    service('Auto um', 'Automação'),
    service('Auto dois', 'Automação'),
    service('IA um', 'Inteligência Artificial'),
  ];

  it('takes the first service of each category and follows the order of the categories, not the order of the list', () => {
    const picked = pickFeatured(catalog, ['Automação', 'Inteligência Artificial', 'Desenvolvimento Web']);

    expect(picked.map((item) => item.nome)).toEqual(['Auto um', 'IA um', 'Web um']);
  });

  it('skips a category with no service and keeps the order of the rest', () => {
    const withoutAi = catalog.filter((item) => item.categoria !== 'Inteligência Artificial');

    expect(pickFeatured(withoutAi, ['Desenvolvimento Web', 'Inteligência Artificial', 'Automação']).map((item) => item.nome)).toEqual([
      'Web um',
      'Auto um',
    ]);
    expect(pickFeatured(withoutAi, ['Inteligência Artificial'])).toEqual([]);
  });

  it('does not change the list it receives', () => {
    const before = catalog.map((item) => item.nome);

    pickFeatured(catalog, ['Desenvolvimento Web', 'Automação']);

    expect(catalog.map((item) => item.nome)).toEqual(before);
  });

  it('returns an empty list for no categories', () => {
    expect(pickFeatured(catalog, [])).toEqual([]);
  });
});
