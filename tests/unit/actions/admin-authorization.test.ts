/**
 * @jest-environment node
 */
import * as users from "@/app/actions/users"
import * as players from "@/app/actions/players"
import * as seasons from "@/app/actions/seasons"
import * as teams from "@/app/actions/teams"
import * as ties from "@/app/actions/ties"
import * as lineup from "@/app/actions/lineup"
import * as settings from "@/app/actions/settings"
import * as dashboard from "@/app/actions/dashboard"
import * as publicActions from "@/app/actions/public"
import { getClubName } from "@/app/actions/config"
import { updateParticipationAction } from "@/app/actions/participations"
import { POST } from "@/app/api/proxy-fetch/route"
import { NextRequest } from "next/server"
import { auth } from "@/lib/next-auth"
import * as db from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { User } from "@/lib/db"
import type { Session } from "next-auth"
import { setTeamCaptains } from "@/lib/team-captains"

jest.mock("server-only", () => ({}), { virtual: true })
jest.mock("@/lib/next-auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/team-captains", () => ({
  getCaptainTeamIds: jest.fn().mockResolvedValue([]),
  getPlayerTeamIds: jest.fn().mockResolvedValue([]),
  getTeamIdsByPlayer: jest.fn().mockResolvedValue(new Map()),
  setTeamCaptains: jest.fn(),
}))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/config-service", () => ({
  refreshConfig: jest.fn(),
  getConfigValue: jest.fn().mockResolvedValue("Sports Club"),
}))
jest.mock("@/lib/db", () => ({
  getUserById: jest.fn(),
  getUsersWithPlayerInfo: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  updateUserPassword: jest.fn(),
  deleteUser: jest.fn(),
  getPlayersAdminList: jest.fn().mockResolvedValue([]),
  getPlayers: jest.fn(),
  createPlayer: jest.fn(),
  updatePlayer: jest.fn(),
  deletePlayer: jest.fn(),
  getCurrentSeason: jest.fn(),
  createSeason: jest.fn(),
  updateSeason: jest.fn(),
  deleteSeason: jest.fn(),
  createTeam: jest.fn(),
  updateTeam: jest.fn(),
  deleteTeam: jest.fn(),
  setTeamPlayers: jest.fn(),
  createTie: jest.fn(),
  updateTie: jest.fn(),
  deleteTie: jest.fn(),
  getParticipationById: jest.fn(),
  getTieById: jest.fn(),
  getTeamById: jest.fn(),
  getLineupCount: jest.fn(),
  updateParticipationLineup: jest.fn(),
  updateTieReady: jest.fn(),
  getTieWithParticipations: jest.fn(),
  getPlayersWithoutParticipation: jest.fn(),
  getAllAppSettings: jest.fn(),
  getAppSetting: jest.fn(),
  setAppSetting: jest.fn(),
  deleteAppSetting: jest.fn(),
  getDashboardStats: jest.fn(),
  getSeasonByAccessCode: jest.fn(),
  getSeasonById: jest.fn(),
  getTeamsBySeasonId: jest.fn(),
  getSeasonPlayerRanks: jest.fn(),
  getTiesBySeasonId: jest.fn(),
  getPlayersForSeason: jest.fn(),
  getParticipationsForPlayer: jest.fn(),
  getParticipations: jest.fn(),
  upsertParticipation: jest.fn(),
}))

const mockAuth = jest.mocked<() => Promise<Session | null>>(auth)
const mockDb = jest.mocked(db)
const admin: User = {
  id: 1, username: "admin", email: "admin@example.com", role: "admin", passwordHash: "test-hash",
  playerId: null, createdAt: new Date(), updatedAt: new Date(),
}

function form() {
  const data = new FormData()
  Object.entries({
    username: "new-user", email: "new@example.com", password: "test-password",
    role: "player", player_id: "", first_name: "Test", last_name: "Player",
    name: "Test", start_date: "2026-01-01", end_date: "2026-12-31",
    access_code: "test-code", season_id: "1", team_id: "1", team_size: "1",
    opponent: "Opponent", date_time: "2026-11-01T12:00:00Z",
  }).forEach(([key, value]) => data.set(key, value))
  return data
}

