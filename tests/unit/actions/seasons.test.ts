/**
 * @jest-environment node
 */
import { createSeasonAction, updateSeasonAction, deleteSeasonAction } from "@/app/actions/seasons"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/db", () => ({
  createSeason: jest.fn(),
  updateSeason: jest.fn(),
  deleteSeason: jest.fn(),
}))

import * as db from "@/lib/db"
import { revalidatePath } from "next/cache"

const mockDb = db as jest.Mocked<typeof db>
const mockRevalidatePath = revalidatePath as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(fields).forEach(([key, value]) => fd.append(key, value))
  return fd
}

describe("createSeasonAction", () => {
  it("calls db.createSeason with parsed form data and revalidates the path", async () => {
    mockDb.createSeason.mockResolvedValueOnce({} as never)
    const fd = makeFormData({ name: "Season 2024", start_date: "2024-01-01", end_date: "2024-12-31", access_code: "ABC" })
    const result = await createSeasonAction(fd)
    expect(mockDb.createSeason).toHaveBeenCalledWith({ name: "Season 2024", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "ABC" })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/seasons")
    expect(result).toEqual({ success: true })
  })
})

describe("updateSeasonAction", () => {
  it("calls db.updateSeason with numeric id and form data", async () => {
    mockDb.updateSeason.mockResolvedValueOnce({} as never)
    const fd = makeFormData({ name: "Updated", start_date: "2024-02-01", end_date: "2024-11-30", access_code: "NEW" })
    const result = await updateSeasonAction("42", fd)
    expect(mockDb.updateSeason).toHaveBeenCalledWith(42, { name: "Updated", startDate: "2024-02-01", endDate: "2024-11-30", accessCode: "NEW" })
    expect(result).toEqual({ success: true })
  })

  it("throws on a non-numeric season id", async () => {
    const fd = makeFormData({ name: "X", start_date: "2024-01-01", end_date: "2024-12-31", access_code: "X" })
    await expect(updateSeasonAction("not-a-number", fd)).rejects.toThrow("Invalid season id")
  })
})

describe("deleteSeasonAction", () => {
  it("calls db.deleteSeason with the numeric id", async () => {
    mockDb.deleteSeason.mockResolvedValueOnce(undefined)
    const result = await deleteSeasonAction("7")
    expect(mockDb.deleteSeason).toHaveBeenCalledWith(7)
    expect(result).toEqual({ success: true })
  })

  it("throws on a non-numeric season id", async () => {
    await expect(deleteSeasonAction("abc")).rejects.toThrow("Invalid season id")
  })
})
