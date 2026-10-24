import React from "react"
import { render, screen, within } from "@testing-library/react"
import { LineupClient } from "@/app/admin/ties/[tieId]/lineup/lineup-client"

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock("@/app/actions/lineup", () => ({
  toggleLineupAction: jest.fn(),
  markTieReadyAction: jest.fn(),
}))
jest.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

type Props = React.ComponentProps<typeof LineupClient>
type AuditEntry = NonNullable<Props["auditEntries"]>[number]

const date = new Date("2026-06-01T12:00:00Z")
const props: Props = {
  tie: {
    id: 1, teamId: 1, opponent: "Rivals", tieDate: date, location: null,
    isHome: true, isLineupReady: false, notes: null, createdAt: date, updatedAt: date,
  },
  team: { id: 1, seasonId: 1, name: "Team", league: null, teamSize: 6, createdAt: date, updatedAt: date },
  lineupPlayers: [], availablePlayers: [], otherParticipations: [], playersWithoutParticipation: [],
  lineupCount: 0, maxPlayers: 6,
}

const entry: AuditEntry = {
  id: 1, participationId: 1, playerId: 1, tieId: 1,
  previousStatus: null, newStatus: null, previousComment: null, newComment: null,
  previousIsInLineup: null, newIsInLineup: null, changedBy: null,
  createdAt: date.toISOString(), playerFirstName: "Anna", playerLastName: "Smith",
}

function renderAudit(changes: Partial<AuditEntry>) {
  render(<LineupClient {...props} auditEntries={[{ ...entry, ...changes }]} />)
  return within(screen.getByRole("listitem"))
}

describe("lineup participation audit", () => {
  it("shows only lineup changes even for historical snapshots", () => {
    const audit = renderAudit({
      previousStatus: "confirmed", newStatus: "confirmed",
      previousComment: "Same", newComment: "Same",
      previousIsInLineup: false, newIsInLineup: true,
    })
    expect(audit.getByText("lineupLabel:")).toBeInTheDocument()
    expect(audit.queryByText("statusLabel:")).not.toBeInTheDocument()
    expect(audit.queryByText("commentChange")).not.toBeInTheDocument()
  })

  it("shows only changed status", () => {
    const audit = renderAudit({ previousStatus: "confirmed", newStatus: "declined" })
    expect(audit.getByText("statusLabel:")).toBeInTheDocument()
    expect(audit.queryByText("lineupLabel:")).not.toBeInTheDocument()
    expect(audit.queryByText("commentChange")).not.toBeInTheDocument()
  })

  it.each([
    { previousComment: "Old", newComment: null },
    { previousComment: null, newComment: "" },
  ])("shows comment-only changes, including clearing and empty strings: %o", (changes) => {
    const audit = renderAudit(changes)
    expect(audit.getByText("commentChange")).toBeInTheDocument()
    expect(audit.queryByText("statusLabel:")).not.toBeInTheDocument()
    expect(audit.queryByText("lineupLabel:")).not.toBeInTheDocument()
  })

  it("displays the empty state when there are no audit entries", () => {
    render(<LineupClient {...props} auditEntries={[]} />)
    expect(screen.getByText("No audit entries")).toBeInTheDocument()
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument()
    expect(screen.queryByText("Anna Smith")).not.toBeInTheDocument()
  })
})
