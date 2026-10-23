/**
 * @jest-environment node
 */
import { updateParticipationAction } from "@/app/actions/participations"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/db", () => ({
  upsertParticipation: jest.fn(),
}))

import * as db from "@/lib/db"
import { revalidatePath } from "next/cache"

const mockDb = db as jest.Mocked<typeof db>
const mockRevalidatePath = revalidatePath as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe("updateParticipationAction", () => {
  it("calls db.upsertParticipation with parsed ids and revalidates", async () => {
    mockDb.upsertParticipation.mockResolvedValueOnce({} as never)
    const result = await updateParticipationAction("3", "7", "confirmed", "See you there")
    expect(mockDb.upsertParticipation).toHaveBeenCalledWith({ tieId: 3, playerId: 7, status: "confirmed", comment: "See you there" })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/spieltage")
    expect(result).toEqual({ success: true })
  })

  it("passes null comment when comment is null", async () => {
    mockDb.upsertParticipation.mockResolvedValueOnce({} as never)
    await updateParticipationAction("1", "2", "declined", null)
    expect(mockDb.upsertParticipation).toHaveBeenCalledWith(expect.objectContaining({ comment: null }))
  })

  it("accepts all valid status values", async () => {
    mockDb.upsertParticipation.mockResolvedValue({} as never)
    await updateParticipationAction("1", "2", "confirmed", null)
    await updateParticipationAction("1", "2", "maybe", null)
    await updateParticipationAction("1", "2", "declined", null)
    expect(mockDb.upsertParticipation).toHaveBeenCalledTimes(3)
  })

  it("throws on non-numeric tieId", async () => {
    await expect(updateParticipationAction("bad", "2", "confirmed", null)).rejects.toThrow("Invalid tie id")
  })

  it("throws on non-numeric playerId", async () => {
    await expect(updateParticipationAction("1", "bad", "confirmed", null)).rejects.toThrow("Invalid player id")
  })
})
