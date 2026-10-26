// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')

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
})
