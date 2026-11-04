import { Pool } from "pg"
import { setupTestDatabase, truncateAllTables, TestDatabaseContext } from "../../../helpers/db-test-harness"
import {
  createSeason,
  createTeam,
  createPlayer,
  createTie,
  createUser,
  updateUser,
  deleteUser,
  deleteTeam,
  getUnassignedCaptainUsers,
  upsertNotificationSetting,
  getNotificationSettings,
  getCaptainRecipientsForTeam,
  getNextUpcomingTieId,
  getParticipationByTieAndPlayer,
  upsertParticipation,
} from "@/lib/db"

let ctx: TestDatabaseContext

const setTeamCaptains = async (teamId: number, userIds: number[]) => {
  await ctx.db.deleteFrom("teamCaptains").where("teamId", "=", teamId).execute()
  if (userIds.length) {
    await ctx.db.insertInto("teamCaptains").values(userIds.map((userId) => ({ teamId, userId }))).execute()
  }
}
const getTeamCaptainIds = async (teamId: number) =>
  (await ctx.db.selectFrom("teamCaptains").select("userId").where("teamId", "=", teamId).execute()).map((r) => r.userId)

beforeAll(async () => {
  ctx = await setupTestDatabase()
})
afterAll(async () => {
  await ctx.cleanup()
})
beforeEach(async () => {
  await truncateAllTables(ctx.pool as unknown as Pool)
})

async function fixture() {
  const season = await createSeason({ name: "S1", startDate: "2024-01-01", endDate: "2030-12-31", accessCode: "CAP01", isActive: true })
  const team = await createTeam({ seasonId: season.id, name: "H40", league: null, teamSize: 6 })
  const mk = (username: string, role: "team_captain" | "user" | "admin" = "team_captain", playerId: number | null = null) =>
    createUser({ username, email: `${username}@x.de`, passwordHash: "x", role, playerId })
  return { season, team, mk }
}

describe("captain assignment cleanup", () => {
  it("removes assignments when the role changes or the user/team is deleted", async () => {
    const { team, mk } = await fixture()
    const c1 = await mk("c1")
    const c2 = await mk("c2")
    await setTeamCaptains(team.id, [c1.id, c2.id])

    await updateUser(c1.id, { username: "c1", email: "c1@x.de", role: "user", playerId: null })
    expect(await getTeamCaptainIds(team.id)).toEqual([c2.id])

    await deleteUser(c2.id)
    expect(await getTeamCaptainIds(team.id)).toEqual([])

    const c3 = await mk("c3")
    await setTeamCaptains(team.id, [c3.id])
    await deleteTeam(team.id)
    expect(await getUnassignedCaptainUsers()).toEqual([expect.objectContaining({ username: "c3" })])
  })
})

describe("notification settings and recipients", () => {
  it("upserts settings per user and channel", async () => {
    const { mk } = await fixture()
    const c = await mk("c1")
    await upsertNotificationSetting({ userId: c.id, channel: "pushover", enabled: true, target: "k1", windowMode: "days_7" })
    await upsertNotificationSetting({ userId: c.id, channel: "pushover", enabled: false, target: "k2", windowMode: "all" })
    const settings = await getNotificationSettings(c.id)
    expect(settings).toHaveLength(1)
    expect(settings[0]).toMatchObject({ enabled: false, target: "k2", windowMode: "all" })
  })

  it("returns only enabled settings of captains of that team", async () => {
    const { season, team, mk } = await fixture()
    const other = await createTeam({ seasonId: season.id, name: "D40", league: null, teamSize: 6 })
    const player = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    const enabled = await mk("enabled", "team_captain", player.id)
    const disabled = await mk("disabled")
    const elsewhere = await mk("elsewhere")
    await setTeamCaptains(team.id, [enabled.id, disabled.id])
    await setTeamCaptains(other.id, [elsewhere.id])
    for (const [u, on] of [[enabled, true], [disabled, false], [elsewhere, true]] as const) {
      await upsertNotificationSetting({ userId: u.id, channel: "pushover", enabled: on, target: "key", windowMode: "days_14" })
    }

    const recipients = await getCaptainRecipientsForTeam(team.id)
    expect(recipients).toEqual([
      { userId: enabled.id, playerId: player.id, channel: "pushover", target: "key", windowMode: "days_14" },
    ])
  })
})

describe("ties and participations helpers", () => {
  it("finds the next upcoming tie of a team", async () => {
    const { team } = await fixture()
    const past = await createTie({ teamId: team.id, opponent: "A", tieDate: "2020-01-01", location: null, isHome: true, notes: null })
    const soon = await createTie({ teamId: team.id, opponent: "B", tieDate: "2099-01-01", location: null, isHome: true, notes: null })
    await createTie({ teamId: team.id, opponent: "C", tieDate: "2099-06-01", location: null, isHome: true, notes: null })
    expect(past.id).not.toBe(soon.id)
    expect(await getNextUpcomingTieId(team.id, new Date())).toBe(soon.id)
  })

  it("exposes the previous participation before an upsert", async () => {
    const { team } = await fixture()
    const player = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    const tie = await createTie({ teamId: team.id, opponent: "A", tieDate: "2099-01-01", location: null, isHome: true, notes: null })
    expect(await getParticipationByTieAndPlayer(tie.id, player.id)).toBeUndefined()
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    expect((await getParticipationByTieAndPlayer(tie.id, player.id))?.status).toBe("confirmed")
  })
})