const protectedActions: Array<{ name: string; run: () => Promise<unknown>; query: keyof typeof db | "setTeamCaptains" }> = [
  { name: "getUsers", run: () => users.getUsers(), query: "getUsersWithPlayerInfo" },
  { name: "createUserAction", run: () => users.createUserAction(form()), query: "createUser" },
  { name: "updateUserAction", run: () => users.updateUserAction("1", form()), query: "updateUser" },
  { name: "updateUserPasswordAction", run: () => users.updateUserPasswordAction("1", form()), query: "updateUserPassword" },
  { name: "deleteUserAction", run: () => users.deleteUserAction("1"), query: "deleteUser" },
  { name: "getPlayersAdminList", run: () => players.getPlayersAdminList(), query: "getPlayersAdminList" },
  { name: "getPlayers", run: () => players.getPlayers(), query: "getPlayers" },
  { name: "createPlayerAction", run: () => players.createPlayerAction(form()), query: "createPlayer" },
  { name: "updatePlayerAction", run: () => players.updatePlayerAction("1", form()), query: "updatePlayer" },
  { name: "deletePlayerAction", run: () => players.deletePlayerAction("1"), query: "deletePlayer" },
  { name: "getCurrentSeasonAction", run: () => seasons.getCurrentSeasonAction(), query: "getCurrentSeason" },
  { name: "createSeasonAction", run: () => seasons.createSeasonAction(form()), query: "createSeason" },
  { name: "updateSeasonAction", run: () => seasons.updateSeasonAction("1", form()), query: "updateSeason" },
  { name: "deleteSeasonAction", run: () => seasons.deleteSeasonAction("1"), query: "deleteSeason" },
  { name: "createTeamAction", run: () => teams.createTeamAction(form()), query: "createTeam" },
  { name: "updateTeamAction", run: () => teams.updateTeamAction("1", form()), query: "updateTeam" },
  { name: "deleteTeamAction", run: () => teams.deleteTeamAction("1"), query: "deleteTeam" },
  { name: "updateTeamCaptainsAction", run: () => teams.updateTeamCaptainsAction(1, []), query: "setTeamCaptains" },
  { name: "createTieAction", run: () => ties.createTieAction(form()), query: "createTie" },
  { name: "updateTieAction", run: () => ties.updateTieAction("1", form()), query: "updateTie" },
  { name: "deleteTieAction", run: () => ties.deleteTieAction("1"), query: "deleteTie" },
  { name: "toggleLineupAction", run: () => lineup.toggleLineupAction("1", "1"), query: "updateParticipationLineup" },
  { name: "markTieReadyAction", run: () => lineup.markTieReadyAction("1", false), query: "updateTieReady" },
  { name: "getLineupData", run: () => lineup.getLineupData("1"), query: "getTieWithParticipations" },
  { name: "getSettings", run: () => settings.getSettings(), query: "getAllAppSettings" },
  { name: "getSetting", run: () => settings.getSetting("clubName"), query: "getAppSetting" },
  { name: "updateSetting", run: () => settings.updateSetting("clubName", "Test Club"), query: "setAppSetting" },
  { name: "removeSetting", run: () => settings.removeSetting("clubName"), query: "deleteAppSetting" },
  { name: "fetchDashboardStats", run: () => dashboard.fetchDashboardStats(), query: "getDashboardStats" },
]

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: "1", username: "admin", email: admin.email }, expires: "2099-01-01" })
  mockDb.getUserById.mockResolvedValue(admin)
})

