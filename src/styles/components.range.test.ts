// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { blockBody } from '../test/css'
import { offPaletteHex, offPaletteRgb } from '../test/paletteCss'
import { allStylesCss as css } from '../test/styles'

describe('components.css range slider', () => {
  const TRACK_SELECTORS = ['.vn-range::-webkit-slider-runnable-track', '.vn-range::-moz-range-track']
  const THUMB_SELECTORS = ['.vn-range::-webkit-slider-thumb', '.vn-range::-moz-range-thumb']
  // The forced colors block repeats the part selectors, so each lookup names a declaration that only the main rule holds.
  const slider = (): string => blockBody(css, '.vn-range', 'appearance')
  const track = (selector: string): string => blockBody(css, selector, 'linear-gradient')
  const thumb = (selector: string): string => blockBody(css, selector, 'width: 28px')
  const focusRing = (selector: string): string => blockBody(css, selector, 'box-shadow')
  const rangeCss = [
    slider(),
    ...TRACK_SELECTORS.map(track),
    ...THUMB_SELECTORS.map(thumb),
    blockBody(css, '.vn-range:focus-visible', 'outline'),
    focusRing('.vn-range:focus-visible::-webkit-slider-thumb'),
    focusRing('.vn-range:focus-visible::-moz-range-thumb'),
  ].join('\n')

  it('styles the WebKit and the Firefox parts in separate rules, since one unknown pseudo element voids a whole selector list', () => {
    for (const selector of TRACK_SELECTORS) expect(track(selector), selector).not.toBe('')
    for (const selector of THUMB_SELECTORS) expect(thumb(selector), selector).not.toBe('')
    expect(css).not.toMatch(/::-webkit-slider-thumb,\s*\.vn-range::-moz-range-thumb/)
  })

  it('removes the native look and starts the fill at 0 until the input sets --vn-range-fill', () => {
    expect(slider()).toMatch(/appearance:\s*none/)
    expect(slider()).toContain('--vn-range-fill: 0%')
    expect(thumb('.vn-range::-webkit-slider-thumb')).toMatch(/appearance:\s*none/)
  })

  it('draws a 28px round thumb for a finger in both engines', () => {
    for (const selector of THUMB_SELECTORS) {
      const rule = thumb(selector)

      expect(rule, selector).toMatch(/width:\s*28px/)
      expect(rule, selector).toMatch(/height:\s*28px/)
      expect(rule, selector).toMatch(/border-radius:\s*50%/)
    }
  })

  it('centers the WebKit thumb on the track: Firefox does it by itself', () => {
    expect(thumb('.vn-range::-webkit-slider-thumb')).toContain('margin-top: calc((var(--vn-range-track) - 28px) * 0.5)')
  })

  it('fills the track from --vn-range-fill in white over a gray mid rest, in both engines', () => {
    for (const selector of TRACK_SELECTORS) {
      const rule = track(selector)

      expect(rule, selector).toContain(
        'linear-gradient(to right, var(--color-vn-white) var(--vn-range-fill), var(--color-vn-gray-mid) var(--vn-range-fill))',
      )
    }
  })

  it('documents the track fill as a paint, an exception to compositor only animation, in one line at the rule', () => {
    const comment = /\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\.vn-range \{/.exec(css)?.[0] ?? ''

    expect(comment).toContain('--vn-range-fill')
    expect(comment).toMatch(/exception to compositor only animation/)
  })

  it('uses palette tokens only and never the accent', () => {
    expect(rangeCss).toContain('var(--color-vn-white)')
    expect(offPaletteHex(rangeCss)).toEqual([])
    expect(offPaletteRgb(rangeCss)).toEqual([])
    expect(rangeCss.toLowerCase()).not.toContain('accent')
    expect(rangeCss.toLowerCase()).not.toContain('00e5a0')
  })

  it('shows the focus on the thumb as a white ring, and keeps a transparent outline that forced colors turns visible', () => {
    const focus = blockBody(css, '.vn-range:focus-visible', 'outline')

    expect(focus).toMatch(/outline:\s*2px solid transparent/)
    for (const selector of ['.vn-range:focus-visible::-webkit-slider-thumb', '.vn-range:focus-visible::-moz-range-thumb']) {
      expect(focusRing(selector), selector).toMatch(/box-shadow:\s*0 0 0 3px var\(--color-vn-white\)/)
    }
  })

  it('leaves width and height to utilities (w-full h-11), because this file is unlayered and would beat a consumer className', () => {
    expect(slider()).not.toMatch(/(^|[\s;])(min-width|max-width|width|height|min-height):/)
  })

  it('lets a vertical drag scroll the page while a horizontal one moves the slider', () => {
    expect(slider()).toMatch(/touch-action:\s*pan-y/)
  })

  it('has no transition or animation, so there is nothing to switch off for reduced motion', () => {
    expect(rangeCss).not.toMatch(/transition|animation/)
  })

  it('keeps the thumb and the track visible in forced colors', () => {
    const forced = blockBody(css, '@media (forced-colors: active)', '.vn-range::-webkit-slider-thumb')

    for (const selector of [...THUMB_SELECTORS, ...TRACK_SELECTORS]) {
      expect(blockBody(forced, selector), selector).not.toBe('')
    }
    expect(blockBody(forced, '.vn-range::-webkit-slider-thumb')).toContain('ButtonText')
  })
})
