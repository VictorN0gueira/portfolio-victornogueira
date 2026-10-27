import { describe, expect, it } from 'vitest';
import { homeCopy } from './homeCopy';
import { useCases } from './useCases';

const EXPECTED_IDS = ['atendimento', 'comercial', 'financeiro', 'operacoes'];
const ARROW = String.fromCharCode(0x2192);

/** A tab label as an id: lowercase, with the accents (the combining marks of its decomposed form) taken off. */
function toId(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function allStrings(): string[] {
  const { useCases: copy } = homeCopy;
  return [
    ...useCases.flatMap((useCase) => [useCase.tab, useCase.title, useCase.body, ...useCase.steps]),
    ...Object.values(copy),
  ];
}

describe('useCases', () => {
  it('has the four use cases, in the order of the tabs', () => {
    expect(useCases.map((useCase) => useCase.id)).toEqual(EXPECTED_IDS);
  });

  it('gives every use case its own id, and an id that is the tab label without accents, in lowercase', () => {
    const ids = useCases.map((useCase) => useCase.id);

    expect(new Set(ids).size).toBe(useCases.length);
    for (const useCase of useCases) {
      expect(useCase.id).toBe(toId(useCase.tab));
    }
  });

  it('has exactly the fields of the type, with no empty or blank string in them', () => {
    for (const useCase of useCases) {
      expect(Object.keys(useCase).sort(), useCase.id).toEqual(['body', 'id', 'steps', 'tab', 'title']);
      for (const text of [useCase.tab, useCase.title, useCase.body, ...useCase.steps]) {
        expect(text.trim(), useCase.id).not.toBe('');
        expect(text, useCase.id).toBe(text.trim());
      }
    }
  });

  it('gives every use case exactly three steps, none repeated', () => {
    for (const useCase of useCases) {
      expect(useCase.steps, useCase.id).toHaveLength(3);
      expect(new Set(useCase.steps).size, useCase.id).toBe(3);
    }
  });

  it('pins the tab labels of the brief', () => {
    expect(useCases.map((useCase) => useCase.tab)).toEqual(['Atendimento', 'Comercial', 'Financeiro', 'Operações']);
  });
});

describe('homeCopy.useCases', () => {
  it('has the approved section copy', () => {
    expect(homeCopy.useCases.kicker).toBe('onde a automação entra');
    expect(homeCopy.useCases.heading).toBe('Comece pelo processo que mais pesa na rotina');
    expect(homeCopy.useCases.sub).toBe(
      'Toda empresa tem aquele trabalho que ninguém aguenta mais fazer. É por ele que a gente começa.',
    );
    expect(homeCopy.useCases.note).toBe('Exemplo de aplicação. O fluxo de verdade sai do diagnóstico.');
  });

  it('has the constant name of the pause toggle', () => {
    expect(homeCopy.useCases.pause).toBe('Pausar troca automática');
  });

  // The dashes and the slash separator are guarded for every file of src/data by src/test/copy-rules.test.ts.
  it('has no arrow glyph in any string, since the brand fonts lack it', () => {
    expect(allStrings().filter((text) => text.includes(ARROW))).toEqual([]);
  });
});
