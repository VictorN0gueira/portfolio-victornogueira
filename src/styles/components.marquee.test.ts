// @vitest-environment node
import { optimize } from '@tailwindcss/node'
import { describe, it, expect } from 'vitest'
import { blockBody } from '../test/css'
import { allStylesCss as css } from '../test/styles'

const MARQUEE_MASK = 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)'

describe('components.css marquee', () => {
  it('loops the track with vn-marquee on the compositor, the duration coming from --vn-marquee-duration', () => {
    const track = blockBody(css, '.vn-marquee')

    expect(track).toContain('animation: vn-marquee var(--vn-marquee-duration, 32s) linear infinite')
    expect(track).toContain('will-change: transform')
  })

  it('moves the track by half its width so two equal groups loop without a seam', () => {
    const keyframes = blockBody(css, '@keyframes vn-marquee')

    expect(keyframes).toMatch(/to\s*\{\s*transform:\s*translateX\(-50%\);\s*\}/)
  })

  it('clips the frame on x so the page never scrolls sideways, and lets the browser handle vertical pans', () => {
    const frame = blockBody(css, '.vn-marquee-frame')

    expect(frame).toMatch(/overflow-x:\s*clip/)
    expect(frame).toMatch(/touch-action:\s*pan-y/)
  })

  it('falls back to overflow-x hidden in an @supports not (overflow-x: clip) block, for browsers before Safari 16', () => {
    const frame = blockBody(css, '.vn-marquee-frame')
    const fallback = blockBody(blockBody(css, '@supports not (overflow-x: clip)'), '.vn-marquee-frame')

    expect(frame).toMatch(/overflow-x:\s*clip/)
    expect(frame).not.toMatch(/overflow-x:\s*hidden/)
    expect(fallback).toMatch(/overflow-x:\s*hidden/)
  })

  // The Tailwind Vite build runs every stylesheet through lightningcss (the same optimize() used here,
  // with its own browser targets), and this needs no build output to exist.
  describe('through the optimizer of the Tailwind build', () => {
    const optimized = (source: string): string => optimize(source, { minify: true }).code.trim()

    it('collapses overflow-x hidden followed by overflow-x clip into clip alone, which is why the fallback is an @supports block', () => {
      const collapsed = optimized('.f { overflow-x: hidden; overflow-x: clip; }')

      expect(collapsed).toContain('clip')
      expect(collapsed).not.toContain('hidden')
    })

    it('keeps the @supports not (overflow-x: clip) fallback and the clip declaration in the shipped CSS', () => {
      const frame = blockBody(css, '.vn-marquee-frame')
      const fallback = blockBody(css, '@supports not (overflow-x: clip)')

      const shipped = optimized(`.vn-marquee-frame {${frame}}\n@supports not (overflow-x: clip) {${fallback}}`)

      expect(shipped).toMatch(/\.vn-marquee-frame\{[^}]*overflow-x:clip[^}]*\}/)
      expect(shipped).toContain('@supports not (overflow-x:clip){.vn-marquee-frame{overflow-x:hidden}}')
    })
  })

  it('keeps the track width away from ancestors with inline size containment', () => {
    expect(blockBody(css, '.vn-marquee-frame')).toMatch(/contain:\s*inline-size/)
  })

  it('leaves width, min-width and max-width of the frame to utilities, because this file is unlayered and would beat a consumer className', () => {
    const frame = blockBody(css, '.vn-marquee-frame')

    expect(frame).not.toMatch(/(^|[\s;])(min-width|max-width|width):/)
  })

  it('fades both edges with a mask', () => {
    const frame = blockBody(css, '.vn-marquee-frame')

    expect(frame).toContain(`mask-image: ${MARQUEE_MASK}`)
    expect(frame).toContain(`-webkit-mask-image: ${MARQUEE_MASK}`)
  })

  it('pauses on focus within', () => {
    expect(blockBody(css, '.vn-marquee:focus-within')).toContain('animation-play-state: paused')
  })

  it('pauses on hover only where the device can hover', () => {
    const hoverBlock = blockBody(css, '@media (hover: hover)')

    expect(blockBody(hoverBlock, '.vn-marquee:hover')).toContain('animation-play-state: paused')
    expect(css.replace(hoverBlock, '')).not.toContain('.vn-marquee:hover')
  })

  // What stops it when motion is off is the list of motion.css (tested in motion.test.ts).
})
