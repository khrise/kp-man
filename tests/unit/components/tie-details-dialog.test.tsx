import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { TieDetailsDialog } from "@/components/tie-details-dialog"
import type { TieWithDetails } from "@/app/ties/spieltage-client"
import type { ParticipationWithPlayer } from "@/lib/db"

jest.mock("@/app/actions/public", () => ({
  getParticipationsForTie: jest.fn(),
}))

import { getParticipationsForTie } from "@/app/actions/public"

const mockGetParticipationsForTie = getParticipationsForTie as jest.Mock

const baseTie: TieWithDetails = {
  id: 1,
  teamId: 10,
  opponent: "Rivals FC",
  tieDate: new Date("2024-06-15T14:00:00Z"),
  location: "Home Court",
  isHome: true,
  teamName: "Team Alpha",
  confirmedCount: 2,
  maybeCount: 1,
  declinedCount: 1,
  isLineupReady: false,
}

function makeParticipation(overrides: Partial<ParticipationWithPlayer>): ParticipationWithPlayer {
  return {
    id: Math.random(),
    tieId: 1,
    playerId: Math.random(),
    status: "confirmed",
    comment: null,
    isInLineup: false,
    respondedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    firstName: "Anna",
    lastName: "Müller",
    playerRank: 1,
    ...overrides,
  }
}

describe("TieDetailsDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders tie details: opponent, location, and participation counts", async () => {
    mockGetParticipationsForTie.mockResolvedValueOnce([])
    render(<TieDetailsDialog tie={baseTie} open={true} onOpenChange={jest.fn()} />)
    expect(screen.getByText(/Rivals FC/)).toBeInTheDocument()
    expect(screen.getByText(/Home Court/)).toBeInTheDocument()
    // participation summary line (confirmed, maybe, declined counts from the tie prop)
    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument())
  })

  it("shows confirmed players after participations load", async () => {
    const confirmed = makeParticipation({ firstName: "Anna", lastName: "Müller", status: "confirmed", playerRank: 1 })
    mockGetParticipationsForTie.mockResolvedValueOnce([confirmed])
    render(<TieDetailsDialog tie={baseTie} open={true} onOpenChange={jest.fn()} />)
    await waitFor(() => expect(screen.getByText(/Anna Müller/)).toBeInTheDocument())
  })

  it("shows maybe and declined players after participations load", async () => {
    const maybe = makeParticipation({ firstName: "Bob", lastName: "Schmidt", status: "maybe", playerRank: 2 })
    const declined = makeParticipation({ firstName: "Carol", lastName: "Braun", status: "declined", playerRank: 3 })
    mockGetParticipationsForTie.mockResolvedValueOnce([maybe, declined])
    render(<TieDetailsDialog tie={baseTie} open={true} onOpenChange={jest.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/Bob Schmidt/)).toBeInTheDocument()
      expect(screen.getByText(/Carol Braun/)).toBeInTheDocument()
    })
  })

  it("sorts confirmed players by playerRank ascending", async () => {
    const p1 = makeParticipation({ firstName: "Charlie", lastName: "D", status: "confirmed", playerRank: 2 })
    const p2 = makeParticipation({ firstName: "Alice", lastName: "Z", status: "confirmed", playerRank: 1 })
    mockGetParticipationsForTie.mockResolvedValueOnce([p1, p2])
    render(<TieDetailsDialog tie={baseTie} open={true} onOpenChange={jest.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/Alice Z/)).toBeInTheDocument()
      expect(screen.getByText(/Charlie D/)).toBeInTheDocument()
    })
    // Alice (rank 1) should appear before Charlie (rank 2) in the DOM
    const allText = screen.getAllByText(/Alice Z|Charlie D/)
    const aliceIndex = allText.findIndex((el) => el.textContent?.includes("Alice"))
    const charlieIndex = allText.findIndex((el) => el.textContent?.includes("Charlie"))
    expect(aliceIndex).toBeLessThan(charlieIndex)
  })

  it("shows 'no responses' message when participations list is empty", async () => {
    mockGetParticipationsForTie.mockResolvedValueOnce([])
    render(<TieDetailsDialog tie={baseTie} open={true} onOpenChange={jest.fn()} />)
    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument())
    // The component shows a "noResponses" i18n key when no participations
    expect(screen.queryByText(/Anna|Bob/)).not.toBeInTheDocument()
  })
})
