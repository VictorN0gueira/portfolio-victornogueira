// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { blockBody } from '../test/css'
import { offPaletteHex, offPaletteRgb, findHexLiterals, findRgbLiterals } from '../test/paletteCss'
import { allStylesCss as css, componentsCss, tokensCss } from '../test/styles'

const indexCssText = readFileSync(resolve(__dirname, '../index.css'), 'utf8')
const indexHtml = readFileSync(resolve(__dirname, '../../index.html'), 'utf8')
const fontsDir = resolve(__dirname, '../../public/fonts')

describe('tokens.css', () => {
  const expected = {
    white: '#ffffff',
    cream: '#f2f2f2',
    'gray-light': '#c7c7c7',
    'gray-mid': '#8a8a8a',
    'gray-dark': '#4d4d4d',
    ink: '#1a1a1a',
    black: '#0a0a0a',
    accent: '#00e5a0',
  }

  for (const [name, value] of Object.entries(expected)) {
    it(`declares --color-vn-${name} as ${value}`, () => {
      expect(css.toLowerCase()).toContain(`--color-vn-${name}: ${value}`)
    })
  }

  it('declares the single easing curve', () => {
    expect(css).toContain('--ease-out: cubic-bezier(.22, 1, .36, 1)')
  })

  it('declares safe-area utilities', () => {
    expect(css).toContain('env(safe-area-inset-top)')
  })

  it('self-hosts fonts without Google Fonts', () => {
    expect(css).not.toMatch(/fonts\.googleapis/)
  })

  describe('font files', () => {
    const fontFiles = [...css.matchAll(/url\("\/fonts\/([^"]+\.woff2)"\)/g)].map((match) => match[1])

    it('references the five self-hosted faces', () => {
      expect(fontFiles).toHaveLength(5)
    })

    for (const file of fontFiles) {
      it(`ships public/fonts/${file}`, () => {
        expect(existsSync(resolve(fontsDir, file))).toBe(true)
      })
    }
  })
})

describe('src/index.css palette', () => {
  const indexCss = readFileSync(resolve(__dirname, '../index.css'), 'utf8')

  it('finds the colors it is supposed to check', () => {
    expect(findHexLiterals(indexCss).length).toBeGreaterThan(5)
    // index.css no longer holds an rgb() value; the scanner is proven on a fixed sample instead.
    expect(findRgbLiterals('a { box-shadow: 0 0 1px rgba(26, 26, 26, 0.2); color: rgb(10, 10, 10); }').length).toBe(2)
  })

  it('uses only VN One palette hex values', () => {
    expect(offPaletteHex(indexCss)).toEqual([])
  })

  it('uses only VN One palette values inside rgb() and rgba()', () => {
    expect(offPaletteRgb(indexCss)).toEqual([])
  })

  it('uses no color keywords', () => {
    expect(indexCss).not.toMatch(/:\s*(white|black)\b|\bsolid\s+(white|black)\b/)
  })

  // The floating header sits at max(12px, inset) from the top, so an anchor needs the same inset to stay below it.
  it('keeps anchors below the floating header, including the notch inset', () => {
    expect(indexCss).toContain('scroll-padding-top: max(96px, calc(env(safe-area-inset-top) + 84px))')
  })

  it('keeps the same safe-area logic for the shorter header of a phone held sideways', () => {
    const landscape = blockBody(indexCss, '@media (max-height: 480px)')

    expect(landscape).toContain('scroll-padding-top: max(72px, calc(env(safe-area-inset-top) + 60px))')
  })
})

describe('index.html', () => {
  it('does not load Google Fonts', () => {
    expect(indexHtml).not.toMatch(/fonts\.googleapis/)
    expect(indexHtml).not.toMatch(/fonts\.gstatic/)
  })
})

describe('tokens.css copy rules', () => {
  it('has no em or en dash', () => {
    expect(css).not.toMatch(/[\u2013\u2014]/)
  })
})

describe('tokens.css values the components share', () => {
  it('declares the fluid radii the components use, so rounded-card and rounded-shell match them', () => {
    expect(tokensCss).toContain('--radius-card: clamp(20px, 3vw, 28px)')
    expect(tokensCss).toContain('--radius-shell: clamp(24px, 4vw, 40px)')
  })

  it('declares the xs breakpoint of the smallest phones', () => {
    expect(tokensCss).toContain('--breakpoint-xs: 360px')
  })

  it('declares the landscape phone variant on the short viewport every component used to write out', () => {
    expect(tokensCss).toContain('@custom-variant vn-landscape (@media (max-height: 480px))')
  })

  it('declares the z index scale in rising order, one named layer each', () => {
    const layers = [...tokensCss.matchAll(/--vn-z-([a-z]+): (\d+);/g)].map((match) => [match[1], Number(match[2])] as const)

    expect(layers.map(([name]) => name)).toEqual(['header', 'progress', 'popover', 'widget', 'overlay', 'dialog', 'skip'])
    expect(layers.map(([, value]) => value)).toEqual([...layers.map(([, value]) => value)].sort((a, b) => a - b))
    expect(new Set(layers.map(([, value]) => value)).size).toBe(layers.length)
  })

  it('declares the two focus ring utilities, white for dark surfaces and ink for light ones', () => {
    expect(blockBody(componentsCss, '@utility vn-focus-ring')).toContain('outline: 2px solid var(--color-vn-white)')
    expect(blockBody(componentsCss, '@utility vn-focus-ring-ink')).toContain('outline: 2px solid var(--color-vn-ink)')
    expect(blockBody(componentsCss, '@utility vn-focus-ring')).toContain('outline-offset: 2px')
  })

  it('has dropped the safe area utilities and the brand colors that nothing uses', () => {
    expect(css).not.toMatch(/@utility (pb|pr|pl)-safe/)
    expect(css).toContain('@utility pt-safe')
    expect(indexCssText).not.toContain('--color-brand-gray')
    expect(indexCssText).not.toContain('--color-brand-black')
  })

  it('keeps the floating buttons from covering a focused field: the page scrolls with room at the bottom', () => {
    expect(blockBody(indexCssText, '@layer base', 'scroll-padding-bottom')).toContain('scroll-padding-bottom: 5rem')
  })
})

// A filter does not raise the ratio of a mid gray against its background: the colors change.
describe('components.css more contrast', () => {
  const contrast = blockBody(componentsCss, '@variant vn-contrast')

  it('lives in one variant: the system preference and the widget class share the rules', () => {
    const variant = blockBody(tokensCss, '@custom-variant vn-contrast')

    expect(blockBody(variant, '@media (prefers-contrast: more)')).toContain('@slot')
    expect(blockBody(variant, '&:where(.a11y-high-contrast, .a11y-high-contrast *)')).toContain('@slot')
  })

  it('darkens the pale borders on light surfaces and leaves the ones on black surfaces alone', () => {
    const header = '.border-vn-gray-light:not(:where(.bg-vn-black, .bg-vn-ink) *)'

    expect(blockBody(contrast, header)).toContain('border-color: var(--color-vn-gray-dark)')
  })

  it('draws the dimmed logos and the faded answers at full strength and the focus ring thicker', () => {
    expect(blockBody(contrast, '.vn-logo-tone,\n  .opacity-80')).toContain('opacity: 1')
    expect(blockBody(contrast, ':focus-visible')).toContain('outline-width: 3px !important')
  })
})
