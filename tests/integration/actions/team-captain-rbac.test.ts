import { setupTestDatabase, truncateAllTables, type TestDatabaseContext } from "../../helpers/db-test-harness"
import * as db from "@/lib/db"
import { auth } from "@/lib/next-auth"
import { requirePermission } from "@/lib/server/auth"
import { Permission } from "@/lib/permissions"
import { getCaptainOptions, getCaptainTeamIds, getTeamCaptains, setTeamCaptains } from "@/lib/team-captains"
import { updateTeamAction, updateTeamCaptainsAction, createTeamAction, deleteTeamAction } from "@/app/actions/teams"
import { getPlayersAdminList, createPlayerAction, updatePlayerAction, deletePlayerAction } from "@/app/actions/players"
import { createTieAction, updateTieAction, deleteTieAction } from "@/app/actions/ties"
import { getLineupData, toggleLineupAction, markTieReadyAction } from "@/app/actions/lineup"
import { getCurrentSeasonAction, createSeasonAction } from "@/app/actions/seasons"
import { fetchDashboardStats } from "@/app/actions/dashboard"
import { getUsers } from "@/app/actions/users"
import { getSettings } from "@/app/actions/settings"
import { POST } from "@/app/api/proxy-fetch/route"
import { NextRequest } from "next/server"
import type { Session } from "next-auth"

jest.mock("server-only", () => ({}), { virtual: true })
jest.mock("@/lib/next-auth", () => ({ auth: jest.fn() }))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))

let ctx: TestDatabaseContext
const mockAuth = jest.mocked<() => Promise<Session | null>>(auth)

beforeAll(async () => { ctx = await setupTestDatabase() })
afterAll(async () => { if (ctx) await ctx.cleanup() })
beforeEach(async () => {
  jest.clearAllMocks()
  await truncateAllTables(ctx.pool)
  mockAuth.mockResolvedValue(null)
})

function signIn(user: db.User) {
  mockAuth.mockResolvedValue({
    user: { id: String(user.id), username: user.username, email: user.email }, expires: "2099-01-01",
  })
}

async function user(username: string, role: db.User["role"] = "team_captain") {
  return db.createUser({ username, role, email: `${username}@example.com`, passwordHash: "hash", playerId: null })
}

async function fixtures() {
  const captain = await user("captain")
  const otherCaptain = await user("other")
  const admin = await user("admin", "admin")
  const season = await db.createSeason({
    name: "Assigned season", startDate: "2026-01-01", endDate: "2026-12-31", accessCode: "assigned",
  })
  const otherSeason = await db.createSeason({
    name: "Other season", startDate: "2027-01-01", endDate: "2027-12-31", accessCode: "other",
  })
  await db.setCurrentSeason(season.id)
  const a = await db.createTeam({ seasonId: season.id, name: "Assigned", league: null, teamSize: 1 })
  const b = await db.createTeam({ seasonId: otherSeason.id, name: "Unassigned", league: null, teamSize: 1 })
  await setTeamCaptains(a.id, [captain.id])
  await setTeamCaptains(b.id, [otherCaptain.id])
  const playerA = await db.createPlayer({ firstName: "A", lastName: "Player" })
  const playerB = await db.createPlayer({ firstName: "B", lastName: "Player" })
  await db.setTeamPlayers(a.id, [playerA.id])
  await db.setTeamPlayers(b.id, [playerB.id])
  const tieA = await db.createTie({
    teamId: a.id, opponent: "A Rival", tieDate: "2099-11-01T12:00:00Z", isHome: true, location: null, notes: null,
  })
  const tieB = await db.createTie({
    teamId: b.id, opponent: "B Rival", tieDate: "2099-11-02T12:00:00Z", isHome: true, location: null, notes: null,
  })
  const participationA = await db.upsertParticipation({
    tieId: tieA.id, playerId: playerA.id, status: "confirmed", comment: "A comment",
  })
  const participationB = await db.upsertParticipation({
    tieId: tieB.id, playerId: playerB.id, status: "confirmed", comment: "B comment",
  })
  signIn(captain)
  return { captain, otherCaptain, admin, season, otherSeason, a, b, playerA, playerB, tieA, tieB, participationA, participationB }
}

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

