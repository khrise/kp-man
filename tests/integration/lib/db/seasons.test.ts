import { Pool } from "pg"
import { setupTestDatabase, truncateAllTables, TestDatabaseContext } from "../../../helpers/db-test-harness"
import {
  createSeason,
  getSeasons,
  getSeasonById,
  getSeasonByAccessCode,
  updateSeason,
  deleteSeason,
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

const baseSeasonData = {
  name: "Season 2024",
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  accessCode: "ABC123",
  isActive: true,
}

describe("createSeason", () => {
  it("creates and returns a season", async () => {
    const season = await createSeason(baseSeasonData)
    expect(season.id).toBeDefined()
    expect(season.name).toBe("Season 2024")
    expect(season.accessCode).toBe("ABC123")
    expect(season.isActive).toBe(true)
  })

  it("throws on duplicate access code", async () => {
    await createSeason(baseSeasonData)
    await expect(createSeason(baseSeasonData)).rejects.toThrow()
  })
})

describe("getSeasons", () => {
  it("returns empty array when no seasons exist", async () => {
    const seasons = await getSeasons()
    expect(seasons).toEqual([])
  })

  it("returns all seasons ordered by startDate desc", async () => {
    await createSeason({ ...baseSeasonData, name: "Season 2022", startDate: "2022-01-01", endDate: "2022-12-31", accessCode: "S2022" })
    await createSeason({ ...baseSeasonData, name: "Season 2023", startDate: "2023-01-01", endDate: "2023-12-31", accessCode: "S2023" })
    const seasons = await getSeasons()
    expect(seasons).toHaveLength(2)
    expect(seasons[0].name).toBe("Season 2023")
    expect(seasons[1].name).toBe("Season 2022")
  })
})

describe("getSeasonById", () => {
  it("returns the season for a valid id", async () => {
    const created = await createSeason(baseSeasonData)
    const found = await getSeasonById(created.id)
    expect(found?.id).toBe(created.id)
    expect(found?.name).toBe("Season 2024")
  })

  it("returns undefined for a non-existent id", async () => {
    const found = await getSeasonById(99999)
    expect(found).toBeUndefined()
  })
})

describe("getSeasonByAccessCode", () => {
  it("returns the season matching the access code", async () => {
    await createSeason(baseSeasonData)
    const found = await getSeasonByAccessCode("ABC123")
    expect(found?.accessCode).toBe("ABC123")
  })

  it("returns undefined for an unknown access code", async () => {
    const found = await getSeasonByAccessCode("UNKNOWN")
    expect(found).toBeUndefined()
  })
})

describe("updateSeason", () => {
  it("updates and returns the modified season", async () => {
    const created = await createSeason(baseSeasonData)
    const updated = await updateSeason(created.id, {
      name: "Updated Season",
      startDate: "2024-02-01",
      endDate: "2024-11-30",
      accessCode: "NEW123",
      isActive: false,
    })
    expect(updated?.name).toBe("Updated Season")
    expect(updated?.accessCode).toBe("NEW123")
    expect(updated?.isActive).toBe(false)
  })

  it("returns undefined when updating a non-existent season", async () => {
    const result = await updateSeason(99999, { name: "X", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "X" })
    expect(result).toBeUndefined()
  })
})

describe("deleteSeason", () => {
  it("deletes an existing season", async () => {
    const created = await createSeason(baseSeasonData)
    await deleteSeason(created.id)
    const found = await getSeasonById(created.id)
    expect(found).toBeUndefined()
  })

  it("deletes nothing silently when season does not exist", async () => {
    await expect(deleteSeason(99999)).resolves.not.toThrow()
  })
})
