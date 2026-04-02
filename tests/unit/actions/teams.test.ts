/**
 * @jest-environment node
 */
import { createTeamAction, updateTeamAction, deleteTeamAction } from "@/app/actions/teams"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/db", () => ({
  createTeam: jest.fn(),
  updateTeam: jest.fn(),
  deleteTeam: jest.fn(),
  setTeamPlayers: jest.fn(),
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

describe("createTeamAction", () => {
  it("creates a team and revalidates", async () => {
    mockDb.createTeam.mockResolvedValueOnce({ id: 1 } as never)
    mockDb.setTeamPlayers.mockResolvedValueOnce(undefined)
    const fd = makeFormData({ season_id: "3", name: "Team A", league: "Liga 1", team_size: "6", player_ids: "[1,2]" })
    const result = await createTeamAction(fd)
    expect(mockDb.createTeam).toHaveBeenCalledWith({ seasonId: 3, name: "Team A", league: "Liga 1", teamSize: 6 })
    expect(mockDb.setTeamPlayers).toHaveBeenCalledWith(1, [1, 2])
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/teams")
    expect(result).toEqual({ success: true })
  })

  it("treats empty league string as null", async () => {
    mockDb.createTeam.mockResolvedValueOnce({ id: 1 } as never)
    const fd = makeFormData({ season_id: "3", name: "Team A", league: "", team_size: "6" })
    await createTeamAction(fd)
    expect(mockDb.createTeam).toHaveBeenCalledWith(expect.objectContaining({ league: null }))
  })

  it("throws on invalid season_id", async () => {
    const fd = makeFormData({ season_id: "abc", name: "X", team_size: "6" })
    await expect(createTeamAction(fd)).rejects.toThrow("Invalid season id")
  })

  it("throws when team_size is less than 1", async () => {
    const fd = makeFormData({ season_id: "1", name: "X", team_size: "0" })
    await expect(createTeamAction(fd)).rejects.toThrow("Invalid team size")
  })
})

describe("updateTeamAction", () => {
  it("updates a team and revalidates", async () => {
    mockDb.updateTeam.mockResolvedValueOnce({} as never)
    mockDb.setTeamPlayers.mockResolvedValueOnce(undefined)
    const fd = makeFormData({ season_id: "3", name: "New Name", league: "Liga 2", team_size: "8", player_ids: "[5]" })
    const result = await updateTeamAction("10", fd)
    expect(mockDb.updateTeam).toHaveBeenCalledWith(10, { seasonId: 3, name: "New Name", league: "Liga 2", teamSize: 8 })
    expect(result).toEqual({ success: true })
  })

  it("throws on invalid team id", async () => {
    const fd = makeFormData({ season_id: "1", name: "X", team_size: "6" })
    await expect(updateTeamAction("bad", fd)).rejects.toThrow("Invalid team id")
  })
})

describe("deleteTeamAction", () => {
  it("deletes a team and revalidates", async () => {
    mockDb.deleteTeam.mockResolvedValueOnce(undefined)
    const result = await deleteTeamAction("5")
    expect(mockDb.deleteTeam).toHaveBeenCalledWith(5)
    expect(result).toEqual({ success: true })
  })

  it("throws on invalid team id", async () => {
    await expect(deleteTeamAction("xyz")).rejects.toThrow("Invalid team id")
  })
})