describe("captain assignment model", () => {
  it("allows zero/multiple captains per team and multiple teams per captain without exposing account details", async () => {
    const f = await fixtures()
    expect(await getTeamCaptains(f.a.id)).toEqual([{ id: f.captain.id, username: f.captain.username }])
    await setTeamCaptains(f.a.id, [f.captain.id, f.otherCaptain.id])
    expect(await getCaptainTeamIds(f.otherCaptain.id)).toEqual(expect.arrayContaining([f.a.id, f.b.id]))
    expect(await getCaptainOptions()).toEqual(expect.arrayContaining([
      { id: f.captain.id, username: "captain" }, { id: f.otherCaptain.id, username: "other" },
    ]))
    expect(await getCaptainOptions()).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: f.admin.id })]))
    await setTeamCaptains(f.a.id, [])
    expect(await getTeamCaptains(f.a.id)).toEqual([])
    expect(await db.getTeamById(f.a.id)).toBeDefined()
    expect(await db.getUserById(f.captain.id)).toBeDefined()
  })

  it("rejects duplicates, unknown users and users of other roles without replacing existing assignments", async () => {
    const f = await fixtures()
    for (const ids of [[f.captain.id, f.captain.id], [999999], [f.admin.id], [0]]) {
      await expect(setTeamCaptains(f.a.id, ids)).rejects.toThrow()
      expect(await getCaptainTeamIds(f.captain.id)).toEqual([f.a.id])
    }
    await expect(db.db.insertInto("teamCaptains").values({ teamId: f.a.id, userId: f.admin.id }).execute()).rejects.toThrow()
  })

  it("clears assignments on role change and deletion, including direct SQL role updates", async () => {
    const f = await fixtures()
    await db.updateUser(f.captain.id, { role: "player" })
    expect(await getCaptainTeamIds(f.captain.id)).toEqual([])
    await db.updateUser(f.captain.id, { role: "team_captain" })
    expect(await getCaptainTeamIds(f.captain.id)).toEqual([])
    await setTeamCaptains(f.a.id, [f.captain.id])
    await db.deleteUser(f.captain.id)
    expect(await getTeamCaptains(f.a.id)).toEqual([])
    await db.deleteTeam(f.b.id)
    expect(await getCaptainTeamIds(f.otherCaptain.id)).toEqual([])
  })

  it("only allows admins to change assignments, including assigning themselves", async () => {
    const f = await fixtures()
    await expect(updateTeamCaptainsAction(f.b.id, [f.captain.id])).rejects.toMatchObject({ status: 403 })
    signIn(f.admin)
    await updateTeamCaptainsAction(f.b.id, [f.captain.id])
    expect(await getCaptainTeamIds(f.captain.id)).toEqual(expect.arrayContaining([f.a.id, f.b.id]))
  })
})

describe("team-scoped reads", () => {
  it("filters team, season, player and match queries and dashboard counts to assigned teams", async () => {
    const f = await fixtures()
    const ids = await getCaptainTeamIds(f.captain.id)
    expect((await db.getTeams(ids)).map((team) => team.id)).toEqual([f.a.id])
    expect((await db.getSeasons(ids)).map((season) => season.id)).toEqual([f.season.id])
    expect((await db.getPlayers(ids)).map((player) => player.id)).toEqual([f.playerA.id])
    expect((await db.getTiesWithLineupInfo(ids)).map((tie) => tie.id)).toEqual([f.tieA.id])
    const result = await fetchDashboardStats()
    expect(result.data).toEqual({ totalSeasons: 1, totalTeams: 1, totalPlayers: 1, upcomingTies: 1 })
    expect((await getLineupData(String(f.tieA.id))).availablePlayers[0].comment).toBe("A comment")
    await expect(getLineupData(String(f.tieB.id))).rejects.toMatchObject({ status: 403 })
    await expect(requirePermission(Permission.AuditRead)).resolves.toMatchObject({ id: f.captain.id })
    await db.setCurrentSeason(f.otherSeason.id)
    expect((await getCurrentSeasonAction()).data).toBeNull()
  })

  it("returns empty lists for captains without assignments and removes access immediately", async () => {
    const f = await fixtures()
    await setTeamCaptains(f.a.id, [])
    expect((await fetchDashboardStats()).data).toEqual({
      totalSeasons: 0, totalTeams: 0, totalPlayers: 0, upcomingTies: 0,
    })
    expect(await getPlayersAdminList()).toEqual([])
    await expect(getLineupData(String(f.tieA.id))).rejects.toMatchObject({ status: 403 })
    signIn(f.admin)
    expect((await getLineupData(String(f.tieA.id))).tie.id).toBe(f.tieA.id)
  })
})

