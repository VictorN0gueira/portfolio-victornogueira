// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')
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

const PALETTE = new Set(['#ffffff', '#f2f2f2', '#c7c7c7', '#8a8a8a', '#4d4d4d', '#1a1a1a', '#0a0a0a', '#00e5a0'])
const HEX_LITERAL = /#[0-9a-fA-F]+\b/g
const RGB_LITERAL = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g

/** Lowercase #rrggbb for a hex literal, or null when its length is not a valid color length. */
function toSixDigitHex(literal: string): string | null {
  const digits = literal.slice(1).toLowerCase()
  if (digits.length === 3) return `#${[...digits].map((digit) => digit + digit).join('')}`
  if (digits.length === 6) return `#${digits}`
  // 8 digits are 6 color digits plus an alpha pair: only the color part is compared.
  if (digits.length === 8) return `#${digits.slice(0, 6)}`
  return null
}

function findHexLiterals(css: string): string[] {
  return [...css.matchAll(HEX_LITERAL)].map((match) => match[0])
}

function findRgbLiterals(css: string): string[] {
  return [...css.matchAll(RGB_LITERAL)].map((match) => match[0])
}

function offPaletteHex(css: string): string[] {
  return findHexLiterals(css).filter((literal) => {
    const color = toSixDigitHex(literal)
    return color === null || !PALETTE.has(color)
  })
}

function offPaletteRgb(css: string): string[] {
  return [...css.matchAll(RGB_LITERAL)]
    .filter((match) => {
      const color = `#${[match[1], match[2], match[3]].map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')}`
      return !PALETTE.has(color)
    })
    .map((match) => match[0])
}

describe('palette guard helpers', () => {
  it('accepts a 3 digit hex that expands to a palette color', () => {
    expect(offPaletteHex('a { color: #fff; }')).toEqual([])
    expect(offPaletteHex('a { color: #FFF; }')).toEqual([])
  })

  it('rejects a 3 digit hex that expands to an off palette color', () => {
    expect(offPaletteHex('a { color: #abc; }')).toEqual(['#abc'])
  })

  it('accepts an 8 digit hex only when its first 6 digits are a palette color', () => {
    expect(offPaletteHex('a { color: #1A1A1A80; }')).toEqual([])
    expect(offPaletteHex('a { color: #12345680; }')).toEqual(['#12345680'])
  })

  it('rejects hex lengths that are not 3, 6 or 8', () => {
    expect(offPaletteHex('a { color: #1234; }')).toEqual(['#1234'])
    expect(offPaletteHex('a { color: #12345; }')).toEqual(['#12345'])
    expect(offPaletteHex('a { color: #1234567; }')).toEqual(['#1234567'])
  })

  it('rejects hex literals with 9 or more digits instead of skipping them', () => {
    expect(offPaletteHex('a { color: #1234567890; }')).toEqual(['#1234567890'])
    expect(offPaletteHex('a { color: #1A1A1A8080; }')).toEqual(['#1A1A1A8080'])
  })

  it('still accepts the 6 digit palette values and rejects other 6 digit values', () => {
    expect(offPaletteHex('a { color: #00E5A0; background: #18181b; }')).toEqual(['#18181b'])
  })

  it('checks the channels of rgb() and rgba()', () => {
    expect(offPaletteRgb('a { color: rgba(255, 255, 255, 0.2); }')).toEqual([])
    expect(offPaletteRgb('a { color: rgba(0, 0, 0, 0.04); }')).toEqual(['rgba(0, 0, 0'])
  })
})

describe('src/index.css palette', () => {
  const indexCss = readFileSync(resolve(__dirname, '../index.css'), 'utf8')

  it('finds the colors it is supposed to check', () => {
    expect(findHexLiterals(indexCss).length).toBeGreaterThan(5)
    expect(findRgbLiterals(indexCss).length).toBeGreaterThan(0)
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
})

describe('index.html', () => {
  it('does not load Google Fonts', () => {
    expect(indexHtml).not.toMatch(/fonts\.googleapis/)
    expect(indexHtml).not.toMatch(/fonts\.gstatic/)
  })
})
