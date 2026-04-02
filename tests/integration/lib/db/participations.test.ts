import { Pool } from "pg"
import { setupTestDatabase, truncateAllTables, TestDatabaseContext } from "../../../helpers/db-test-harness"
import {
  createSeason,
  createTeam,
  createPlayer,
  setTeamPlayers,
  createTie,
  upsertParticipation,
  getParticipations,
  getParticipationsForPlayer,
  getParticipationById,
  updateParticipationLineup,
  getLineupCount,
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
  const season = await createSeason({ name: "S1", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "PART01", isActive: true })
  const team = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
  const player = await createPlayer({ firstName: "Anna", lastName: "Müller" })
  await setTeamPlayers(team.id, [player.id])
  const tie = await createTie({ teamId: team.id, opponent: "Rivals", tieDate: "2024-06-15", location: null, isHome: true, notes: null })
  return { season, team, player, tie }
}

describe("upsertParticipation", () => {
  it("creates a new participation record", async () => {
    const { player, tie } = await createTestFixture()
    const participation = await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    expect(participation.id).toBeDefined()
    expect(participation.status).toBe("confirmed")
    expect(participation.comment).toBeNull()
  })

  it("updates status on second call (upsert behaviour)", async () => {
    const { player, tie } = await createTestFixture()
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    const updated = await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "declined", comment: "injured" })
    expect(updated.status).toBe("declined")
    expect(updated.comment).toBe("injured")
  })

  it("accepts all three status values", async () => {
    const season = await createSeason({ name: "S2", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "PART02", isActive: true })
    const team = await createTeam({ seasonId: season.id, name: "Team B", league: null, teamSize: 6 })

    const p1 = await createPlayer({ firstName: "A", lastName: "A" })
    const p2 = await createPlayer({ firstName: "B", lastName: "B" })
    const p3 = await createPlayer({ firstName: "C", lastName: "C" })
    await setTeamPlayers(team.id, [p1.id, p2.id, p3.id])
    const tie = await createTie({ teamId: team.id, opponent: "X", tieDate: "2024-06-01", location: null, isHome: true, notes: null })

    const r1 = await upsertParticipation({ tieId: tie.id, playerId: p1.id, status: "confirmed", comment: null })
    const r2 = await upsertParticipation({ tieId: tie.id, playerId: p2.id, status: "maybe", comment: null })
    const r3 = await upsertParticipation({ tieId: tie.id, playerId: p3.id, status: "declined", comment: null })

    expect(r1.status).toBe("confirmed")
    expect(r2.status).toBe("maybe")
    expect(r3.status).toBe("declined")
  })

  it("persists the comment field", async () => {
    const { player, tie } = await createTestFixture()
    const p = await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "maybe", comment: "Will try to come" })
    expect(p.comment).toBe("Will try to come")
  })
})

describe("getParticipations", () => {
  it("returns participations with player and rank info", async () => {
    const { player, tie } = await createTestFixture()
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    const list = await getParticipations(tie.id)
    expect(list).toHaveLength(1)
    expect(list[0].firstName).toBe("Anna")
    expect(list[0].lastName).toBe("Müller")
    expect(list[0].playerRank).toBe(1)
  })

  it("returns empty array for a tie with no participations", async () => {
    const { tie } = await createTestFixture()
    expect(await getParticipations(tie.id)).toEqual([])
  })
})

describe("getParticipationsForPlayer", () => {
  it("returns all participations for a player in a season", async () => {
    const { season, player, tie } = await createTestFixture()
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    const list = await getParticipationsForPlayer(season.id, player.id)
    expect(list).toHaveLength(1)
    expect(list[0].playerId).toBe(player.id)
    expect(list[0].tieId).toBe(tie.id)
    expect(list[0].status).toBe("confirmed")
  })

  it("returns empty array if the player has no participations in the season", async () => {
    const { season, player } = await createTestFixture()
    const list = await getParticipationsForPlayer(season.id, player.id)
    expect(list).toEqual([])
  })
})

describe("getParticipationById", () => {
  it("returns the participation for a valid id", async () => {
    const { player, tie } = await createTestFixture()
    const participation = await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    const found = await getParticipationById(participation.id)
    expect(found?.id).toBe(participation.id)
  })

  it("returns undefined for a non-existent id", async () => {
    expect(await getParticipationById(99999)).toBeUndefined()
  })
})

describe("updateParticipationLineup", () => {
  it("sets isInLineup to true", async () => {
    const { player, tie } = await createTestFixture()
    const p = await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    expect(p.isInLineup).toBe(false)

    const updated = await updateParticipationLineup(p.id, true)
    expect(updated?.isInLineup).toBe(true)
  })

  it("sets isInLineup back to false", async () => {
    const { player, tie } = await createTestFixture()
    const p = await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    await updateParticipationLineup(p.id, true)
    const reverted = await updateParticipationLineup(p.id, false)
    expect(reverted?.isInLineup).toBe(false)
  })
})

describe("getLineupCount", () => {
  it("returns 0 when no players are in the lineup", async () => {
    const { player, tie } = await createTestFixture()
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    expect(await getLineupCount(tie.id)).toBe(0)
  })

  it("returns the number of players with isInLineup=true", async () => {
    const season = await createSeason({ name: "S3", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "PART03", isActive: true })
    const team = await createTeam({ seasonId: season.id, name: "Team C", league: null, teamSize: 6 })
    const p1 = await createPlayer({ firstName: "X", lastName: "X" })
    const p2 = await createPlayer({ firstName: "Y", lastName: "Y" })
    await setTeamPlayers(team.id, [p1.id, p2.id])
    const tie = await createTie({ teamId: team.id, opponent: "Z", tieDate: "2024-08-01", location: null, isHome: true, notes: null })

    const part1 = await upsertParticipation({ tieId: tie.id, playerId: p1.id, status: "confirmed", comment: null })
    await upsertParticipation({ tieId: tie.id, playerId: p2.id, status: "confirmed", comment: null })
    await updateParticipationLineup(part1.id, true)

    expect(await getLineupCount(tie.id)).toBe(1)
  })
})
