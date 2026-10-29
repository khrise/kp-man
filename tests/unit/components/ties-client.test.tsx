import React from "react"
import { render, screen } from "@testing-library/react"
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
      lineupCount: 0, lineupPlayers: [], problematicCount: 0, isLineupReady: false,
    }]}
    teams={[{ id: 1, seasonId: 1, name: "Team" }]}
    seasons={[{ id: 1, name: "Summer" }]}
    currentSeasonId={1}
  />)
  expect(screen.getByText("Bring new balls")).toHaveClass("whitespace-pre-wrap", "break-words")
  expect(screen.getByText("commentBy Captain Player")).toBeInTheDocument()
})
