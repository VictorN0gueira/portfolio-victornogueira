// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { blockBody, declarations } from '../test/css'
import { allStylesCss as css, stillBody } from '../test/styles'

describe('components.css logo tone', () => {
  const HOVER_GATE = '@media (hover: hover)'
  const BASE = '.vn-logo-tone'
  const WOKEN = '.vn-logo-host:hover .vn-logo-tone,\n  .vn-logo-host:focus-within .vn-logo-tone'
  // The stylesheet has more than one hover gate: this one is the gate that mutes the logos.
  const gated = blockBody(css, HOVER_GATE, BASE)
  const outsideGate = css.replace(gated, '')
  const rules = [blockBody(css, BASE), blockBody(gated, BASE), blockBody(gated, WOKEN)]

  it('has a gate that needs a device that can hover, and every rule of the tone', () => {
    expect(gated).not.toBe('')
    for (const body of rules) expect(body).not.toBe('')
  })

  it('transitions opacity and filter alone, 300ms on the shared easing, in a rule outside the gate', () => {
    expect(declarations(blockBody(outsideGate, BASE))).toEqual([
      'transition: opacity 300ms var(--ease-out), filter 300ms var(--ease-out)',
    ])
  })

  it('rests gray and a little faded only where the device can hover', () => {
    expect(declarations(blockBody(gated, BASE))).toEqual(['filter: grayscale(1)', 'opacity: .7'])
    expect(outsideGate).not.toContain('grayscale(1)')
  })

  it('is colored from the start with (hover: none): outside the gate nothing dims the logo, so touch gets the final state', () => {
    const outside = declarations(blockBody(outsideGate, BASE)).join(';')

    expect(outside).not.toMatch(/filter:|opacity:/)
    expect(gated).not.toContain('hover: none')
  })

  it('gives the color back on hover and on focus within the host, inside the gate', () => {
    expect(declarations(blockBody(gated, WOKEN))).toEqual(['filter: grayscale(0)', 'opacity: 1'])
    expect(outsideGate).not.toContain('.vn-logo-host:hover')
    expect(outsideGate).not.toContain('.vn-logo-host:focus-within')
  })

  it('declares nothing but opacity, filter and the transition of both: no color and never the accent', () => {
    const allowed = ['filter', 'opacity', 'transition']

    for (const body of rules) {
      for (const line of declarations(body)) expect(allowed, line).toContain(line.split(':')[0].trim())
    }
    expect(rules.join('\n')).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|accent/i)
  })

  it('has no transition with motion off (the list of motion.css)', () => {
    expect(declarations(stillBody(BASE))).toEqual(['transition: none'])
  })

  // A logo that fails to load shows its name as text at this opacity: below 0.7 it would lose its contrast (1.4.3).
  it('keeps the resting opacity at 0.7 or more, so the text of a logo that failed to load stays readable', () => {
    const rest = declarations(blockBody(gated, BASE)).find((line) => line.startsWith('opacity'))
    const opacity = Number(rest?.split(':')[1])

    expect(opacity).toBeGreaterThanOrEqual(0.7)
    expect(opacity).toBeLessThanOrEqual(1)
  })
})

describe('components.css dialog', () => {
  const PANEL = '.vn-dialog-panel'
  const OVERLAY = '.vn-dialog-overlay'

  it('slides the panel in with opacity and transform alone, and out again a little faster', () => {
    const opening = blockBody(css, '@keyframes vn-dialog-in')
    const closing = blockBody(css, '@keyframes vn-dialog-out')

    expect(opening).toMatch(/from\s*\{\s*opacity:\s*0;\s*transform:\s*translateY\(\d+px\) scale\(\.\d+\);\s*\}/)
    expect(closing).toMatch(/to\s*\{\s*opacity:\s*0;\s*transform:\s*translateY\(\d+px\) scale\(\.\d+\);\s*\}/)
    for (const body of [opening, closing]) {
      expect(body.replace(/opacity|transform/g, '')).not.toMatch(/(width|height|top|left|margin|padding|filter):/)
    }
  })

  it('leaves along the path it came: the exit has the same offset and scale as the entry, only quicker', () => {
    const pathOf = (body: string): string => /translateY\(\d+px\) scale\(\.\d+\)/.exec(body)?.[0] ?? ''
    const opening = pathOf(blockBody(css, '@keyframes vn-dialog-in'))
    const closing = pathOf(blockBody(css, '@keyframes vn-dialog-out'))
    const duration = (state: string): number =>
      Number(/animation: vn-dialog-\w+ (\d+)ms/.exec(blockBody(css, `.vn-dialog-panel[data-state="${state}"]`))?.[1])

    expect(opening).not.toBe('')
    expect(closing).toBe(opening)
    expect(duration('closed')).toBeLessThan(duration('open'))
  })

  it('drives the panel and the overlay from the data-state Radix sets, on the shared easing', () => {
    expect(blockBody(css, `${PANEL}[data-state="open"]`)).toContain('animation: vn-dialog-in 280ms var(--ease-out)')
    expect(blockBody(css, `${PANEL}[data-state="closed"]`)).toContain('animation: vn-dialog-out 200ms var(--ease-out) forwards')
    expect(blockBody(css, `${OVERLAY}[data-state="open"]`)).toContain('animation: vn-menu-fade-in 240ms var(--ease-out)')
    expect(blockBody(css, `${OVERLAY}[data-state="closed"]`)).toContain('animation: vn-menu-fade-out 200ms var(--ease-out) forwards')
  })

  it('does not center the panel with a transform, because the open and close animations own the transform', () => {
    const panelRules = [PANEL, `${PANEL}[data-state="open"]`, `${PANEL}[data-state="closed"]`].map((selector) => blockBody(css, selector))

    expect(panelRules.join('\n')).not.toMatch(/translate\(-50%/)
  })

  it('stops with motion off, so Radix unmounts it at once (the list of motion.css)', () => {
    expect(stillBody(PANEL)).toContain('animation: none !important')
    expect(stillBody(OVERLAY)).toContain('animation: none !important')
  })
})
