// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { blockBody } from '../test/css'
import { allStylesCss as css } from '../test/styles'


describe('components.css accordion', () => {
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

  // What stops it when motion is off is the list of motion.css (tested in motion.test.ts).
})
