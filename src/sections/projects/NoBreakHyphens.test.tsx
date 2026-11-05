import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NoBreakHyphens } from './NoBreakHyphens';

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
});
