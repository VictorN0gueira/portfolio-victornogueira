import { describe, expect, it } from 'vitest';
import { collectToc, slugify, tocHeadings, type TocEntry } from './legalToc';

function rootWith(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

describe('slugify', () => {
  it('lowercases, strips accents and joins the words with a hyphen', () => {
    expect(slugify('Quem é o controlador')).toBe('quem-e-o-controlador');
  });

  it('keeps the number a title starts with', () => {
    expect(slugify('1. Quem é o controlador')).toBe('1-quem-e-o-controlador');
  });

  it('drops punctuation and the ordinal sign, and never leaves a hyphen at the edges', () => {
    expect(slugify('7. Seus direitos (art. 18 da LGPD)')).toBe('7-seus-direitos-art-18-da-lgpd');
    expect(slugify('  Quer exercer um direito?  ')).toBe('quer-exercer-um-direito');
    expect(slugify('Consentimento, Art. 7º, I')).toBe('consentimento-art-7-i');
  });

  it('falls back to a fixed word when nothing letter like is left', () => {
    expect(slugify('?!')).toBe('secao');
  });
});

describe('collectToc', () => {
  it('reads the h2 of the root, in order, with the label and an id for each', () => {
    const root = rootWith(
      '<h1>Título</h1><h2>Primeiro</h2><p>x</p><h2>Segundo <strong>item</strong></h2><h3>Fora</h3>',
    );

    const expected: TocEntry[] = [
      { id: 'primeiro', label: 'Primeiro' },
      { id: 'segundo-item', label: 'Segundo item' },
    ];

    expect(collectToc(root)).toEqual(expected);
  });

  it('numbers a repeated title: second gets -2 and third -3', () => {
    const root = rootWith('<h2>Bases</h2><h2>Bases</h2><h2>Bases</h2>');

    expect(collectToc(root).map((entry) => entry.id)).toEqual(['bases', 'bases-2', 'bases-3']);
  });

  it('ignores a heading with no text and collapses the white space of the others', () => {
    const root = rootWith('<h2>   </h2><h2>\n  Seus\n   direitos </h2><h2></h2>');

    expect(collectToc(root)).toEqual([{ id: 'seus-direitos', label: 'Seus direitos' }]);
  });

  it('is built from the rendered text and never from the markup around it', () => {
    const root = rootWith('<h2>a <img src=x onerror=alert(1)> b</h2>');

    expect(collectToc(root)).toEqual([{ id: 'a-b', label: 'a b' }]);
  });

  it('does not take an id that another element of the document already has', () => {
    const taken = document.createElement('div');
    taken.id = 'direitos';
    document.body.append(taken);
    try {
      const root = rootWith('<h2>Direitos</h2>');
      document.body.append(root);

      expect(collectToc(root)).toEqual([{ id: 'direitos-2', label: 'Direitos' }]);
    } finally {
      taken.remove();
    }
  });

  it('keeps the id a heading already has, so a second run changes nothing', () => {
    const root = rootWith('<h2>Primeiro</h2><h2>Segundo</h2>');
    document.body.append(root);
    try {
      const first = collectToc(root);
      tocHeadings(root).forEach((heading, index) => {
        heading.id = first[index].id;
      });

      expect(collectToc(root)).toEqual(first);
    } finally {
      root.remove();
    }
  });
});

describe('tocHeadings', () => {
  it('returns the same elements, in the same order, that collectToc describes', () => {
    const root = rootWith('<h2></h2><h2>Um</h2><h2>Dois</h2>');

    expect(tocHeadings(root).map((heading) => heading.textContent)).toEqual(['Um', 'Dois']);
    expect(collectToc(root)).toHaveLength(2);
  });
});
