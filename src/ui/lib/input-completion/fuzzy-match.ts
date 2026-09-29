export const fuzzyContains = (candidate: string, query: string): boolean => {
  const c = candidate.toLowerCase()
  const q = query.toLowerCase()

  if (q.length === 0) return true

  let i = 0
  for (const char of q) {
    i = c.indexOf(char, i)
    if (i === -1) return false
    i += 1
  }

  return true
}

export const fuzzyScore = (candidate: string, query: string): number => {
  const c = candidate.toLowerCase()
  const q = query.toLowerCase()

  if (q.length === 0) return 0

  if (c.startsWith(q)) return 0
  if (c.includes(q)) return 1

  if (fuzzyContains(c, q)) return 2

  return 3
}
