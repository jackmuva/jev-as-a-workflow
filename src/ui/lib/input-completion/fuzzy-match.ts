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

export const filterByFuzzyName = <T extends { name: string }>(
  items: readonly T[],
  query: string,
): T[] => {
  if (query.length === 0) return [...items]

  let matches = items.filter((item) => fuzzyContains(item.name, query))
  const hasPrefixMatch = matches.some((item) => fuzzyScore(item.name, query) === 0)
  if (hasPrefixMatch) {
    matches = matches.filter((item) => fuzzyScore(item.name, query) === 0)
  } else {
    const hasSubstringMatch = matches.some((item) => fuzzyScore(item.name, query) === 1)
    if (hasSubstringMatch) {
      matches = matches.filter((item) => fuzzyScore(item.name, query) === 1)
    }
  }

  return matches.sort((left, right) => {
    const scoreA = fuzzyScore(left.name, query)
    const scoreB = fuzzyScore(right.name, query)
    if (scoreA !== scoreB) return scoreA - scoreB
    return left.name.localeCompare(right.name)
  })
}
