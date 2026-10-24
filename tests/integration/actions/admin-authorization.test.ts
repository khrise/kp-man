import { setupTestDatabase, truncateAllTables, type TestDatabaseContext } from "../../helpers/db-test-harness"
import * as db from "@/lib/db"
import { auth } from "@/lib/next-auth"
import { requireAdmin } from "@/lib/server/auth"
import { createPlayerAction } from "@/app/actions/players"
import { getUsers, updateUserAction, updateUserPasswordAction, deleteUserAction } from "@/app/actions/users"
import { getLineupData, toggleLineupAction, markTieReadyAction } from "@/app/actions/lineup"
import { getSettings, updateSetting } from "@/app/actions/settings"
import { validateAccessCode, getTiesForSeason, updateParticipation } from "@/app/actions/public"
import { POST } from "@/app/api/proxy-fetch/route"
import { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import type { Session } from "next-auth"

jest.mock("server-only", () => ({}), { virtual: true })
jest.mock("@/lib/next-auth", () => ({ auth: jest.fn() }))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))

let ctx: TestDatabaseContext
const mockAuth = jest.mocked<() => Promise<Session | null>>(auth)

beforeAll(async () => {
  ctx = await setupTestDatabase()
})

afterAll(async () => {
  if (ctx) await ctx.cleanup()
})

beforeEach(async () => {
  jest.clearAllMocks()
  await truncateAllTables(ctx.pool)
  mockAuth.mockResolvedValue(null)
})

async function createUser(role: db.User["role"]) {
  return db.createUser({
    username: role, email: `${role}@example.com`, passwordHash: "test-hash", role, playerId: null,
  })
}

function signInAs(user: db.User) {
  mockAuth.mockResolvedValue({
    user: { id: String(user.id), username: user.username, email: user.email }, expires: "2099-01-01",
  })
}

async function seedTie() {
  const season = await db.createSeason({
    name: "Season", startDate: "2026-01-01", endDate: "2026-12-31", accessCode: "public-code",
  })
  const team = await db.createTeam({ seasonId: season.id, name: "Team", teamSize: 1, league: null })
  const player = await db.createPlayer({ firstName: "Test", lastName: "Player" })
  await db.setTeamPlayers(team.id, [player.id])
  const tie = await db.createTie({
    teamId: team.id, opponent: "Opponent", tieDate: "2026-11-01T12:00:00Z",
    location: null, isHome: true, notes: null,
  })
  const participation = await db.upsertParticipation({
    tieId: tie.id, playerId: player.id, status: "confirmed", comment: "Private comment",
  })
  return { season, player, tie, participation }
}

describe("database-backed admin authorization", () => {
  it.each(["user", "player", "team_captain"] as const)("denies %s reads and writes without modifying data", async (role) => {
    const user = await createUser(role)
    const target = await createUser("admin")
    const { tie, participation } = await seedTie()
    signInAs(user)
    const form = new FormData()
    form.set("username", target.username)
    form.set("email", target.email)
    form.set("role", "player")
    form.set("password", "replacement-password")

    const deniedActions = [
      () => getUsers(),
      () => createPlayerAction(form),
      () => updateUserAction(String(target.id), form),
      () => updateUserPasswordAction(String(target.id), form),
      () => deleteUserAction(String(target.id)),
      () => getLineupData(String(tie.id)),
      () => toggleLineupAction(String(participation.id), String(tie.id)),
      () => markTieReadyAction(String(tie.id), false),
      () => getSettings(),
      () => updateSetting("clubName", "Unauthorized change"),
    ]
    for (const run of deniedActions) {
      await expect(run()).rejects.toMatchObject({ status: 403 })
    }
    expect((await db.getPlayers())).toHaveLength(1)
    expect(await db.getUserById(target.id)).toEqual(target)
    expect((await db.getUserByUsernameWithPassword(target.username))?.passwordHash).toBe("test-hash")
    expect((await db.getParticipationById(participation.id))?.isInLineup).toBe(false)
    expect((await db.getTieById(tie.id))?.isLineupReady).toBe(false)
    expect(await db.getAppSetting("clubName")).toBeUndefined()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("denies anonymous users and leaves the database unchanged", async () => {
    await expect(createPlayerAction(new FormData())).rejects.toMatchObject({ status: 401 })
    await expect(getUsers()).rejects.toMatchObject({ status: 401 })
    expect(await db.getPlayers()).toEqual([])
  })

  it("allows admin reads and writes including lineup changes", async () => {
    signInAs(await createUser("admin"))
    const { tie, participation } = await seedTie()
    const form = new FormData()
    form.set("first_name", "New")
    form.set("last_name", "Player")
    await expect(createPlayerAction(form)).resolves.toEqual({ success: true })
    expect(await db.getPlayers()).toHaveLength(2)
    expect(await getUsers()).toHaveLength(1)
    expect((await getLineupData(String(tie.id))).tie.id).toBe(tie.id)
    await toggleLineupAction(String(participation.id), String(tie.id))
    await markTieReadyAction(String(tie.id), true)
    expect((await db.getParticipationById(participation.id))?.isInLineup).toBe(true)
    expect((await db.getTieById(tie.id))?.isLineupReady).toBe(true)
    await expect(updateSetting("clubName", "Authorized Club")).resolves.toEqual({ success: true })
    expect((await getSettings()).find((setting) => setting.key === "clubName")?.value).toBe("Authorized Club")
  })

  it("revokes an existing session immediately after demotion or deletion", async () => {
    const user = await createUser("admin")
    signInAs(user)
    await expect(requireAdmin()).resolves.toMatchObject({ id: user.id })
    await db.updateUser(user.id, { role: "player" })
    await expect(getUsers()).rejects.toMatchObject({ status: 403 })
    await db.deleteUser(user.id)
    await expect(getUsers()).rejects.toMatchObject({ status: 403 })
  })
})

describe("match-import API authorization", () => {
  function request() {
    return new NextRequest("http://localhost/api/proxy-fetch", {
      method: "POST", body: JSON.stringify({ url: "https://example.com" }),
    })
  }

  it("returns 401 to anonymous callers and 403 to a non-admin without fetching", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
    try {
      expect((await POST(request())).status).toBe(401)
      signInAs(await createUser("player"))
      expect((await POST(request())).status).toBe(403)
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      fetchMock.mockRestore()
    }
  })

  it("allows admins to import a match page", async () => {
    signInAs(await createUser("admin"))
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("<html>Match</html>", { status: 200 }),
    )
    try {
      const response = await POST(request())
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ html: "<html>Match</html>" })
    } finally {
      fetchMock.mockRestore()
    }
  })
})

it("preserves anonymous public season access and availability updates", async () => {
  const { season, player, tie } = await seedTie()
  await expect(validateAccessCode("public-code")).resolves.toEqual({ valid: true, seasonId: season.id })
  expect(await getTiesForSeason(String(season.id))).toHaveLength(1)
  await updateParticipation(String(tie.id), String(player.id), "maybe", "Updated availability")
  expect((await db.getParticipations(tie.id))[0]).toMatchObject({ status: "maybe", comment: "Updated availability" })
  expect(mockAuth).not.toHaveBeenCalled()
})