describe("operational permissions", () => {
  it("allows lineup selection and finalization but not reopening", async () => {
    const f = await fixtures()
    await toggleLineupAction(String(f.participationA.id), String(f.tieA.id))
    await markTieReadyAction(String(f.tieA.id), true)
    await expect(markTieReadyAction(String(f.tieA.id), false)).rejects.toMatchObject({ status: 403 })
    await expect(toggleLineupAction(String(f.participationA.id), String(f.tieA.id))).rejects.toThrow("finalized")
    signIn(f.admin)
    await markTieReadyAction(String(f.tieA.id), false)
    expect((await db.getTieById(f.tieA.id))?.isLineupReady).toBe(false)
  })

  it("rejects cross-team lineup IDs and mismatched participation IDs", async () => {
    const f = await fixtures()
    await expect(toggleLineupAction(String(f.participationB.id), String(f.tieA.id))).rejects.toThrow("does not belong")
    await expect(toggleLineupAction(String(f.participationB.id), String(f.tieB.id))).rejects.toMatchObject({ status: 403 })
    await expect(markTieReadyAction(String(f.tieB.id), true)).rejects.toMatchObject({ status: 403 })
    expect((await db.getParticipationById(f.participationB.id))?.isInLineup).toBe(false)
  })

  it("allows assigned team edits and roster ranking but denies season moves and foreign roster IDs before writing", async () => {
    const f = await fixtures()
    const fields = { season_id: String(f.season.id), name: "Renamed", team_size: "2", player_ids: JSON.stringify([f.playerA.id]) }
    await updateTeamAction(String(f.a.id), form(fields))
    expect((await db.getTeamById(f.a.id))?.name).toBe("Renamed")
    await expect(updateTeamAction(String(f.a.id), form({ ...fields, name: "Bad", season_id: String(f.otherSeason.id) })))
      .rejects.toMatchObject({ status: 403 })
    await expect(updateTeamAction(String(f.a.id), form({ ...fields, name: "Bad", player_ids: JSON.stringify([f.playerB.id]) })))
      .rejects.toMatchObject({ status: 403 })
    await expect(updateTeamAction(String(f.b.id), form(fields))).rejects.toMatchObject({ status: 403 })
    expect((await db.getTeamById(f.a.id))?.name).toBe("Renamed")
  })

  it("allows match CRUD only for assigned source and target teams", async () => {
    const f = await fixtures()
    const fields = { team_id: String(f.a.id), opponent: "New rival", date_time: "2099-12-01T12:00:00Z" }
    await createTieAction(form(fields))
    await updateTieAction(String(f.tieA.id), form(fields))
    await expect(createTieAction(form({ ...fields, team_id: String(f.b.id) }))).rejects.toMatchObject({ status: 403 })
    await expect(updateTieAction(String(f.tieA.id), form({ ...fields, team_id: String(f.b.id) }))).rejects.toMatchObject({ status: 403 })
    await expect(updateTieAction(String(f.tieB.id), form(fields))).rejects.toMatchObject({ status: 403 })
    await expect(deleteTieAction(String(f.tieB.id))).rejects.toMatchObject({ status: 403 })
    await deleteTieAction(String(f.tieA.id))
    expect(await db.getTieById(f.tieA.id)).toBeUndefined()
    expect(await db.getTieById(f.tieB.id)).toBeDefined()
  })

  it("keeps global administration restricted", async () => {
    const f = await fixtures()
    const actions = [
      () => getUsers(), () => getSettings(), () => createSeasonAction(new FormData()),
      () => createTeamAction(new FormData()), () => deleteTeamAction(String(f.a.id)),
      () => deletePlayerAction(String(f.playerA.id)),
    ]
    for (const run of actions) await expect(run()).rejects.toMatchObject({ status: 403 })
  })
})

describe("shared player policy", () => {
  it("creates players in assigned teams and requires all memberships for global name edits", async () => {
    const f = await fixtures()
    await createPlayerAction(form({ first_name: "New", last_name: "Player", team_id: String(f.a.id) }))
    expect(await db.getTeamPlayers(f.a.id)).toHaveLength(2)
    await expect(createPlayerAction(form({ first_name: "Bad", last_name: "Player", team_id: String(f.b.id) })))
      .rejects.toMatchObject({ status: 403 })
    await updatePlayerAction(String(f.playerA.id), form({ first_name: "Allowed", last_name: "Player" }))
    await db.setTeamPlayers(f.b.id, [f.playerB.id, f.playerA.id])
    await expect(updatePlayerAction(String(f.playerA.id), form({ first_name: "Bad", last_name: "Player" })))
      .rejects.toMatchObject({ status: 403 })
    const visible = await getPlayersAdminList()
    expect(visible.find((player) => player.id === f.playerA.id)).toMatchObject({ canEdit: false })
    expect(visible.find((player) => player.id === f.playerA.id)?.teams.map((team) => team.id)).toEqual([f.a.id])
    await setTeamCaptains(f.b.id, [f.captain.id])
    await updatePlayerAction(String(f.playerA.id), form({ first_name: "AllAssigned", last_name: "Player" }))
    expect((await db.getPlayerById(f.playerA.id))?.firstName).toBe("AllAssigned")
  })
})

it("requires an assigned team for captain imports and permits matching team imports", async () => {
  const f = await fixtures()
  const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response("<html>match</html>"))
  function request(teamId?: number) {
    return new NextRequest("http://localhost/api/proxy-fetch", {
      method: "POST", body: JSON.stringify({ url: "https://example.com", teamId }),
    })
  }
  try {
    expect((await POST(request())).status).toBe(400)
    expect((await POST(request(f.b.id))).status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
    expect((await POST(request(f.a.id))).status).toBe(200)
  } finally {
    fetchMock.mockRestore()
  }
})
