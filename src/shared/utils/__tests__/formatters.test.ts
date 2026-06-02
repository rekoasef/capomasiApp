import { formatDate } from '../formatters'
import { parseDateOnly } from '../dates'

describe('formatDate', () => {
  it('no desfasa fechas YYYY-MM-DD al día anterior', () => {
    expect(formatDate('2026-04-28')).toBe('28/04/2026')
  })
})

describe('parseDateOnly', () => {
  it('parsea fechas DATE como fecha local conservando el día', () => {
    const parsed = parseDateOnly('2026-04-28')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(3)
    expect(parsed.getDate()).toBe(28)
  })
})
