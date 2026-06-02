export function toLocalDateInputValue(date: Date = new Date()): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10)
}

export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return new Date(value)

  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}
