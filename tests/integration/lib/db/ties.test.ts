import { Pool } from "pg"
import { setupTestDatabase, truncateAllTables, TestDatabaseContext } from "../../../helpers/db-test-harness"
import {
  createSeason,
  createTeam,
  createPlayer,
  setTeamPlayers,
  createTie,
  getTies,
  getTieById,
  getTiesBySeasonId,
  getTiesWithLineupInfo,
  getTieWithParticipations,
  updateTie,
  updateTieReady,
  deleteTie,
  upsertParticipation,
  updateParticipationLineup,
} from "@/lib/db"

let ctx: TestDatabaseContext

beforeAll(async () => {
  ctx = await setupTestDatabase()
})

afterAll(async () => {
  await ctx.cleanup()
})

beforeEach(async () => {
  await truncateAllTables(ctx.pool as unknown as Pool)
})

async function createTestFixture() {
  const season = await createSeason({ name: "S1", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "TIE001", isActive: true })
  const team = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
  return { season, team }
}

describe("createTie", () => {
  it("creates and returns a tie", async () => {
    const { team } = await createTestFixture()
    const tie = await createTie({ teamId: team.id, opponent: "Rivals FC", tieDate: "2024-06-15T14:00:00Z", location: "Home Court", isHome: true, notes: null })
    expect(tie.id).toBeDefined()
    expect(tie.opponent).toBe("Rivals FC")
    expect(tie.isHome).toBe(true)
  })

  it("stores tieDate as a Date object", async () => {
    const { team } = await createTestFixture()
    const tie = await createTie({ teamId: team.id, opponent: "Rivals FC", tieDate: "2024-06-15T14:00:00Z", location: null, isHome: false, notes: null })
    expect(tie.tieDate).toBeInstanceOf(Date)
  })
})

describe("getTies", () => {
  it("returns empty array when no ties exist", async () => {
    expect(await getTies()).toEqual([])
  })

  it("returns ties with teamName and seasonName enrichment", async () => {
    const { season, team } = await createTestFixture()
    await createTie({ teamId: team.id, opponent: "Rivals", tieDate: "2024-06-15", location: null, isHome: true, notes: null })
    const ties = await getTies()
    expect(ties).toHaveLength(1)
    expect(ties[0].teamName).toBe("Team A")
    expect(ties[0].seasonName).toBe("S1")
    expect(ties[0].seasonId).toBe(season.id)
  })

  it("orders ties by tieDate desc", async () => {
    const { team } = await createTestFixture()
    await createTie({ teamId: team.id, opponent: "Early", tieDate: "2024-03-01", location: null, isHome: true, notes: null })
    await createTie({ teamId: team.id, opponent: "Late", tieDate: "2024-09-01", location: null, isHome: true, notes: null })
    const ties = await getTies()
    expect(ties[0].opponent).toBe("Late")
    expect(ties[1].opponent).toBe("Early")
  })
})

describe("getTieById", () => {
  it("returns the tie for a valid id", async () => {
    const { team } = await createTestFixture()
    const tie = await createTie({ teamId: team.id, opponent: "Rivals", tieDate: "2024-06-15", location: null, isHome: true, notes: null })
    const found = await getTieById(tie.id)
    expect(found?.id).toBe(tie.id)
  })

  it("returns undefined for a non-existent id", async () => {
    expect(await getTieById(99999)).toBeUndefined()
  })
})

describe("getTiesBySeasonId", () => {
  it("returns ties for the given season including participations array", async () => {
    const { season, team } = await createTestFixture()
    await createTie({ teamId: team.id, opponent: "Rivals", tieDate: "2024-06-15", location: null, isHome: true, notes: null })
    const ties = await getTiesBySeasonId(season.id)
    expect(ties).toHaveLength(1)
    expect(Array.isArray(ties[0].participations)).toBe(true)
  })

  it("returns empty array for a season with no ties", async () => {
    const season = await createSeason({ name: "Empty", startDate: "2025-01-01", endDate: "2025-12-31", accessCode: "EMPTY1", isActive: false })
    expect(await getTiesBySeasonId(season.id)).toEqual([])
  })
})