describe.each([
  { label: "anonymous", role: null },
  { label: "player", role: "player" },
  { label: "regular user", role: "user" },
  { label: "deleted user", role: "deleted" },
] as const)("$label cannot access admin actions", ({ role }) => {
  it.each(protectedActions)("$name rejects before protected reads, writes or revalidation", async ({ run }) => {
    if (role === null) mockAuth.mockResolvedValue(null)
    else mockDb.getUserById.mockResolvedValue(role === "deleted" ? undefined : { ...admin, role })

    await expect(run()).rejects.toMatchObject({ status: role === null ? 401 : 403 })
    for (const [name, fn] of Object.entries(mockDb)) {
      if (name !== "getUserById" && jest.isMockFunction(fn)) expect(fn).not.toHaveBeenCalled()
    }
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(setTeamCaptains).not.toHaveBeenCalled()
  })
})

it("covers every export in the admin action modules", () => {
  expect(protectedActions.map(({ name }) => name).sort()).toEqual(
    [users, players, seasons, teams, ties, lineup, settings, dashboard].flatMap(Object.keys).sort(),
  )
})

it.each(protectedActions)("allows an admin to execute $name", async ({ run, query }) => {
  mockDb.getParticipationById.mockResolvedValue({
    id: 1, tieId: 1, playerId: 1, status: "confirmed", comment: null,
    isInLineup: false, respondedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
  })
  const tie = {
    id: 1, teamId: 1, opponent: "Opponent", tieDate: new Date(), location: null,
    isHome: true, isLineupReady: false, notes: null, createdAt: new Date(), updatedAt: new Date(),
  }
  mockDb.getTieById.mockResolvedValue(tie)
  const team = {
    id: 1, seasonId: 1, name: "Team", league: null, teamSize: 1,
    playerIds: [], createdAt: new Date(), updatedAt: new Date(),
  }
  mockDb.getTeamById.mockResolvedValue(team)
  mockDb.getTieWithParticipations.mockResolvedValue({
    ...tie, team, participations: [], confirmedCount: 0, maybeCount: 0, declinedCount: 0,
  })
  mockDb.getLineupCount.mockResolvedValue(0)
  await run()
  expect(mockDb.getUserById).toHaveBeenCalledWith(1)
  expect(query === "setTeamCaptains" ? setTeamCaptains : mockDb[query]).toHaveBeenCalled()
})

describe("admin-only match import endpoint", () => {
  it.each([null, "player", "user"] as const)("denies %s before fetching", async (role) => {
    if (role === null) mockAuth.mockResolvedValue(null)
    else mockDb.getUserById.mockResolvedValue({ ...admin, role })
    const fetchMock = jest.spyOn(global, "fetch")
    try {
      const response = await POST(new NextRequest("http://localhost/api/proxy-fetch", {
        method: "POST", body: JSON.stringify({ url: "https://example.com" }),
      }))
      expect(response.status).toBe(role === null ? 401 : 403)
      expect(await response.json()).toEqual({
        error: role === null ? "Authentication required" : "Access denied",
      })
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      fetchMock.mockRestore()
    }
  })
})

describe("public actions remain accessible without login", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(null)
  })

  it("keeps all public read actions available", async () => {
    mockDb.getPlayersForSeason.mockResolvedValue([])
    await publicActions.validateAccessCode("test-code")
    await publicActions.getSeasonInfo("1")
    await publicActions.getTeamsForSeason("1")
    await publicActions.getPlayerRanksForSeason("1")
    await publicActions.getTiesForSeason("1")
    await publicActions.getPlayersForSeason("1")
    await publicActions.getParticipationsForPlayer(1, 1)
    await publicActions.getParticipationsForTie("1")
    await expect(getClubName()).resolves.toBe("Sports Club")
    expect(mockAuth).not.toHaveBeenCalled()
  })

  it("keeps public availability submissions available", async () => {
    await publicActions.updateParticipation("1", "2", "confirmed", "Available")
    await expect(updateParticipationAction("1", "2", "maybe", null)).resolves.toEqual({ success: true })
    expect(mockDb.upsertParticipation).toHaveBeenCalledTimes(2)
    expect(mockAuth).not.toHaveBeenCalled()
  })
})
