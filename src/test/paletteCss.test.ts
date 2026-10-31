// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { offPaletteHex, offPaletteRgb } from './paletteCss'


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
