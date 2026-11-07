// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { blockBody } from '../test/css'
import { offPaletteHex, offPaletteRgb, findRgbLiterals } from '../test/paletteCss'
import { allStylesCss as css } from '../test/styles'

const FINE_POINTER_MOTION_GATE = '@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

describe('components.css spotlight card', () => {
  // The stylesheet has more than one gate with this header: this one is the gate that draws the spotlight layers.
  const gated = blockBody(css, FINE_POINTER_MOTION_GATE, '.vn-spotlight::before')
  const outsideGate = css.replace(gated, '')

  it('has a gate that needs hover, a fine pointer and no reduced motion preference', () => {
    expect(gated).not.toBe('')
  })

  it('draws the conic ring from var(--vn-angle) in palette gray, masked to a 1px ring', () => {
    const ring = blockBody(gated, '.vn-spotlight::before')

    expect(ring).toContain('conic-gradient(from var(--vn-angle), transparent 70%, var(--color-vn-gray-mid), transparent)')
    expect(ring).toMatch(/padding:\s*1px/)
    expect(ring).toContain('mask-composite: exclude')
    expect(ring).toContain('-webkit-mask-composite: xor')
  })

  it('draws the spotlight as a radial gradient at --mx and --my', () => {
    const glow = blockBody(gated, '.vn-spotlight::after')

    expect(glow).toMatch(/radial-gradient\([^)]*at var\(--mx, 50%\) var\(--my, 50%\), var\(--vn-spot-color\), transparent 70%\)/)
  })

  it('spins the ring with vn-spin for 4s only on hover and on a keyboard focus within (:has(:focus-visible))', () => {
    const onHover = blockBody(gated, '.vn-spotlight:hover::before')
    const onKeyboardFocus = blockBody(gated, '.vn-spotlight:has(:focus-visible)::before')

    for (const spinning of [onHover, onKeyboardFocus]) {
      expect(spinning).toContain('animation: vn-spin 4s linear infinite')
      expect(spinning).toMatch(/opacity:\s*1/)
    }
    expect(gated.match(/vn-spin/g)).toHaveLength(2)
  })

  it('keeps the hover and the :has focus in two rules: a browser without :has would drop a shared list, and the hover must stay', () => {
    expect(css).not.toMatch(/\.vn-spotlight:hover::before\s*,/)
  })

  it('never spins on :focus-within: a link inside the card (the featured article) would keep the ring going after a click', () => {
    expect(css).not.toContain('.vn-spotlight:focus-within')
  })

  it('documents the ring spin as the second exception to compositor only animation, right at the rule', () => {
    const beforeSpinRule = gated.slice(0, gated.indexOf('.vn-spotlight:hover::before'))
    const comment = /\/\*(?:(?!\*\/)[\s\S])*\*\/\s*$/.exec(beforeSpinRule)?.[0] ?? ''

    expect(comment).toContain('--vn-angle')
    expect(comment).toMatch(/second documented exception to compositor only animation/)
    expect(comment).toMatch(/hover and focus within/)
    expect(comment).toMatch(/fine pointer, motion allowed/)
  })

  it('can run the spin only under the gate: nothing outside it applies vn-spin, and inside it only hover and focus within do', () => {
    const spinningRules = [...gated.matchAll(/([^{}]+)\{[^}]*animation:\s*vn-spin[^}]*\}/g)].map((match) =>
      match[1].replace(/\/\*[\s\S]*?\*\//g, '').trim(),
    )

    expect(outsideGate).not.toMatch(/animation[^;]*vn-spin/)
    expect(spinningRules).toEqual(['.vn-spotlight:hover::before', '.vn-spotlight:has(:focus-visible)::before'])
  })

  it('shows the spotlight glow on hover', () => {
    expect(blockBody(gated, '.vn-spotlight:hover::after')).toMatch(/opacity:\s*1/)
  })

  it('draws nothing at all outside the gate (touch devices and reduced motion get a static card)', () => {
    expect(outsideGate).not.toMatch(/(?<!\.a11y-no-animations )\.vn-spotlight::(before|after)/)
    // The includes list of a service card has its own gated hover settle (tokens.includes.test.ts), which is not a spotlight layer.
    expect(outsideGate.replace(/\.vn-spotlight:hover \.vn-card-includes/g, '')).not.toContain('.vn-spotlight:hover')
    expect(outsideGate).not.toContain('conic-gradient')
  })

  it('hides both layers under .a11y-no-animations', () => {
    const hidden = blockBody(css, '.a11y-no-animations .vn-spotlight::before,\n.a11y-no-animations .vn-spotlight::after')

    expect(hidden).toMatch(/display:\s*none/)
  })

  it('tints the glow ink on light surfaces and white on dark ones, never the accent', () => {
    expect(blockBody(css, '.vn-spotlight')).toContain('--vn-spot-color: rgba(26, 26, 26, .08)')
    expect(blockBody(css, '.vn-spotlight--dark')).toContain('--vn-spot-color: rgba(255, 255, 255, .08)')
  })

  it('uses palette colors only in the spotlight rules', () => {
    const spotlightCss = [gated, blockBody(css, '.vn-spotlight'), blockBody(css, '.vn-spotlight--dark')].join('\n')

    expect(findRgbLiterals(spotlightCss).length).toBeGreaterThan(0)
    expect(offPaletteHex(spotlightCss)).toEqual([])
    expect(offPaletteRgb(spotlightCss)).toEqual([])
    expect(spotlightCss.toLowerCase()).not.toContain('accent')
    expect(spotlightCss.toLowerCase()).not.toContain('00e5a0')
  })
})
