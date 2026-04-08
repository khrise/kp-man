import { Pool } from "pg"
import { setupTestDatabase, truncateAllTables, TestDatabaseContext } from "../../../helpers/db-test-harness"
import {
  createSeason,
  createTeam,
  createPlayer,
  getPlayers,
  getPlayerById,
  getPlayersAdminList,
  getPlayersForSeason,
  getPlayersWithoutParticipation,
  updatePlayer,
  deletePlayer,
  setTeamPlayers,
  createTie,
  upsertParticipation,
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

describe("createPlayer", () => {
  it("creates and returns a player", async () => {
    const player = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    expect(player.id).toBeDefined()
    expect(player.firstName).toBe("Anna")
    expect(player.lastName).toBe("Müller")
  })
})

describe("getPlayers", () => {
  it("returns empty array when no players exist", async () => {
    expect(await getPlayers()).toEqual([])
  })

  it("returns all players ordered by firstName then lastName", async () => {
    await createPlayer({ firstName: "Zara", lastName: "Braun" })
    await createPlayer({ firstName: "Anna", lastName: "Müller" })
    const players = await getPlayers()
    expect(players[0].firstName).toBe("Anna")
    expect(players[1].firstName).toBe("Zara")
  })
})

describe("getPlayerById", () => {
  it("returns the player for a valid id", async () => {
    const player = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    const found = await getPlayerById(player.id)
    expect(found?.id).toBe(player.id)
  })

  it("returns undefined for a non-existent id", async () => {
    expect(await getPlayerById(99999)).toBeUndefined()
  })
})

describe("getPlayersAdminList", () => {
  it("returns players that have team associations with their team metadata", async () => {
    const season = await createSeason({ name: "S1", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "S1", isActive: true })
    const team = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
    const player = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    await setTeamPlayers(team.id, [player.id])

    const list = await getPlayersAdminList()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(player.id)
    expect(list[0].teams).toHaveLength(1)
    expect(list[0].teams[0].name).toBe("Team A")
  })

  it("does not include players without team associations", async () => {
    await createPlayer({ firstName: "Solo", lastName: "Player" })
    const list = await getPlayersAdminList()
    expect(list).toHaveLength(0)
  })
})

describe("getPlayersForSeason", () => {
  it("returns players belonging to any team in the season", async () => {
    const season = await createSeason({ name: "S1", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "GPS1", isActive: true })
    const team = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
    const p1 = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    const p2 = await createPlayer({ firstName: "Bob", lastName: "Schmidt" })
    await setTeamPlayers(team.id, [p1.id, p2.id])

    const players = await getPlayersForSeason(season.id)
    expect(players.map((p) => p.id).sort()).toEqual([p1.id, p2.id].sort())
  })

  it("deduplicates players that are in multiple teams of the same season", async () => {
    const season = await createSeason({ name: "S1", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "GPS2", isActive: true })
    const t1 = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
    const t2 = await createTeam({ seasonId: season.id, name: "Team B", league: null, teamSize: 6 })
    const player = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    await setTeamPlayers(t1.id, [player.id])
    await setTeamPlayers(t2.id, [player.id])

    const players = await getPlayersForSeason(season.id)
    expect(players).toHaveLength(1)
  })
})

describe("getPlayersWithoutParticipation", () => {
  it("returns team players that have not responded to a tie", async () => {
    const season = await createSeason({ name: "S1", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "GWOP1", isActive: true })
    const team = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
    const p1 = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    const p2 = await createPlayer({ firstName: "Bob", lastName: "Schmidt" })
    await setTeamPlayers(team.id, [p1.id, p2.id])

    const tie = await createTie({ teamId: team.id, opponent: "Opponent", tieDate: "2024-06-01", location: null, isHome: true, notes: null })

    // Only p1 has responded
    await upsertParticipation({ tieId: tie.id, playerId: p1.id, status: "confirmed", comment: null })

    const withoutParticipation = await getPlayersWithoutParticipation(tie.id)
    expect(withoutParticipation).toHaveLength(1)
    expect(withoutParticipation[0].playerId).toBe(p2.id)
  })

  it("returns empty array if all team players have responded", async () => {
    const season = await createSeason({ name: "S2", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "GWOP2", isActive: true })
    const team = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
    const player = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    await setTeamPlayers(team.id, [player.id])
    const tie = await createTie({ teamId: team.id, opponent: "Opponent", tieDate: "2024-07-01", location: null, isHome: false, notes: null })
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "maybe", comment: null })

    expect(await getPlayersWithoutParticipation(tie.id)).toHaveLength(0)
  })

  it("returns empty array for a non-existent tie id", async () => {
    expect(await getPlayersWithoutParticipation(99999)).toEqual([])
  })
})

describe("updatePlayer", () => {
  it("updates player fields", async () => {
    const player = await createPlayer({ firstName: "Old", lastName: "Name" })
    const updated = await updatePlayer(player.id, { firstName: "New", lastName: "Name" })
    expect(updated?.firstName).toBe("New")
  })

  it("returns undefined for a non-existent player", async () => {
    expect(await updatePlayer(99999, { firstName: "X", lastName: "Y" })).toBeUndefined()
  })
})

describe("deletePlayer", () => {
  it("deletes an existing player", async () => {
    const player = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    await deletePlayer(player.id)
    expect(await getPlayerById(player.id)).toBeUndefined()
  })

  it("resolves silently for a non-existent player", async () => {
    await expect(deletePlayer(99999)).resolves.not.toThrow()
  })
})
