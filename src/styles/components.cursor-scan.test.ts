// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { allStylesCss as css, stillBody } from '../test/styles'

describe('components.css motion primitives', () => {
  const rule = (selector: string): string => {
    const match = new RegExp(`${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`).exec(css)
    return match?.[1] ?? ''
  }

  // Decorative motion that lasts longer than 5 seconds needs a stop that is not in the widget (2.2.2): the cursor
  // blinks four times (4.4 s) and rests visible, the scan line sweeps twice and then fades out.
  it('blinks the cursor with vn-blink for 1.1s in one step, four times (4.4 s, under 5 s), then rests', () => {
    expect(rule('.vn-cursor')).toContain('animation: vn-blink 1.1s steps(1) 4')
    expect(rule('.vn-cursor')).not.toContain('infinite')
  })

  it('sweeps the scan line with vn-scan for 8s on the compositor, twice, and then fades it out', () => {
    const scanLine = rule('.vn-scan-line')
    expect(scanLine).toContain('animation: vn-scan 8s linear 2, vn-scan-hide 0s linear 16s forwards')
    expect(scanLine).not.toContain('infinite')
    expect(scanLine).toContain('will-change: transform')
  })

  it('hides the scan line with opacity alone once its sweeps are over, so no layout property moves', () => {
    const keyframes = /@keyframes vn-scan-hide\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    expect(keyframes).toMatch(/to\s*\{\s*opacity:\s*0;\s*\}/)
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

  it('stops the cursor and hides the scan line with motion off (the list of motion.css)', () => {
    expect(stillBody('.vn-cursor')).toContain('animation: none')
    expect(stillBody('.vn-scan-line')).toContain('display: none')
  })

  it('tints the scan line white on dark grids', () => {
    expect(rule('@utility vn-scan-grid--dark')).toContain('--vn-scan-line: rgba(255, 255, 255, .16)')
  })
})
