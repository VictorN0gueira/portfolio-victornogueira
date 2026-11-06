import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { dy, frame, installHarnessHooks, setup } from './useTabDodge.harness';

installHarnessHooks();

describe('what makes a stacking context, which caps the z-index of what is inside it', () => {
  const original = window.getComputedStyle.bind(window);

  /** The computed style of the cap box (and its parent) says what the test wants; every other element answers as jsdom does. */
  function overrideStyle(overrides: Record<string, Record<string, string>>) {
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element, pseudo?: string | null) => {
      const real = original(element, pseudo);
      const extra = overrides[element.getAttribute('data-testid') ?? ''];
      if (!extra) return real;
      return new Proxy(real, {
        get(target, property) {
          if (property === 'getPropertyValue') return (name: string) => extra[name] ?? target.getPropertyValue(name);
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    });
  }

  function focusInner(overrides: Record<string, Record<string, string>>) {
    overrideStyle(overrides);
    const harness = setup();
    act(() => harness.view.getByTestId('link-g').focus());
    frame();
    return dy(harness.tab);
  }

  const CREATORS: Array<[string, Record<string, string>]> = [
    ['opacity under 1', { opacity: '0.5' }],
    ['a transform', { transform: 'matrix(1, 0, 0, 1, 4, 0)' }],
    ['a translate (what Tailwind v4 emits)', { translate: '4px 0px' }],
    ['a rotate', { rotate: '5deg' }],
    ['a scale', { scale: '1.1' }],
    ['a filter', { filter: 'blur(1px)' }],
    ['a backdrop-filter', { 'backdrop-filter': 'blur(4px)' }],
    ['a perspective', { perspective: '100px' }],
    ['a clip-path', { 'clip-path': 'circle(40%)' }],
    ['a mask-image', { 'mask-image': 'linear-gradient(#000, transparent)' }],
    ['a mask-border-source', { 'mask-border-source': 'url(x.svg)' }],
    ['a mix-blend-mode', { 'mix-blend-mode': 'multiply' }],
    ['isolation', { isolation: 'isolate' }],
    ['contain: paint', { contain: 'paint' }],
    ['contain: layout', { contain: 'layout' }],
    ['contain: strict', { contain: 'strict' }],
    ['contain: content', { contain: 'content' }],
    ['container-type: size', { 'container-type': 'size' }],
    ['container-type: inline-size', { 'container-type': 'inline-size' }],
    ['a view-transition-name', { 'view-transition-name': 'hero' }],
    ['will-change: transform', { 'will-change': 'transform' }],
    ['will-change: opacity, scroll-position', { 'will-change': 'scroll-position, opacity' }],
    ['content-visibility: auto (what Tailwind v4 emits)', { 'content-visibility': 'auto' }],
    ['content-visibility: hidden', { 'content-visibility': 'hidden' }],
    ['will-change: z-index', { 'will-change': 'z-index' }],
    ['transform-style: preserve-3d', { 'transform-style': 'preserve-3d' }],
    ['an offset-path', { 'offset-path': 'path("M 0 0 L 10 10")' }],
    ['a -webkit-box-reflect', { '-webkit-box-reflect': 'below 2px' }],
    ['a -webkit-mask-box-image', { '-webkit-mask-box-image': 'url(x.png) 4' }],
    ['a -webkit-mask-box-image-source', { '-webkit-mask-box-image-source': 'url(x.png)' }],
    ['position: fixed', { position: 'fixed' }],
    ['position: sticky', { position: 'sticky' }],
    ['a z-index on a positioned box', { position: 'relative', 'z-index': '2' }],
  ];

  for (const [name, values] of CREATORS) {
    it(`caps the link inside it when it has ${name}: the link is below the widget and the tab steps aside`, () => {
      expect(focusInner({ cap: values })).toBe('-38px');
    });
  }

  for (const display of ['flex', 'inline-flex', 'grid', 'inline-grid']) {
    it(`counts a static ${display} item with a z-index as a context`, () => {
      expect(focusInner({ cap: { 'z-index': '1' }, 'cap-parent': { display } })).toBe('-38px');
    });
  }

  const NOT_CREATORS: Array<[string, Record<string, string>]> = [
    ['nothing at all', {}],
    ['a z-index on a static box that is not a flex or grid item', { 'z-index': '1' }],
    ['opacity 1', { opacity: '1' }],
    ['transform: none', { transform: 'none' }],
    ['translate: none', { translate: 'none' }],
    ['mix-blend-mode: normal', { 'mix-blend-mode': 'normal' }],
    ['content-visibility: visible', { 'content-visibility': 'visible' }],
    ['offset-path: none', { 'offset-path': 'none' }],
    ['-webkit-box-reflect: none', { '-webkit-box-reflect': 'none' }],
    ['transform-style: flat', { 'transform-style': 'flat' }],
    ['contain: style', { contain: 'style' }],
    ['container-type: normal', { 'container-type': 'normal' }],
    ['will-change: scroll-position', { 'will-change': 'scroll-position' }],
    ['position: relative without a z-index', { position: 'relative', 'z-index': 'auto' }],
  ];

  for (const [name, values] of NOT_CREATORS) {
    it(`does not cap the link inside it for ${name}: the link at 9999 is above the widget`, () => {
      expect(focusInner({ cap: values })).toBe('');
    });
  }
});
