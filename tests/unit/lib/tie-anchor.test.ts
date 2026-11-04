import { parseTieAnchor, tieAnchorId } from "@/lib/tie-anchor"

describe("tie anchors", () => {
  it("round-trips a tie id", () => {
    expect(parseTieAnchor(`#${tieAnchorId(42)}`)).toBe(42)
  })

  it.each(["", "#", "#tie-", "#tie-0", "#tie-abc", "#tie-1x", "#other-1"])("rejects %j", (hash) => {
    expect(parseTieAnchor(hash)).toBeNull()
  })
})
