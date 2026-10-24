import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { TeamsClient } from "@/app/admin/teams/teams-client"
import { ManagementProvider } from "@/components/management-provider"
import { updateTeamCaptainsAction } from "@/app/actions/teams"
import { AdminHeader } from "@/components/admin-header"
import type { UserRole } from "@/lib/types"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
  usePathname: () => "/admin/teams",
}))
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { username: "manager" } } }),
  signOut: jest.fn(),
}))
jest.mock("@/components/admin-language-switcher", () => ({ AdminLanguageSwitcher: () => null }))
jest.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
jest.mock("@/app/actions/teams", () => ({
  createTeamAction: jest.fn(),
  updateTeamAction: jest.fn(),
  deleteTeamAction: jest.fn(),
  updateTeamCaptainsAction: jest.fn(),
}))

const teams = [{
  id: 1, seasonId: 1, name: "First team", league: null, teamSize: 6, players: [],
  captains: [{ id: 7, username: "captain-one" }],
}]

function renderTeams(role: UserRole) {
  return render(
    <ManagementProvider role={role}>
      <TeamsClient initialTeams={teams} seasons={[{ id: 1, name: "Season" }]} players={[]} currentSeasonId={1}
        captainOptions={[{ id: 7, username: "captain-one" }, { id: 8, username: "captain-two" }]} />
    </ManagementProvider>,
  )
}

beforeEach(() => { jest.clearAllMocks() })

it("hides global administration and assignments from captains but allows team editing", () => {
  renderTeams("team_captain")
  expect(screen.queryByRole("button", { name: "addTeam" })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "delete" })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "manageCaptains" })).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: "edit" })).toBeInTheDocument()
  expect(screen.getByText(/captain-one/)).toBeInTheDocument()
})

it("lets an admin replace a team's captain assignments", async () => {
  jest.mocked(updateTeamCaptainsAction).mockResolvedValue({ success: true })
  renderTeams("admin")
  fireEvent.click(screen.getByRole("button", { name: "manageCaptains" }))
  expect(screen.getByRole("checkbox", { name: "captain-one" })).toBeChecked()
  fireEvent.click(screen.getByRole("checkbox", { name: "captain-two" }))
  fireEvent.click(screen.getByRole("button", { name: "save" }))
  await waitFor(() => expect(updateTeamCaptainsAction).toHaveBeenCalledWith(1, [7, 8]))
  await waitFor(() => expect(screen.queryByRole("checkbox")).not.toBeInTheDocument())
})

it("shows assignment errors and keeps the editor open", async () => {
  jest.mocked(updateTeamCaptainsAction).mockRejectedValueOnce(new Error("Assignment denied"))
  const errorLog = jest.spyOn(console, "error").mockImplementation(() => {})
  try {
    renderTeams("admin")
    fireEvent.click(screen.getByRole("button", { name: "manageCaptains" }))
    fireEvent.click(screen.getByRole("button", { name: "save" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Assignment denied")
    expect(screen.getByRole("checkbox", { name: "captain-one" })).toBeInTheDocument()
  } finally {
    errorLog.mockRestore()
  }
})

it.each(["admin", "team_captain"] as const)("shows only permitted header links for %s", (role) => {
  render(<ManagementProvider role={role}><AdminHeader /></ManagementProvider>)
  expect(screen.getByRole("link", { name: "teams" })).toBeInTheDocument()
  expect(screen.queryByRole("link", { name: "users" }) !== null).toBe(role === "admin")
  expect(screen.queryByRole("link", { name: "settings" }) !== null).toBe(role === "admin")
})
