export function tieAnchorId(tieId: number): string {
  return `tie-${tieId}`
}

export function parseTieAnchor(hash: string): number | null {
  const match = /^#tie-(\d+)$/.exec(hash)
  if (!match) return null
  const id = Number(match[1])
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
