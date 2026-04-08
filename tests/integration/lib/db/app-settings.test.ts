import { Pool } from "pg"
import { setupTestDatabase, truncateAllTables, TestDatabaseContext } from "../../../helpers/db-test-harness"
import { getAllAppSettings, getAppSetting, setAppSetting, deleteAppSetting } from "@/lib/db"

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

describe("setAppSetting", () => {
  it("creates a new setting", async () => {
    const setting = await setAppSetting("theme", "dark", "string", "UI theme")
    expect(setting.key).toBe("theme")
    expect(setting.value).toBe("dark")
    expect(setting.type).toBe("string")
    expect(setting.description).toBe("UI theme")
  })

  it("updates an existing setting on conflict (upsert)", async () => {
    await setAppSetting("theme", "dark", "string")
    const updated = await setAppSetting("theme", "light", "string", "Updated description")
    expect(updated.value).toBe("light")
    expect(updated.description).toBe("Updated description")
  })

  it("defaults type to string", async () => {
    const setting = await setAppSetting("myKey", "myVal")
    expect(setting.type).toBe("string")
  })

  it("accepts all valid type values", async () => {
    const s1 = await setAppSetting("boolKey", "true", "boolean")
    const s2 = await setAppSetting("numKey", "42", "number")
    const s3 = await setAppSetting("jsonKey", '{"a":1}', "json")
    expect(s1.type).toBe("boolean")
    expect(s2.type).toBe("number")
    expect(s3.type).toBe("json")
  })
})

describe("getAllAppSettings", () => {
  it("returns empty array when no settings exist", async () => {
    expect(await getAllAppSettings()).toEqual([])
  })

  it("returns all settings ordered by key", async () => {
    await setAppSetting("zebra", "z")
    await setAppSetting("alpha", "a")
    const settings = await getAllAppSettings()
    expect(settings[0].key).toBe("alpha")
    expect(settings[1].key).toBe("zebra")
  })
})

describe("getAppSetting", () => {
  it("returns the setting for an existing key", async () => {
    await setAppSetting("clubName", "Tennis Club")
    const setting = await getAppSetting("clubName")
    expect(setting?.value).toBe("Tennis Club")
  })

  it("returns undefined for a non-existent key", async () => {
    expect(await getAppSetting("nonExistentKey")).toBeUndefined()
  })
})

describe("deleteAppSetting", () => {
  it("deletes an existing setting", async () => {
    await setAppSetting("toDelete", "value")
    await deleteAppSetting("toDelete")
    expect(await getAppSetting("toDelete")).toBeUndefined()
  })

  it("resolves silently when key does not exist", async () => {
    await expect(deleteAppSetting("doesNotExist")).resolves.not.toThrow()
  })
})
