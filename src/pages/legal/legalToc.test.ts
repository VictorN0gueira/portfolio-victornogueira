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

describe('the label of a title that sits in a black card under a small kicker', () => {
  const card = (inner: string, className = 'bg-zinc-950 rounded-3xl') => `<div class="${className}">${inner}</div>`;
  const kicker = (text: string, className = 'text-[10px] font-bold') => `<p class="${className}">${text}</p>`;

  it('is the kicker, because the name of the person says nothing in a list of sections', () => {
    const root = rootWith(card(`${kicker('Controlador dos dados')}<h2>Victor Nogueira</h2>`));

    expect(collectToc(root)).toEqual([{ id: 'controlador-dos-dados', label: 'Controlador dos dados' }]);
  });

  it('is the title when the kicker is above a title that is not in a black card ("Seus direitos" keeps its own words)', () => {
    const root = rootWith(`<div>${kicker('Art. 18 da LGPD')}<h2>Seus direitos</h2></div>`);

    expect(collectToc(root)).toEqual([{ id: 'seus-direitos', label: 'Seus direitos' }]);
  });

  it('is the title when the black card has no kicker right above it', () => {
    const root = rootWith(
      card('<h2>Quer exercer um direito?</h2>') +
        card(`${kicker('Sem a classe', 'text-xs')}<h2>Outro</h2>`) +
        card(`${kicker('Longe')}<div></div><h2>Mais um</h2>`) +
        card(`<div>${kicker('Em outro tipo')}</div><h2>Fim</h2>`),
    );

    expect(collectToc(root).map((entry) => entry.label)).toEqual([
      'Quer exercer um direito?',
      'Outro',
      'Mais um',
      'Fim',
    ]);
  });

  it('is the title when the kicker has no text', () => {
    const root = rootWith(card(`${kicker('   ')}<h2>Victor Nogueira</h2>`));

    expect(collectToc(root)).toEqual([{ id: 'victor-nogueira', label: 'Victor Nogueira' }]);
  });

  it('still leaves out a title that has no text of its own, whatever kicker is above it', () => {
    const root = rootWith(card(`${kicker('Controlador dos dados')}<h2>  </h2>`));

    expect(collectToc(root)).toEqual([]);
  });
});
