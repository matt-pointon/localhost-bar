/** Local calendar date as `yyyy-mm-dd` (matches `git log --date=short`). */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** `yyyy-mm-dd` for the day `offset` local days before today (0 = today). */
export function localDateStrOffset(offset: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() - offset)
  return localDateStr(d)
}
