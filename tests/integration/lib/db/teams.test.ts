import { Pool } from "pg"
import { setupTestDatabase, truncateAllTables, TestDatabaseContext } from "../../../helpers/db-test-harness"
import {
  createSeason,
  createTeam,
  getTeams,
  getTeamById,
  getTeamsBySeasonId,
  getTeamPlayers,
  setTeamPlayers,
  updateTeam,
  deleteTeam,
  createPlayer,
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

async function createTestSeason() {
  return createSeason({ name: "Test Season", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "TST001", isActive: true })
}

describe("createTeam", () => {
  it("creates and returns a team", async () => {
    const season = await createTestSeason()
    const team = await createTeam({ seasonId: season.id, name: "Team Alpha", league: "League A", teamSize: 6 })
    expect(team.id).toBeDefined()
    expect(team.name).toBe("Team Alpha")
    expect(team.league).toBe("League A")
    expect(team.teamSize).toBe(6)
    expect(team.seasonId).toBe(season.id)
  })

  it("rejects duplicate team name within the same season", async () => {
    const season = await createTestSeason()
    await createTeam({ seasonId: season.id, name: "Team Alpha", league: null, teamSize: 6 })
    await expect(createTeam({ seasonId: season.id, name: "Team Alpha", league: null, teamSize: 6 })).rejects.toThrow()
  })

  it("allows the same team name in different seasons", async () => {
    const s1 = await createSeason({ name: "S1", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "S1X", isActive: true })
    const s2 = await createSeason({ name: "S2", startDate: "2025-01-01", endDate: "2025-12-31", accessCode: "S2X", isActive: false })
    const t1 = await createTeam({ seasonId: s1.id, name: "Team Alpha", league: null, teamSize: 6 })
    const t2 = await createTeam({ seasonId: s2.id, name: "Team Alpha", league: null, teamSize: 6 })
    expect(t1.id).not.toBe(t2.id)
  })
})

describe("getTeams", () => {
  it("returns empty array when no teams exist", async () => {
    expect(await getTeams()).toEqual([])
  })

  it("returns all teams ordered by name", async () => {
    const season = await createTestSeason()
    await createTeam({ seasonId: season.id, name: "Zebra", league: null, teamSize: 6 })
    await createTeam({ seasonId: season.id, name: "Alpha", league: null, teamSize: 6 })
    const teams = await getTeams()
    expect(teams[0].name).toBe("Alpha")
    expect(teams[1].name).toBe("Zebra")
  })
})

describe("getTeamById", () => {
  it("returns the team for a valid id", async () => {
    const season = await createTestSeason()
    const team = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
    const found = await getTeamById(team.id)
    expect(found?.id).toBe(team.id)
  })

  it("returns undefined for a non-existent id", async () => {
    expect(await getTeamById(99999)).toBeUndefined()
  })
})

describe("getTeamsBySeasonId", () => {
  it("returns teams for the specified season with playerIds array", async () => {
    const season = await createTestSeason()
    await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
    await createTeam({ seasonId: season.id, name: "Team B", league: null, teamSize: 6 })
    const teams = await getTeamsBySeasonId(season.id)
    expect(teams).toHaveLength(2)
    expect(teams[0].playerIds).toEqual([])
  })

  it("returns empty array for a season with no teams", async () => {
    const season = await createTestSeason()
    expect(await getTeamsBySeasonId(season.id)).toEqual([])
  })
})

describe("setTeamPlayers / getTeamPlayers", () => {
  it("assigns players to a team and retrieves them ordered by rank", async () => {
    const season = await createTestSeason()
    const team = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
    const p1 = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    const p2 = await createPlayer({ firstName: "Bob", lastName: "Schmidt" })

    await setTeamPlayers(team.id, [p1.id, p2.id])
    const players = await getTeamPlayers(team.id)
    expect(players).toHaveLength(2)
    expect(players[0].playerId).toBe(p1.id)
    expect(players[0].playerRank).toBe(1)
    expect(players[1].playerId).toBe(p2.id)
    expect(players[1].playerRank).toBe(2)
  })

  it("replaces previous player list on subsequent call", async () => {
    const season = await createTestSeason()
    const team = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
    const p1 = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    const p2 = await createPlayer({ firstName: "Bob", lastName: "Schmidt" })

    await setTeamPlayers(team.id, [p1.id, p2.id])
    await setTeamPlayers(team.id, [p2.id])
    const players = await getTeamPlayers(team.id)
    expect(players).toHaveLength(1)
    expect(players[0].playerId).toBe(p2.id)
  })

  it("clears players when called with empty array", async () => {
    const season = await createTestSeason()
    const team = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
    const p1 = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    await setTeamPlayers(team.id, [p1.id])
    await setTeamPlayers(team.id, [])
    expect(await getTeamPlayers(team.id)).toEqual([])
  })
})

describe("updateTeam", () => {
  it("updates team fields", async () => {
    const season = await createTestSeason()
    const team = await createTeam({ seasonId: season.id, name: "Old Name", league: null, teamSize: 6 })
    const updated = await updateTeam(team.id, { seasonId: season.id, name: "New Name", league: "Premier", teamSize: 8 })
    expect(updated?.name).toBe("New Name")
    expect(updated?.league).toBe("Premier")
    expect(updated?.teamSize).toBe(8)
  })

  it("returns undefined for a non-existent team", async () => {
    const season = await createTestSeason()
    const result = await updateTeam(99999, { seasonId: season.id, name: "X", league: null, teamSize: 6 })
    expect(result).toBeUndefined()
  })
})

describe("deleteTeam", () => {
  it("deletes an existing team", async () => {
    const season = await createTestSeason()
    const team = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
    await deleteTeam(team.id)
    expect(await getTeamById(team.id)).toBeUndefined()
  })

  it("resolves silently for a non-existent team", async () => {
    await expect(deleteTeam(99999)).resolves.not.toThrow()
  })
})
