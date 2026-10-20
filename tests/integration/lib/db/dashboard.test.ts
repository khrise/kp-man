import { Pool } from "pg"
import { setupTestDatabase, truncateAllTables, TestDatabaseContext } from "../../../helpers/db-test-harness"
import { createSeason, createTeam, createPlayer, createTie, getDashboardStats } from "@/lib/db"

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

describe("getDashboardStats", () => {
  it("returns zero counts when the database is empty", async () => {
    const stats = await getDashboardStats()
    expect(Number(stats.totalSeasons)).toBe(0)
    expect(Number(stats.totalTeams)).toBe(0)
    expect(Number(stats.totalPlayers)).toBe(0)
    expect(Number(stats.upcomingTies)).toBe(0)
  })

  it("counts seasons correctly after inserts", async () => {
    await createSeason({ name: "S1", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "DS1", isActive: true })
    await createSeason({ name: "S2", startDate: "2025-01-01", endDate: "2025-12-31", accessCode: "DS2", isActive: false })
    const stats = await getDashboardStats()
    expect(Number(stats.totalSeasons)).toBe(2)
  })

  it("counts teams correctly", async () => {
    const season = await createSeason({ name: "S1", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "DST1", isActive: true })
    await createTeam({ seasonId: season.id, name: "T1", league: null, teamSize: 6 })
    await createTeam({ seasonId: season.id, name: "T2", league: null, teamSize: 6 })
    const stats = await getDashboardStats()
    expect(Number(stats.totalTeams)).toBe(2)
  })

  it("counts players correctly", async () => {
    await createPlayer({ firstName: "A", lastName: "A" })
    await createPlayer({ firstName: "B", lastName: "B" })
    await createPlayer({ firstName: "C", lastName: "C" })
    const stats = await getDashboardStats()
    expect(Number(stats.totalPlayers)).toBe(3)
  })

  it("counts only upcoming ties (tieDate in the future)", async () => {
    const season = await createSeason({ name: "S1", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "DSUP1", isActive: true })
    const team = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })

    // Past tie
    await createTie({ teamId: team.id, opponent: "Past", tieDate: "2000-01-01", location: null, isHome: true, notes: null })
    // Future tie
    await createTie({ teamId: team.id, opponent: "Future", tieDate: "2099-12-31", location: null, isHome: true, notes: null })

    const stats = await getDashboardStats()
    expect(Number(stats.upcomingTies)).toBe(1)
  })
})
