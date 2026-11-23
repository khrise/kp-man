import React from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { SpieltageClient } from "@/app/ties/spieltage-client"

const searchParams = new URLSearchParams("player=42")

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => searchParams,
}))
jest.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    tWithParams: (key: string) => key,
    locale: "en",
  }),
}))
jest.mock("@/components/language-switcher", () => ({ LanguageSwitcher: () => null }))
jest.mock("@/components/tie-details-dialog", () => ({ TieDetailsDialog: () => null }))
jest.mock("@/components/participation-comment-dialog", () => ({ ParticipationCommentDialog: () => null }))
jest.mock("@/app/actions/public", () => ({
  getSeasonInfo: jest.fn().mockResolvedValue({ id: 1, name: "Season" }),
  getPlayersForSeason: jest.fn().mockResolvedValue([]),
  getTeamsForSeason: jest.fn().mockResolvedValue([{ id: 1, name: "Team" }]),
  getPlayerRanksForSeason: jest.fn().mockResolvedValue([]),
  getParticipationsForPlayer: jest.fn().mockResolvedValue([]),
  getParticipationsForTie: jest.fn().mockResolvedValue([]),
  updateParticipation: jest.fn(),
  getTiesForSeason: jest.fn().mockResolvedValue([
    { id: 1, teamId: 1, opponent: "First", tieDate: new Date("2099-06-01"), participations: [] },
    { id: 2, teamId: 1, opponent: "Second", tieDate: new Date("2099-06-02"), participations: [], isLineupReady: true },
  ]),
}))

beforeEach(() => {
  window.history.replaceState({}, "", "/ties/SEASON?player=42#old")
  localStorage.clear()
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }),
  })
})

it("copies the selected tile's public anchor without the player query or old hash", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } })
  render(<SpieltageClient accessCode="SEASON" seasonId={1} />)

  const buttons = await screen.findAllByRole("button", { name: "copyTieLink" })
  expect(buttons).toHaveLength(2)
  fireEvent.click(buttons[1])

  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/ties/SEASON#tie-2`)
  const tile = document.getElementById("tie-2")!
  expect(await within(tile).findByRole("status")).toHaveTextContent("tieLinkCopied")
  expect(document.getElementById("tie-1")).not.toHaveTextContent("tieLinkCopied")
  expect(window.location.hash).toBe("#old")
})

it.each(["rejected", "unavailable"])("offers a manual link when clipboard access is %s", async (failure) => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: failure === "rejected" ? { writeText: jest.fn().mockRejectedValue(new Error("denied")) } : undefined,
  })
  render(<SpieltageClient accessCode="SEASON" seasonId={1} />)

  fireEvent.click((await screen.findAllByRole("button", { name: "copyTieLink" }))[0])

  const status = await within(document.getElementById("tie-1")!).findByRole("status")
  expect(status).toHaveTextContent("copyTieLinkManually")
  expect(within(status).getByRole("link")).toHaveAttribute("href", `${window.location.origin}/ties/SEASON#tie-1`)
  expect(status).not.toHaveTextContent("tieLinkCopied")
})
