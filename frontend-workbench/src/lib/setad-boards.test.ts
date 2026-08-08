import { describe, expect, it } from 'vitest'
import { boardLabel, boardValue } from './setad-boards'

describe('Setad board metadata', () => {
  it.each([
    [1, 'خرید'],
    [2, 'مناقصه'],
    [3, 'مزایده'],
  ])('labels board code %i as %s', (code, label) => {
    expect(boardLabel(code)).toBe(label)
  })

  it('uses the public fallback for missing and unknown board codes', () => {
    expect(boardLabel(null)).toBe('عمومی')
    expect(boardLabel(99)).toBe('عمومی')
  })

  it.each([
    ['1', 1],
    ['2', 2],
    ['3', 3],
  ])('parses board filter %s as %i', (value, code) => {
    expect(boardValue(value)).toBe(code)
  })

  it('rejects aggregate and unknown board filters', () => {
    expect(boardValue('all')).toBeNull()
    expect(boardValue('99')).toBeNull()
  })
})
