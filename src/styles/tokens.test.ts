// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { optimize } from '@tailwindcss/node'
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

describe('tokens.css motion primitives', () => {
  const rule = (selector: string): string => {
    const match = new RegExp(`${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`).exec(css)
    return match?.[1] ?? ''
  }

  it('blinks the cursor with vn-blink for 1.1s in one step', () => {
    expect(rule('.vn-cursor')).toContain('animation: vn-blink 1.1s steps(1) infinite')
  })

  it('sweeps the scan line with vn-scan for 8s on the compositor', () => {
    const scanLine = rule('.vn-scan-line')
    expect(scanLine).toContain('animation: vn-scan 8s linear infinite')
    expect(scanLine).toContain('will-change: transform')
  })

  it('makes the scan line a full size layer that draws a 2px line at its bottom edge', () => {
    const scanLine = rule('.vn-scan-line')
    expect(scanLine).toMatch(/position:\s*absolute/)
    expect(scanLine).toMatch(/inset:\s*0/)
    expect(scanLine).toMatch(/pointer-events:\s*none/)
    expect(scanLine).toMatch(
      /background:\s*linear-gradient\(to right, transparent, var\(--vn-scan-line, rgba\([^)]*\)\), transparent\) bottom \/ 100% 2px no-repeat/,
    )
  })

  it('moves the scan line by its own height, so one sweep fits the section at any viewport', () => {
    const keyframes = /@keyframes vn-scan\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    expect(keyframes).toMatch(/from\s*\{\s*transform:\s*translateY\(-100%\);\s*\}/)
    expect(keyframes).toMatch(/to\s*\{\s*transform:\s*translateY\(0\);\s*\}/)
    expect(keyframes).not.toContain('vh')
  })

  it('stops the cursor and hides the scan line under prefers-reduced-motion', () => {
    const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    expect(reduced).toMatch(/\.vn-cursor\s*\{\s*animation: none;/)
    expect(reduced).toMatch(/\.vn-scan-line\s*\{\s*display: none;/)
  })

  it('stops the cursor and hides the scan line under .a11y-no-animations', () => {
    expect(rule('.a11y-no-animations .vn-cursor')).toContain('animation: none')
    expect(rule('.a11y-no-animations .vn-scan-line')).toContain('display: none')
  })

  it('tints the scan line white on dark grids', () => {
    expect(rule('@utility vn-scan-grid--dark')).toContain('--vn-scan-line: rgba(255, 255, 255, .16)')
  })
})

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

/**
 * Body of the first block whose header is exactly `header` (a selector list or an at-rule prelude), found by
 * brace matching. A selector that only appears as a later item of a comma separated list does not count.
 */
function blockBody(source: string, header: string): string {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(^|\\n)[ \\t]*${escaped} \\{`, 'g')
  const match = [...source.matchAll(pattern)].find((candidate) => !source.slice(0, candidate.index).trimEnd().endsWith(','))
  if (!match) return ''
  const open = match.index + match[0].length - 1
  let depth = 0
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(open + 1, index)
  }
  return ''
}

const FINE_POINTER_MOTION_GATE = '@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
const REDUCED_MOTION_GATE = '@media (prefers-reduced-motion: reduce)'
const MARQUEE_MASK = 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)'

describe('blockBody helper', () => {
  it('returns the body of a flat rule and of an at-rule with nested rules', () => {
    const sample = '.a { color: red; }\n@media (x) {\n  .b {\n    color: blue;\n  }\n}\n.c { color: green; }'

    expect(blockBody(sample, '.a')).toContain('color: red')
    expect(blockBody(sample, '@media (x)')).toContain('.b {')
    expect(blockBody(blockBody(sample, '@media (x)'), '.b')).toContain('color: blue')
    expect(blockBody(sample, '.c')).toContain('color: green')
  })

  it('does not mistake a longer selector for the one asked for', () => {
    expect(blockBody('.a-b { color: red; }', '.a')).toBe('')
  })

  it('skips a selector that is only a later item of a selector list', () => {
    expect(blockBody('.a,\n.b { color: red; }\n.b { color: blue; }', '.b')).toContain('color: blue')
  })

  it('returns an empty string for a missing block', () => {
    expect(blockBody('.a { color: red; }', '.z')).toBe('')
  })
})

describe('tokens.css marquee', () => {
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

  it('stops under prefers-reduced-motion', () => {
    const reduced = blockBody(css, REDUCED_MOTION_GATE)

    expect(blockBody(reduced, '.vn-marquee')).toContain('animation: none')
  })

  it('stops under .a11y-no-animations', () => {
    expect(blockBody(css, '.a11y-no-animations .vn-marquee')).toContain('animation: none')
  })
})

describe('tokens.css spotlight card', () => {
  const gated = blockBody(css, FINE_POINTER_MOTION_GATE)
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

  it('spins the ring with vn-spin for 4s only on hover and focus within', () => {
    const spinning = blockBody(gated, '.vn-spotlight:hover::before,\n  .vn-spotlight:focus-within::before')

    expect(spinning).toContain('animation: vn-spin 4s linear infinite')
    expect(spinning).toMatch(/opacity:\s*1/)
    expect(gated.match(/vn-spin/g)).toHaveLength(1)
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
    expect(spinningRules).toEqual(['.vn-spotlight:hover::before,\n  .vn-spotlight:focus-within::before'])
  })

  it('shows the spotlight glow on hover', () => {
    expect(blockBody(gated, '.vn-spotlight:hover::after')).toMatch(/opacity:\s*1/)
  })

  it('draws nothing at all outside the gate (touch devices and reduced motion get a static card)', () => {
    expect(outsideGate).not.toMatch(/(?<!\.a11y-no-animations )\.vn-spotlight::(before|after)/)
    expect(outsideGate).not.toContain('.vn-spotlight:hover')
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

describe('tokens.css accordion', () => {
  it('documents grid-template-rows as an exception to compositor only animation', () => {
    const comment = /\/\*(?:(?!\*\/)[\s\S])*Accordion\.(?:(?!\*\/)[\s\S])*\*\//.exec(css)?.[0] ?? ''

    expect(comment).toContain('grid-template-rows')
    expect(comment).toMatch(/documented exception to compositor only animation/)
  })

  it('animates the panel from 0fr to 1fr with an opacity fade, on the shared easing', () => {
    const panel = blockBody(css, '.vn-accordion-panel')
    const open = blockBody(css, '.vn-accordion[open] > .vn-accordion-panel')

    expect(panel).toMatch(/display:\s*grid/)
    expect(panel).toMatch(/grid-template-rows:\s*0fr/)
    expect(panel).toMatch(/opacity:\s*0/)
    expect(panel).toContain('transition: grid-template-rows 300ms var(--ease-out), opacity 300ms var(--ease-out)')
    expect(open).toMatch(/grid-template-rows:\s*1fr/)
    expect(open).toMatch(/opacity:\s*1/)
  })

  it('starts the opening animation from the collapsed state with @starting-style', () => {
    const starting = blockBody(css, '@starting-style')

    expect(blockBody(starting, '.vn-accordion[open] > .vn-accordion-panel')).toMatch(/grid-template-rows:\s*0fr/)
  })

  it('keeps the content visible while it collapses where ::details-content exists', () => {
    const supported = blockBody(css, '@supports selector(::details-content)')

    expect(blockBody(supported, '.vn-accordion::details-content')).toContain('transition: content-visibility 300ms allow-discrete')
  })

  it('rotates the plus icon 45 degrees with a transform when the item is open', () => {
    expect(blockBody(css, '.vn-accordion-icon')).toContain('transition: transform 300ms var(--ease-out)')
    expect(blockBody(css, '.vn-accordion[open] > summary .vn-accordion-icon')).toContain('transform: rotate(45deg)')
  })

  it('is instant under prefers-reduced-motion', () => {
    const reduced = blockBody(css, REDUCED_MOTION_GATE)

    expect(blockBody(reduced, '.vn-accordion-panel')).toContain('transition: none')
    expect(blockBody(reduced, '.vn-accordion-icon')).toContain('transition: none')
    expect(blockBody(reduced, '@supports selector(::details-content)')).toContain('transition: none')
  })

  it('is instant under .a11y-no-animations', () => {
    expect(blockBody(css, '.a11y-no-animations .vn-accordion-panel')).toContain('transition: none')
    expect(blockBody(css, '.a11y-no-animations .vn-accordion-icon')).toContain('transition: none')
    const supported = blockBody(css, '@supports selector(::details-content)')

    expect(blockBody(supported, '.a11y-no-animations .vn-accordion::details-content')).toContain('transition: none')
  })
})

describe('tokens.css copy rules', () => {
  it('has no em or en dash', () => {
    expect(css).not.toMatch(/[\u2013\u2014]/)
  })
})

describe('tokens.css cable pulse', () => {
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

  it('is not drawn under prefers-reduced-motion', () => {
    const reduced = blockBody(css, REDUCED_MOTION_GATE)

    expect(blockBody(reduced, '.vn-cable-pulse')).toContain('display: none')
  })

  it('is not drawn under .a11y-no-animations', () => {
    expect(blockBody(css, '.a11y-no-animations .vn-cable-pulse')).toContain('display: none')
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

describe('tokens.css tab progress', () => {
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

  it('is not drawn under prefers-reduced-motion', () => {
    const reduced = blockBody(css, REDUCED_MOTION_GATE)

    expect(blockBody(reduced, '.vn-tab-progress')).toContain('display: none')
  })

  it('is not drawn under .a11y-no-animations', () => {
    expect(blockBody(css, '.a11y-no-animations .vn-tab-progress')).toContain('display: none')
  })
})
