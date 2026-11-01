import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findAccentElements } from './accent';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** A detached div with the given markup, so the test can read the elements back by their id. */
function fromHtml(markup: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = markup;
  return root;
}

describe('findAccentElements', () => {
  it('finds the accent in a token class, an arbitrary hex class, a variable class, an inline style and a paint attribute', () => {
    const { container } = render(
      <div>
        <i className="bg-vn-accent" />
        <i className="bg-[#00E5A0]" />
        <i className="text-[var(--color-vn-accent)]" />
        <i style={{ color: '#00e5a0' }} />
        <svg fill="#00E5A0" />
        <i className="bg-vn-black text-vn-white" />
      </div>,
    );

    expect(findAccentElements(container)).toHaveLength(5);
  });

  it('finds the rgb form that jsdom writes an inline hex color back as, with or without alpha and spaces', () => {
    const root = fromHtml(
      '<i id="a" style="color: rgb(0, 229, 160)"></i><i id="b" style="color: rgba(0,229,160,.4)"></i><i id="c" style="color: rgb(0, 229, 161)"></i>',
    );

    expect(findAccentElements(root).map((element) => element.id)).toEqual(['a', 'b']);
  });

  it('finds the accent in the paint attributes of an svg that the old list of five did not cover', () => {
    const root = fromHtml(
      [
        '<svg>',
        '<linearGradient><stop id="stop" stop-color="#00E5A0"/></linearGradient>',
        '<filter><feFlood id="flood" flood-color="#00e5a0"/><feDiffuseLighting id="light" lighting-color="rgb(0, 229, 160)"/></filter>',
        '<path id="ink" fill="#1A1A1A" stroke="#0A0A0A"/>',
        '</svg>',
      ].join(''),
    );

    expect(findAccentElements(root).map((element) => element.id)).toEqual(['stop', 'flood', 'light']);
  });

  it('finds the accent in the value of any attribute, a data attribute and an aria one included', () => {
    const root = fromHtml(
      '<i id="data" data-tone="vn-accent"></i><i id="aria" aria-label="#00E5A0"></i><i id="css" data-x="rgb(0, 229, 160)"></i><i id="plain" data-tone="ink"></i>',
    );

    expect(findAccentElements(root).map((element) => element.id)).toEqual(['data', 'aria', 'css']);
  });

  it('finds the accent in the name of an attribute, as the innerHTML scan did', () => {
    const root = fromHtml('<i id="named" data-vn-accent=""></i><i id="plain" data-vn-ink=""></i>');

    expect(findAccentElements(root).map((element) => element.id)).toEqual(['named']);
  });

  it('finds the accent in the text of a style element, in html and in svg', () => {
    const root = fromHtml('<style id="html">.x { color: #00E5A0 }</style><svg><style id="svg">.y { fill: var(--color-vn-accent) }</style></svg>');

    expect(findAccentElements(root).map((element) => element.id)).toEqual(['html', 'svg']);
  });

  it('does not look at the text of ordinary elements, only at attributes and style text', () => {
    const root = fromHtml('<p id="copy">a classe bg-vn-accent e a cor #00E5A0 aparecem no texto</p><script id="script">var x = "#00E5A0"</script>');

    expect(findAccentElements(root)).toHaveLength(0);
  });

  it('finds nothing in black, white, ink and gray elements, in any attribute or in a style element', () => {
    const root = fromHtml(
      [
        '<div class="bg-vn-black text-vn-white border-vn-gray-light" style="color: rgb(26, 26, 26)" data-tone="dark">',
        '<svg fill="#FFFFFF" stroke="#0A0A0A"><stop stop-color="#8A8A8A"/><feFlood flood-color="#000000"/></svg>',
        '<style>.x { color: #4D4D4D; background: rgba(255, 255, 255, .08) }</style>',
        '</div>',
      ].join(''),
    );

    expect(findAccentElements(root)).toHaveLength(0);
  });

  it('includes the root itself, so a single element can be checked', () => {
    const root = document.createElementNS(SVG_NS, 'svg') as unknown as HTMLElement;
    root.setAttribute('stop-color', '#00E5A0');

    expect(findAccentElements(root)).toEqual([root]);
    expect(findAccentElements(fromHtml('<i></i>'))).toHaveLength(0);
  });

  it('returns the elements in document order, the root first', () => {
    const root = fromHtml('<i id="a" class="bg-vn-accent"><i id="b" data-x="#00e5a0"></i></i>');
    root.setAttribute('class', 'text-vn-accent');

    expect(findAccentElements(root).map((element) => element.id)).toEqual(['', 'a', 'b']);
  });
});
