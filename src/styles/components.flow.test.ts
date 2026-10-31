// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { blockBody } from '../test/css'
import { offPaletteHex } from '../test/paletteCss'
import { allStylesCss as css } from '../test/styles'


describe('components.css cable pulse', () => {
  it('runs a short dash along the path with vn-cable, 2.8s, linear, on a stagger delay that defaults to none', () => {
    const pulse = blockBody(css, '.vn-cable-pulse')

    expect(pulse).toContain('animation: vn-cable 2.8s linear var(--vn-cable-delay, 0s) infinite')
    expect(pulse).toMatch(/stroke-dasharray:\s*12 100/)
  })

  it('moves only stroke-dashoffset, from just before the start of the path to just past its end', () => {
    const keyframes = blockBody(css, '@keyframes vn-cable')

    expect(keyframes).toMatch(/0%\s*\{\s*stroke-dashoffset:\s*12;\s*\}/)
    expect(keyframes).toMatch(/70%,\s*100%\s*\{\s*stroke-dashoffset:\s*-100;\s*\}/)
    expect(keyframes.replace(/stroke-dashoffset/g, '')).not.toMatch(/(transform|width|height|top|left|margin|opacity):/)
  })

  it('keeps the pulse at rest before the animation runs, so a gated animation shows no dash on the cable', () => {
    expect(blockBody(css, '.vn-cable-pulse')).toMatch(/stroke-dashoffset:\s*12/)
  })

  it('holds the dash where it is while the window is paused, keyed on data-paused', () => {
    const paused = blockBody(css, '[data-flow-window][data-paused="true"] .vn-cable-pulse')

    expect(paused).toContain('animation-play-state: paused')
    expect(paused).not.toMatch(/animation:/)
  })

  it('pauses nothing without data-paused: the play state is never set on the pulse itself', () => {
    expect(blockBody(css, '.vn-cable-pulse')).not.toContain('animation-play-state')
  })

  it('uses no color of its own: the stroke comes from the element, so the palette guard has nothing to check here', () => {
    const pulse = blockBody(css, '.vn-cable-pulse')

    expect(offPaletteHex(pulse)).toEqual([])
    expect(pulse).not.toMatch(/stroke:/)
  })
})

describe('components.css tab progress', () => {
  it('grows the fill with transform alone, from scaleX(0) to scaleX(1), and animates nothing else', () => {
    const keyframes = blockBody(css, '@keyframes vn-tab-progress')

    expect(keyframes.replace(/\s+/g, ' ').trim()).toBe('from { transform: scaleX(0); } to { transform: scaleX(1); }')
    expect(keyframes).not.toMatch(/(width|height|top|left|margin|opacity|filter):/)
  })

  it('grows from the left edge, over the duration the component passes, linear, and stays full at the end', () => {
    const fill = blockBody(css, '.vn-tab-progress')

    expect(fill).toContain('transform-origin: left center')
    expect(fill).toContain('animation: vn-tab-progress var(--vn-tab-duration) linear forwards')
  })

  it('has no literal duration of its own: the variable has no fallback, so the number lives in the component alone', () => {
    const fill = blockBody(css, '.vn-tab-progress')

    expect(fill).not.toMatch(/var\(--vn-tab-duration\s*,/)
    expect(fill).not.toMatch(/\d+m?s\b/)
  })

  it('never sets the play state on the fill itself: the component unmounts the bar instead of pausing it', () => {
    expect(blockBody(css, '.vn-tab-progress')).not.toContain('animation-play-state')
  })

  // What hides it when motion is off is the list of motion.css (tested in motion.test.ts).
})
