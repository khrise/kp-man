/**
 * @jest-environment node
 */
import DashboardPage from "@/app/admin/dashboard/page"
import PlayersPage from "@/app/admin/players/page"
import UsersPage from "@/app/admin/users/page"
import SeasonsPage from "@/app/admin/seasons/page"
import TeamsPage from "@/app/admin/teams/page"
import TiesPage from "@/app/admin/ties/page"
import SettingsPage from "@/app/admin/settings/page"
import LineupPage from "@/app/admin/ties/[tieId]/lineup/page"
import { requireAdminPage } from "@/lib/server/auth"
import * as db from "@/lib/db"
import { getLineupData } from "@/app/actions/lineup"

jest.mock("@/lib/server/auth", () => ({ requireAdminPage: jest.fn() }))
jest.mock("@/lib/team-captains", () => ({
  getCaptainOptions: jest.fn().mockResolvedValue([]),
  getCaptainTeamIds: jest.fn().mockResolvedValue([]),
  getTeamCaptains: jest.fn().mockResolvedValue([]),
}))
jest.mock("@/lib/db", () => ({
  getSeasons: jest.fn().mockResolvedValue([]),
  getTeams: jest.fn().mockResolvedValue([]),
  getPlayers: jest.fn().mockResolvedValue([]),
  getCurrentSeason: jest.fn(),
  getTiesWithLineupInfo: jest.fn().mockResolvedValue([]),
}))
jest.mock("@/app/actions/lineup", () => ({ getLineupData: jest.fn().mockResolvedValue({}) }))
jest.mock("@/app/actions/players", () => ({ getPlayersAdminList: jest.fn().mockResolvedValue([]) }))
jest.mock("@/components/auth-guard", () => ({ AuthGuard: () => null }))
jest.mock("@/components/admin-header", () => ({ AdminHeader: () => null }))
jest.mock("@/app/admin/dashboard/dashboard-client", () => () => null)
jest.mock("@/app/admin/players/players-client", () => () => null)
jest.mock("@/app/admin/users/users-client", () => () => null)
jest.mock("@/app/admin/seasons/seasons-client", () => ({ SeasonsClient: () => null }))
jest.mock("@/app/admin/teams/teams-client", () => ({ TeamsClient: () => null }))
jest.mock("@/app/admin/ties/ties-client", () => ({ TiesClient: () => null }))
jest.mock("@/app/admin/settings/settings-client", () => () => null)
jest.mock("@/app/admin/ties/[tieId]/lineup/lineup-client", () => ({ LineupClient: () => null }))

const pages = [
  { name: "dashboard", render: () => DashboardPage() },
  { name: "players", render: () => PlayersPage() },
  { name: "users", render: () => UsersPage() },
  { name: "seasons", render: () => SeasonsPage() },
  { name: "teams", render: () => TeamsPage() },
  { name: "ties", render: () => TiesPage() },
  { name: "settings", render: () => SettingsPage() },
  { name: "lineup", render: () => LineupPage({ params: Promise.resolve({ tieId: "1" }) }) },
]

beforeEach(() => {
  jest.clearAllMocks()
})

it.each(pages)("guards $name before rendering or loading data", async ({ render }) => {
  const denied = new Error("Access denied")
  jest.mocked(requireAdminPage).mockRejectedValueOnce(denied)
  await expect(render()).rejects.toBe(denied)
  for (const fn of Object.values(db)) {
    if (jest.isMockFunction(fn)) expect(fn).not.toHaveBeenCalled()
  }
  expect(getLineupData).not.toHaveBeenCalled()
})

it.each(pages)("renders $name for an admin", async ({ render }) => {
  jest.mocked(requireAdminPage).mockResolvedValueOnce({
    id: 1, username: "admin", email: "admin@example.com", role: "admin", passwordHash: "test-hash",
    playerId: null, createdAt: new Date(), updatedAt: new Date(),
  })
  await expect(render()).resolves.toBeDefined()
  expect(requireAdminPage).toHaveBeenCalledTimes(1)
})
