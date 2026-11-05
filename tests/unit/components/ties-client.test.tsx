import React from "react"
import { render, screen, within } from "@testing-library/react"
import { TiesClient } from "@/app/admin/ties/ties-client"

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock("@/app/actions/ties", () => ({
  createTieAction: jest.fn(), updateTieAction: jest.fn(), deleteTieAction: jest.fn(),
}))
jest.mock("@/lib/i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: "de" }),
}))

it("displays the tie captain comment and author in the overview", () => {
  render(<TiesClient
    initialTies={[{
      id: 1, teamId: 1, opponent: "Rivals", tieDate: new Date("2026-06-01T12:00:00Z"),
      location: "Home court", isHome: true, notes: null,
      captainComment: "Bring new balls", captainCommentAuthor: "Captain Player",
      seasonId: 1, teamName: "Team", seasonName: "Summer", teamSize: 6,
      lineupCount: 1, lineupPlayers: [{ playerRank: 1, firstName: "Anna", lastName: "Müller", status: "confirmed" }],
      problematicCount: 0, isLineupReady: false,
      confirmedCount: 2, maybeCount: 1, declinedCount: 1,
    }]}
    teams={[{ id: 1, seasonId: 1, name: "Team" }]}
    seasons={[{ id: 1, name: "Summer" }]}
    currentSeasonId={1}
  />)
  expect(screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent?.startsWith(
    new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date("2026-06-01T12:00:00Z")),
  ))).toBeInTheDocument()
  expect(screen.getByText("Bring new balls")).toHaveClass("whitespace-pre-wrap", "break-words")
  expect(screen.getByText("commentBy Captain Player")).toBeInTheDocument()
  expect(screen.getByLabelText("confirmed: 2")).toHaveTextContent("2")
  const rsvpLabel = screen.getByText("RSVP:")
  const separator = screen.getByRole("separator")
  const lineupSummary = screen.getByText("lineup: 1/6")
  expect(rsvpLabel.compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(separator.compareDocumentPosition(lineupSummary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(within(screen.getByLabelText("confirmed: 2")).getByText("2")).toHaveClass("bg-green-100", "text-green-800")
  expect(within(screen.getByLabelText("maybe: 1")).getByText("1")).toHaveClass("bg-yellow-100", "text-yellow-800")
  expect(within(screen.getByLabelText("declined: 1")).getByText("1")).toHaveClass("bg-red-100", "text-red-800")
})
