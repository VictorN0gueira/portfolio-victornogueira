import { describe, expect, it } from 'vitest';
import { homeCopy } from '../../data/homeCopy';
import { groupWords } from './heroWords';

const joined = (...words: string[]) => words.join(' ');

describe('groupWords', () => {
  it('keeps a lone word as it is, and an empty run empty', () => {
    expect(groupWords(['mês.'])).toEqual(['mês.']);
    expect(groupWords([])).toEqual([]);
  });

  it('joins the two words of a pair', () => {
    expect(groupWords(['por', 'mês.'])).toEqual([joined('por', 'mês.')]);
  });

  it('joins the last two words of a long run, so the run never ends with a lone word', () => {
    expect(groupWords(['Nossa', 'equipe', 'cuida', 'de', 'tudo'])).toEqual(['Nossa', 'equipe', 'cuida', joined('de', 'tudo')]);
  });

  it('does not bind the first word of a run of three: a whole run would take a line of its own on a wide screen', () => {
    expect(groupWords(['Sua', 'equipe', 'perde'])).toEqual(['Sua', joined('equipe', 'perde')]);
    expect(groupWords(['por', 'semana', 'com'])).toEqual(['por', joined('semana', 'com')]);
  });

  it('binds a first word that ends with a comma to the next one, in a run of four or more', () => {
    expect(groupWords(['Automatizando,', 'a', 'gente', 'devolve'])).toEqual([joined('Automatizando,', 'a'), joined('gente', 'devolve')]);
    expect(groupWords(['Depois,', 'a', 'gente', 'entrega', 'tudo'])).toEqual([joined('Depois,', 'a'), 'gente', joined('entrega', 'tudo')]);
  });

  it('draws the short word line at three letters: "de" and "pra" bind, "tudo" and "Nossa" do not (R7, limit pinned on both sides)', () => {
    expect(groupWords(['de', 'novo', 'a', 'gente'])).toEqual([joined('de', 'novo'), joined('a', 'gente')]);
    expect(groupWords(['pra', 'ser', 'feito', 'agora'])).toEqual([joined('pra', 'ser'), joined('feito', 'agora')]);
    expect(groupWords(['tudo', 'ser', 'feito', 'agora'])).toEqual(['tudo', 'ser', joined('feito', 'agora')]);
  });

  it('binds a short first word to the next one in a run of four or more', () => {
    expect(groupWords(['a', 'gente', 'mapeia', 'tudo'])).toEqual([joined('a', 'gente'), joined('mapeia', 'tudo')]);
  });

  it('leaves punctuation that opens the run as a word of its own, for the piece before it to take', () => {
    expect(groupWords(['.', 'Automatizando,', 'a', 'gente', 'devolve'])).toEqual([
      '.',
      joined('Automatizando,', 'a'),
      joined('gente', 'devolve'),
    ]);
  });

  it('never joins a word to punctuation that stands alone', () => {
    expect(groupWords(['.', 'fim'])).toEqual(['.', 'fim']);
  });

  it('does not mutate its input', () => {
    const words = ['Sua', 'equipe', 'perde'];
    groupWords(words);

    expect(words).toEqual(['Sua', 'equipe', 'perde']);
  });
});

describe('groupWords on the sentence of the home', () => {
  const runs = homeCopy.hero.sentence.filter((part): part is string => typeof part === 'string');
  const wordsOf = (run: string) => run.split(/\s+/).filter(Boolean);

  it('groups every run without losing or reordering a word', () => {
    for (const run of runs) {
      expect(groupWords(wordsOf(run)).join(' ').split(' ')).toEqual(wordsOf(run));
    }
  });

  it('gives the runs the pieces the layout was measured with (e2e D10: no lone word from 280 to 2560px)', () => {
    expect(runs.map((run) => groupWords(wordsOf(run)))).toEqual([
      ['Sua', joined('equipe', 'perde')],
      ['por', joined('semana', 'com')],
      ['.', joined('Automatizando,', 'dá'), joined('pra', 'recuperar')],
      [joined('por', 'mês.')],
    ]);
  });
});

