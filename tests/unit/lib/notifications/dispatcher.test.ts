/**
 * @jest-environment node
 */
jest.mock("@/lib/db", () => ({
  getParticipationNotificationContext: jest.fn(),
  getCaptainRecipientsForTeam: jest.fn(),
  getNextUpcomingTieId: jest.fn(),
  getParticipationByTieAndPlayer: jest.fn(),
  upsertParticipation: jest.fn(),
}))

import * as db from "@/lib/db"
import { notifyParticipationChange, sendNotification, upsertParticipationAndNotify } from "@/lib/notifications/dispatcher"
import { registerProvider } from "@/lib/notifications/registry"
import { PushoverProvider } from "@/lib/notifications/providers/pushover"

const mockDb = db as jest.Mocked<typeof db>
const send = jest.fn()
const originalEnv = process.env

const part = (status: "confirmed" | "maybe" | "declined", comment: string | null = null) =>
  ({ id: 1, tieId: 10, playerId: 5, status, comment }) as never

const tieDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

beforeEach(() => {
  jest.clearAllMocks()
  process.env = { ...originalEnv, NOTIFICATIONS_ENABLED: "true" }
  // a fake second channel proves new channels need no dispatcher changes
  registerProvider({ channel: "fake", send })
  send.mockResolvedValue(undefined)
  mockDb.getParticipationNotificationContext.mockResolvedValue({
    tie: { id: 10, teamId: 1, opponent: "Rivals", tieDate, isHome: true, teamName: "H40" },
    player: { id: 5, firstName: "Anna", lastName: "Müller" },
  } as never)
  mockDb.getCaptainRecipientsForTeam.mockResolvedValue([
    { userId: 1, playerId: null, channel: "fake", target: "key", windowMode: "days_14" },
  ])
  mockDb.getNextUpcomingTieId.mockResolvedValue(10)
})

afterAll(() => {
  process.env = originalEnv
})

describe("notifyParticipationChange", () => {
  it("notifies on a new response and on a status change", async () => {
    await notifyParticipationChange(undefined, part("confirmed"))
    await notifyParticipationChange(part("confirmed"), part("declined"))
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[1][1].body).toContain("Zugesagt → Abgesagt")
  })

  it("notifies on a comment change but not when nothing changed", async () => {
    await notifyParticipationChange(part("maybe", null), part("maybe", "später"))
    expect(send).toHaveBeenCalledTimes(1)
    send.mockClear()
    await notifyParticipationChange(part("maybe", "x"), part("maybe", "x"))
    expect(send).not.toHaveBeenCalled()
  })

  it("does not notify the captain about their own change", async () => {
    mockDb.getCaptainRecipientsForTeam.mockResolvedValue([
      { userId: 1, playerId: 5, channel: "fake", target: "key", windowMode: "all" },
    ])
    await notifyParticipationChange(undefined, part("declined"))
    expect(send).not.toHaveBeenCalled()
  })

  it("respects the window preset", async () => {
    mockDb.getCaptainRecipientsForTeam.mockResolvedValue([
      { userId: 1, playerId: null, channel: "fake", target: "key", windowMode: "days_7" },
      { userId: 2, playerId: null, channel: "fake", target: "key2", windowMode: "next_tie" },
    ])
    mockDb.getNextUpcomingTieId.mockResolvedValue(99)
    await notifyParticipationChange(undefined, part("confirmed"))
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toBe("key")
  })

  it("is suppressed when notifications are disabled", async () => {
    process.env.NOTIFICATIONS_ENABLED = "false"
    await notifyParticipationChange(undefined, part("confirmed"))
    expect(send).not.toHaveBeenCalled()
  })

  it("keeps going when one channel fails", async () => {
    mockDb.getCaptainRecipientsForTeam.mockResolvedValue([
      { userId: 1, playerId: null, channel: "fake", target: "bad", windowMode: "all" },
      { userId: 2, playerId: null, channel: "fake", target: "good", windowMode: "all" },
    ])
    send.mockRejectedValueOnce(new Error("boom"))
    jest.spyOn(console, "error").mockImplementation(() => {})
    await expect(notifyParticipationChange(undefined, part("confirmed"))).resolves.toBeUndefined()
    expect(send).toHaveBeenCalledTimes(2)
  })
})

describe("upsertParticipationAndNotify", () => {
  it("returns the participation even if notifying fails", async () => {
    mockDb.getParticipationByTieAndPlayer.mockResolvedValue(undefined)
    mockDb.upsertParticipation.mockResolvedValue(part("confirmed"))
    mockDb.getParticipationNotificationContext.mockRejectedValue(new Error("db down"))
    jest.spyOn(console, "error").mockImplementation(() => {})
    const result = await upsertParticipationAndNotify({ tieId: 10, playerId: 5, status: "confirmed", comment: null })
    expect(result.status).toBe("confirmed")
  })
})

describe("sendNotification", () => {
  it("is skipped when disabled unless forced", async () => {
    process.env.NOTIFICATIONS_ENABLED = "false"
    const message = { title: "t", body: "b" }
    expect(await sendNotification({ channel: "fake", target: "k", message })).toBe(false)
    expect(send).not.toHaveBeenCalled()
    expect(await sendNotification({ channel: "fake", target: "k", message, force: true })).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
  })
})

describe("PushoverProvider", () => {
  it("posts token and user key and throws without leaking secrets on failure", async () => {
    process.env.PUSHOVER_APP_TOKEN = "app-secret"
    const fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock as never
    await new PushoverProvider().send("user-key", { title: "T", body: "B" })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toMatchObject({ token: "app-secret", user: "user-key", title: "T", message: "B" })

    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ errors: ["user identifier is invalid"] }) })
    const error = await new PushoverProvider().send("user-key", { title: "T", body: "B" }).catch((e) => e)
    expect(error.message).toContain("400")
    expect(error.message).not.toContain("app-secret")
    expect(error.message).not.toContain("user-key")
  })

  it("fails clearly without app token", async () => {
    delete process.env.PUSHOVER_APP_TOKEN
    await expect(new PushoverProvider().send("k", { title: "T", body: "B" })).rejects.toThrow("PUSHOVER_APP_TOKEN")
  })
})
