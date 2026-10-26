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

describe('src/index.css palette', () => {
  const indexCss = readFileSync(resolve(__dirname, '../index.css'), 'utf8')
  const palette = new Set(['#ffffff', '#f2f2f2', '#c7c7c7', '#8a8a8a', '#4d4d4d', '#1a1a1a', '#0a0a0a', '#00e5a0'])

  const toHex = (channels: string[]): string =>
    `#${channels.map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')}`

  const hexColors = [...indexCss.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((match) => match[0].toLowerCase())
  const rgbColors = [...indexCss.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)].map((match) =>
    toHex([match[1], match[2], match[3]]),
  )

  it('finds the colors it is supposed to check', () => {
    expect(hexColors.length).toBeGreaterThan(5)
    expect(rgbColors.length).toBeGreaterThan(0)
  })

  it('uses only VN One palette hex values', () => {
    expect(hexColors.filter((color) => !palette.has(color))).toEqual([])
  })

  it('uses only VN One palette values inside rgb() and rgba()', () => {
    expect(rgbColors.filter((color) => !palette.has(color))).toEqual([])
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
