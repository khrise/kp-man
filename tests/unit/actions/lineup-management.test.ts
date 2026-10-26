/**
 * @jest-environment node
 */
import {
  markTieReadyAction,
  saveParticipationCaptainCommentAction,
  setManagedParticipationStatusAction,
  toggleLineupAction,
} from "@/app/actions/lineup"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/db", () => ({
  getTieById: jest.fn(),
  getParticipationById: jest.fn(),
  getLineupCount: jest.fn(),
  updateParticipationLineup: jest.fn(),
  updateTieReady: jest.fn(),
  setManagedParticipationStatus: jest.fn(),
  updateParticipationCaptainComment: jest.fn(),
}))
jest.mock("@/lib/server/auth", () => ({
  requirePermission: jest.fn(),
  requireTeamPermission: jest.fn().mockResolvedValue({ id: 8, username: "captain" }),
}))
jest.mock("@/lib/permissions", () => ({
  Permission: { LineupManage: "lineup.manage", LineupReopen: "lineup.reopen" },
}))

import * as db from "@/lib/db"
import { revalidatePath } from "next/cache"

const mockDb = jest.mocked(db)
const mockRevalidatePath = revalidatePath as jest.Mock

const tie = {
  id: 4,
  teamId: 9,
  opponent: "Rivals",
  tieDate: new Date(),
  location: null,
  isHome: true,
  isLineupReady: false,
  notes: null,
  captainComment: null,
  captainCommentBy: null,
  captainCommentAuthorUsername: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDb.getTieById.mockResolvedValue(tie)
})

it("allows finalizing a lineup with zero selected players", async () => {
  await markTieReadyAction("4", true)

  expect(mockDb.updateTieReady).toHaveBeenCalledWith(4, true)
  expect(mockDb.getLineupCount).not.toHaveBeenCalled()
  expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/ties/4/lineup")
})

it("allows adding players without applying a team-size limit", async () => {
  mockDb.getParticipationById.mockResolvedValue({
    id: 12,
    tieId: 4,
    playerId: 5,
    status: "confirmed",
    comment: null,
    isInLineup: false,
    respondedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  await toggleLineupAction("12", "4")

  expect(mockDb.updateParticipationLineup).toHaveBeenCalledWith(12, true)
  expect(mockDb.getLineupCount).not.toHaveBeenCalled()
})

it("delegates captain-managed RSVP status changes and refreshes relevant views", async () => {
  await setManagedParticipationStatusAction("4", "5", "maybe")

  expect(mockDb.setManagedParticipationStatus).toHaveBeenCalledWith(4, 5, "maybe", "captain")
  expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/ties/4/lineup")
  expect(mockRevalidatePath).toHaveBeenCalledWith("/spieltage")
})

it("rejects unknown RSVP statuses", async () => {
  await expect(
    setManagedParticipationStatusAction("4", "5", "unknown" as "confirmed"),
  ).rejects.toThrow("Invalid participation status")
  expect(mockDb.setManagedParticipationStatus).not.toHaveBeenCalled()
})

it("saves a captain comment by player ID without needing an RSVP", async () => {
  await saveParticipationCaptainCommentAction("4", "5", "  Doubles only  ")

  expect(mockDb.updateParticipationCaptainComment).toHaveBeenCalledWith(4, 5, "Doubles only", 8, "captain", null)
  expect(mockDb.getParticipationById).not.toHaveBeenCalled()
  expect(mockDb.setManagedParticipationStatus).not.toHaveBeenCalled()
})

it("passes combined status and comment changes to the atomic database operation", async () => {
  await saveParticipationCaptainCommentAction("4", "5", "Doubles only", "confirmed")
  expect(mockDb.updateParticipationCaptainComment).toHaveBeenCalledWith(4, 5, "Doubles only", 8, "captain", "confirmed")
})
