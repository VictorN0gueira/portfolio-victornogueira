import { describe, expect, it } from 'vitest';
import { offPaletteClasses, offPaletteInHtml } from './palette';

describe('offPaletteClasses', () => {
  it('accepts the VN One tokens, white, transparent, current and inherit, with opacity suffixes', () => {
    const allowed =
      'bg-vn-black text-vn-white border-vn-gray-mid bg-vn-white/5 border-vn-white/30 bg-white text-white bg-transparent text-current fill-current text-inherit accent-white shadow-vn-black/40 ring-vn-white/[0.2]';

    expect(offPaletteClasses(allowed)).toEqual([]);
  });

  it('accepts the accent token, which is a VN One token (a test that must keep it out checks that apart)', () => {
    expect(offPaletteClasses('bg-vn-accent text-vn-accent')).toEqual([]);
  });

  it('accepts the non color values of the same prefixes', () => {
    const sizes =
      'text-base text-sm text-2xl text-center text-balance text-ellipsis border border-2 border-t border-dashed shadow-2xl shadow-inner outline-2 outline-offset-2 -outline-offset-2 ring-2 ring-inset ring-offset-2 stroke-2 fill-none accent-auto bg-none bg-cover bg-linear-to-r from-10% divide-y decoration-2';

    expect(offPaletteClasses(sizes)).toEqual([]);
  });

  it('looks past variants and negative signs, also when a bracket holds a colon', () => {
    expect(offPaletteClasses('hover:bg-vn-white/10 md:focus-visible:outline-vn-white placeholder:text-vn-gray-mid min-[360px]:px-4')).toEqual([]);
    expect(offPaletteClasses('lg:hover:bg-gray-500')).toEqual(['lg:hover:bg-gray-500']);
  });

  it('accepts arbitrary values that are not colors, and arbitrary shadows that use only token variables', () => {
    const arbitrary =
      'text-[length:min(clamp(2.25rem,1rem+6vw,6rem),calc(100cqi/5.5))] shadow-[inset_0_0_0_1px_var(--color-vn-white)] rounded-[clamp(20px,3vw,28px)]';

    expect(offPaletteClasses(arbitrary)).toEqual([]);
  });

  it('rejects Tailwind palette colors, black and stone, amber and blue shades', () => {
    const bad = ['bg-gray-500', 'bg-black', 'text-blue-500', 'border-stone-200', 'text-amber-400', 'ring-emerald-500', 'text-red-300', 'bg-zinc-900', 'shadow-black/40', 'accent-emerald-500', 'outline-slate-100'];

    expect(offPaletteClasses(bad.join(' '))).toEqual(bad);
  });

  it('rejects arbitrary hex, rgb and foreign color variables', () => {
    const bad = ['bg-[#ff0000]', 'text-[#fff]', 'border-[rgb(1,2,3)]', 'text-[color:#00e5a0]', 'shadow-[0_0_0_1px_var(--color-blue-500)]', 'bg-[oklch(0.5_0.1_20)]'];

    expect(offPaletteClasses(bad.join(' '))).toEqual(bad);
  });

  it('rejects a utility nobody listed instead of letting it by', () => {
    expect(offPaletteClasses('text-wonky border-bogus')).toEqual(['text-wonky', 'border-bogus']);
  });

  it('ignores classes that are not color utilities', () => {
    expect(offPaletteClasses('flex gap-2 top-full min-h-11 rounded-xl px-4 scheme-dark')).toEqual([]);
  });
});

describe('offPaletteInHtml', () => {
  it('reads every class attribute and reports the off palette ones', () => {
    const html = '<div class="bg-vn-black p-4"><span class="text-red-500 font-bold">x</span><svg class="fill-zinc-200"></svg></div>';

    expect(offPaletteInHtml(html)).toEqual(['text-red-500', 'fill-zinc-200']);
  });

  it('is empty for a clean tree', () => {
    expect(offPaletteInHtml('<div class="bg-vn-black text-vn-white"><p class="text-sm">ok</p></div>')).toEqual([]);
  });
});
