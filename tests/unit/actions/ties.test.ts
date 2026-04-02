/**
 * @jest-environment node
 */
import { createTieAction, updateTieAction, deleteTieAction } from "@/app/actions/ties"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/db", () => ({
  createTie: jest.fn(),
  updateTie: jest.fn(),
  deleteTie: jest.fn(),
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
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

describe("createTieAction", () => {
  it("creates a tie and revalidates", async () => {
    mockDb.createTie.mockResolvedValueOnce({} as never)
    const fd = makeFormData({ team_id: "2", opponent: "Rivals", date_time: "2024-06-15T14:00:00Z", location: "Court A", is_home: "true" })
    const result = await createTieAction(fd)
    expect(mockDb.createTie).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 2, opponent: "Rivals", location: "Court A", isHome: true, notes: null }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/ties")
    expect(result).toEqual({ success: true })
  })

  it("treats empty location as null", async () => {
    mockDb.createTie.mockResolvedValueOnce({} as never)
    const fd = makeFormData({ team_id: "2", opponent: "Rivals", date_time: "2024-06-15T14:00:00Z", location: "", is_home: "false" })
    await createTieAction(fd)
    expect(mockDb.createTie).toHaveBeenCalledWith(expect.objectContaining({ location: null }))
  })

  it("parses is_home=false correctly", async () => {
    mockDb.createTie.mockResolvedValueOnce({} as never)
    const fd = makeFormData({ team_id: "2", opponent: "X", date_time: "2024-06-15T14:00:00Z", location: "", is_home: "false" })
    await createTieAction(fd)
    expect(mockDb.createTie).toHaveBeenCalledWith(expect.objectContaining({ isHome: false }))
  })

  it("throws on invalid team_id", async () => {
    const fd = makeFormData({ team_id: "bad", opponent: "X", date_time: "2024-06-15T14:00:00Z", location: "", is_home: "true" })
    await expect(createTieAction(fd)).rejects.toThrow("Invalid team id")
  })

  it("throws on invalid date_time", async () => {
    const fd = makeFormData({ team_id: "1", opponent: "X", date_time: "not-a-date", location: "", is_home: "true" })
    await expect(createTieAction(fd)).rejects.toThrow("Invalid tie date")
  })

  it("throws on empty date_time", async () => {
    const fd = makeFormData({ team_id: "1", opponent: "X", date_time: "", location: "", is_home: "true" })
    await expect(createTieAction(fd)).rejects.toThrow("Invalid tie date")
  })
})

describe("updateTieAction", () => {
  it("updates a tie and revalidates", async () => {
    mockDb.updateTie.mockResolvedValueOnce({} as never)
    const fd = makeFormData({ team_id: "2", opponent: "New Rival", date_time: "2024-07-20T10:00:00Z", location: "Away Court", is_home: "false" })
    const result = await updateTieAction("9", fd)
    expect(mockDb.updateTie).toHaveBeenCalledWith(9, expect.objectContaining({ opponent: "New Rival", isHome: false }))
    expect(result).toEqual({ success: true })
  })

  it("throws on invalid tie id", async () => {
    const fd = makeFormData({ team_id: "1", opponent: "X", date_time: "2024-06-15T14:00:00Z", location: "", is_home: "true" })
    await expect(updateTieAction("nope", fd)).rejects.toThrow("Invalid tie id")
  })
})

describe("deleteTieAction", () => {
  it("deletes a tie and revalidates", async () => {
    mockDb.deleteTie.mockResolvedValueOnce(undefined)
    const result = await deleteTieAction("4")
    expect(mockDb.deleteTie).toHaveBeenCalledWith(4)
    expect(result).toEqual({ success: true })
  })

  it("throws on invalid tie id", async () => {
    await expect(deleteTieAction("bad")).rejects.toThrow("Invalid tie id")
  })
})
