import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAX_NOWRAP_WORD_LENGTH, NoBreakHyphens } from './NoBreakHyphens';

describe('NoBreakHyphens', () => {
  it('keeps the text exactly as it is, for assistive technology and for search', () => {
    const text = 'Dispara campanhas por e-mail e por WhatsApp, com e-mail em cada uma.';
    const { container } = render(
      <p>
        <NoBreakHyphens text={text} />
      </p>,
    );

    expect(container.textContent).toBe(text);
  });

  it('wraps each hyphenated word in a no-wrap span, with its punctuation, and nothing else', () => {
    const { container } = render(
      <p>
        <NoBreakHyphens text="Painel no e-mail, no Link-in-Bio e ok." />
      </p>,
    );

    expect([...container.querySelectorAll('span')].map((span) => [span.textContent, span.className])).toEqual([
      ['e-mail,', 'whitespace-nowrap'],
      ['Link-in-Bio', 'whitespace-nowrap'],
    ]);
  });

  it('adds no element to a text without a hyphenated word, and does not use a non-breaking hyphen character', () => {
    const { container } = render(
      <p>
        <NoBreakHyphens text="Sem hifen nenhum aqui." />
      </p>,
    );

    expect(container.querySelector('span')).toBeNull();
    const withHyphen = render(
      <p>
        <NoBreakHyphens text="e-mail" />
      </p>,
    );
    expect(withHyphen.container.textContent).not.toContain(String.fromCharCode(0x2011));
  });

  function spansOf(text: string): string[] {
    const { container } = render(
      <p>
        <NoBreakHyphens text={text} />
      </p>,
    );
    return [...container.querySelectorAll('span.whitespace-nowrap')].map((span) => span.textContent ?? '');
  }

  it('wraps a hyphenated word up to the limit and leaves a longer one to wrap normally, so it cannot overflow', () => {
    const atLimit = `${'a'.repeat(MAX_NOWRAP_WORD_LENGTH - 2)}-b`;
    const overLimit = `${'a'.repeat(MAX_NOWRAP_WORD_LENGTH - 1)}-b`;

    expect(atLimit).toHaveLength(MAX_NOWRAP_WORD_LENGTH);
    expect(spansOf(`x ${atLimit} y`)).toEqual([atLimit]);
    expect(spansOf(`x ${overLimit} y`)).toEqual([]);
    expect(spansOf('diagnostico-empresarial-completo')).toEqual([]);
  });

  it('keeps a long word in the text as it is, even when it is not wrapped', () => {
    const { container } = render(
      <p>
        <NoBreakHyphens text="Veja o diagnostico-empresarial-completo agora" />
      </p>,
    );

    expect(container.textContent).toBe('Veja o diagnostico-empresarial-completo agora');
  });

  it('splits on any white space, so a new line, a tab or a no-break space never makes a word swallow its neighbour', () => {
    expect(spansOf('foo\nbar-baz')).toEqual(['bar-baz']);
    expect(spansOf('foo\tbar-baz\tqux')).toEqual(['bar-baz']);
    expect(spansOf(`foo${String.fromCharCode(0xa0)}bar-baz`)).toEqual(['bar-baz']);
  });

  it('keeps every separator in the text exactly as it was', () => {
    const text = 'a  b-c\n\td-e ';
    const { container } = render(
      <p>
        <NoBreakHyphens text={text} />
      </p>,
    );

    expect(container.textContent).toBe(text);
  });

  it('does not wrap a lone hyphen or a hyphen at the edge of a word', () => {
    expect(spansOf('a - b')).toEqual([]);
    expect(spansOf('-')).toEqual([]);
    expect(spansOf('pré- e pós-')).toEqual([]);
    expect(spansOf('um -b')).toEqual([]);
  });

  it('wraps a number with a hyphen and a name with a number', () => {
    expect(spansOf('Liga 98445-1243 hoje')).toEqual(['98445-1243']);
    expect(spansOf('depois do COVID-19.')).toEqual(['COVID-19.']);
  });

  it('renders nothing for an empty text', () => {
    const { container } = render(
      <p>
        <NoBreakHyphens text="" />
      </p>,
    );

    expect(container.textContent).toBe('');
    expect(container.querySelector('span')).toBeNull();
  });
});