describe("getTiesWithLineupInfo", () => {
  it("returns ties enriched with teamSize, lineupCount, and lineupPlayers", async () => {
    const season = await createSeason({ name: "S2", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "LUP1", isActive: true })
    const team = await createTeam({ seasonId: season.id, name: "Team B", league: null, teamSize: 4 })
    const player = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    await setTeamPlayers(team.id, [player.id])
    const tie = await createTie({ teamId: team.id, opponent: "Rivals", tieDate: "2024-06-15", location: null, isHome: true, notes: null })
    const participation = await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    await updateParticipationLineup(participation.id, true)

    const ties = await getTiesWithLineupInfo()
    const found = ties.find((t) => t.id === tie.id)
    expect(found?.teamSize).toBe(4)
    expect(found?.lineupCount).toBe(1)
    expect(found?.lineupPlayers).toHaveLength(1)
    expect(found?.problematicCount).toBe(0)
  })
})

describe("getTieWithParticipations", () => {
  it("returns a tie with nested participations and team info", async () => {
    const { season, team } = await createTestFixture()
    void season
    const player = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    await setTeamPlayers(team.id, [player.id])
    const tie = await createTie({ teamId: team.id, opponent: "Rivals", tieDate: "2024-06-15", location: "Court 1", isHome: true, notes: null })
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })

    const result = await getTieWithParticipations(tie.id)
    expect(result).toBeDefined()
    expect(result?.participations).toHaveLength(1)
    expect(result?.confirmedCount).toBe(1)
    expect(result?.maybeCount).toBe(0)
    expect(result?.declinedCount).toBe(0)
    expect(result?.team.id).toBe(team.id)
  })

  it("returns undefined for a non-existent tie id", async () => {
    expect(await getTieWithParticipations(99999)).toBeUndefined()
  })
})

describe("updateTie", () => {
  it("updates tie fields", async () => {
    const { team } = await createTestFixture()
    const tie = await createTie({ teamId: team.id, opponent: "Old Rival", tieDate: "2024-06-15", location: null, isHome: true, notes: null })
    const updated = await updateTie(tie.id, { teamId: team.id, opponent: "New Rival", tieDate: "2024-07-20", location: "Away Court", isHome: false, notes: "Updated" })
    expect(updated?.opponent).toBe("New Rival")
    expect(updated?.location).toBe("Away Court")
    expect(updated?.isHome).toBe(false)
  })

  it("returns undefined for a non-existent tie", async () => {
    const { team } = await createTestFixture()
    expect(await updateTie(99999, { teamId: team.id, opponent: "X", tieDate: "2024-01-01", location: null, isHome: true, notes: null })).toBeUndefined()
  })
})

describe("updateTieReady", () => {
  it("marks a tie as lineup ready", async () => {
    const { team } = await createTestFixture()
    const tie = await createTie({ teamId: team.id, opponent: "Rivals", tieDate: "2024-06-15", location: null, isHome: true, notes: null })
    expect(tie.isLineupReady).toBe(false)

    const updated = await updateTieReady(tie.id, true)
    expect(updated?.isLineupReady).toBe(true)

    const rolledBack = await updateTieReady(tie.id, false)
    expect(rolledBack?.isLineupReady).toBe(false)
  })
})

describe("deleteTie", () => {
  it("deletes an existing tie", async () => {
    const { team } = await createTestFixture()
    const tie = await createTie({ teamId: team.id, opponent: "Rivals", tieDate: "2024-06-15", location: null, isHome: true, notes: null })
    await deleteTie(tie.id)
    expect(await getTieById(tie.id)).toBeUndefined()
  })

  it("resolves silently for a non-existent tie", async () => {
    await expect(deleteTie(99999)).resolves.not.toThrow()
  })
})
