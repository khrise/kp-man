import React from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { LineupClient } from "@/app/admin/ties/[tieId]/lineup/lineup-client"
import {
  loadMoreAuditEntriesAction,
  saveParticipationCaptainCommentAction,
  setManagedParticipationStatusAction,
} from "@/app/actions/lineup"

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock("@/app/actions/lineup", () => ({
  toggleLineupAction: jest.fn(),
  markTieReadyAction: jest.fn(),
  loadMoreAuditEntriesAction: jest.fn(),
  saveParticipationCaptainCommentAction: jest.fn(),
  saveTieCaptainCommentAction: jest.fn(),
  setManagedParticipationStatusAction: jest.fn(),
}))
jest.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    tWithParams: (key: string, params: Record<string, unknown>) => `${key}:${JSON.stringify(params)}`,
  }),
}))

type Props = React.ComponentProps<typeof LineupClient>
type AuditEntry = NonNullable<Props["auditEntries"]>[number]
type ServerAuditEntry = Awaited<ReturnType<typeof loadMoreAuditEntriesAction>>["entries"][number]

const date = new Date("2026-06-01T12:00:00Z")
const props: Props = {
  tie: {
    id: 1, teamId: 1, opponent: "Rivals", tieDate: date, location: null,
    isHome: true, isLineupReady: false, notes: null, captainComment: null, captainCommentBy: null,
    captainCommentAuthor: null, createdAt: date, updatedAt: date,
  },
  team: { id: 1, seasonId: 1, name: "Team", league: null, teamSize: 6, createdAt: date, updatedAt: date },
  lineupPlayers: [], availablePlayers: [], otherParticipations: [], playersWithoutParticipation: [],
  lineupCount: 0, teamSize: 6,
}

const entry: AuditEntry = {
  id: 1, participationId: 1, playerId: 1, tieId: 1,
  previousStatus: null, newStatus: null, previousComment: null, newComment: null,
  previousCaptainComment: null, newCaptainComment: null,
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

  it("shows combined status and captain comment changes in one entry", () => {
    const audit = renderAudit({
      previousStatus: "maybe", newStatus: "confirmed",
      previousCaptainComment: "Old note", newCaptainComment: "New note",
    })
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
    expect(audit.getByText("statusLabel:")).toBeInTheDocument()
    expect(audit.getByText("captainsComment:")).toBeInTheDocument()
    expect(audit.queryByText("lineupLabel:")).not.toBeInTheDocument()
  })

  it("does not show a lineup change for historical no-response to confirmed entries", () => {
    const audit = renderAudit({
      previousStatus: null, newStatus: "confirmed",
      previousIsInLineup: null, newIsInLineup: false,
    })
    expect(audit.getByText("statusLabel:")).toBeInTheDocument()
    expect(audit.queryByText("lineupLabel:")).not.toBeInTheDocument()
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
  it.each([
    { previousComment: null, newComment: "New note" },
    { previousComment: "", newComment: "New note" },
    { previousCaptainComment: null, newCaptainComment: "New note" },
    { previousCaptainComment: "", newCaptainComment: "New note" },
  ])("labels empty previous comments instead of displaying empty quotes: %o", (changes) => {
    const audit = renderAudit(changes)
    expect(audit.getByText('emptyComment → "New note"')).toBeInTheDocument()
  })

  it.each([
    { previousComment: "Old note", newComment: null },
    { previousComment: "Old note", newComment: "" },
    { previousCaptainComment: "Old note", newCaptainComment: null },
    { previousCaptainComment: "Old note", newCaptainComment: "" },
  ])("labels cleared comments instead of displaying empty quotes: %o", (changes) => {
    const audit = renderAudit(changes)
    expect(audit.getByText('"Old note" → emptyComment')).toBeInTheDocument()
  })
})

describe("player RSVP comments", () => {
  it.each([
    { status: "confirmed" as const, isInLineup: true },
    { status: "confirmed" as const, isInLineup: false },
    { status: "maybe" as const, isInLineup: false },
    { status: "declined" as const, isInLineup: false },
  ])("shows player comments in both layouts for %o, including finalized ties", ({ status, isInLineup }) => {
    const participation: Props["lineupPlayers"][number] = {
      id: 4, tieId: 1, playerId: 2, status, isInLineup,
      comment: "I can arrive at 14:00.\nPlease arrange transport.",
      captainComment: "Plays doubles only", captainCommentBy: 8, captainCommentAuthor: "Captain",
      respondedAt: date, createdAt: date, updatedAt: date,
      player: { id: 2, firstName: "Anna", lastName: "Player", playerRank: 2, createdAt: date, updatedAt: date },
    }
    render(<LineupClient
      {...props}
      tie={{ ...props.tie, isLineupReady: true }}
      lineupPlayers={isInLineup ? [participation] : []}
      availablePlayers={!isInLineup && status === "confirmed" ? [participation] : []}
      otherParticipations={status !== "confirmed" ? [participation] : []}
      lineupCount={isInLineup ? 1 : 0}
      playersWithoutParticipation={[{
        id: 9, playerId: 9, teamId: 1, firstName: "No", lastName: "Response",
        captainComment: null, captainCommentAuthor: null,
        createdAt: date, playerRank: 3,
      }]}
    />)

    expect(screen.getByText("participationComment")).toBeInTheDocument()
    expect(screen.getByText(/I can arrive at 14:00/)).toHaveClass("whitespace-pre-wrap", "break-words")
    expect(screen.getByText("Plays doubles only")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "captainsComment" })).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue("I can arrive at 14:00.\nPlease arrange transport.")).not.toBeInTheDocument()

    fireEvent.click(screen.getByText("showSingleList"))
    expect(screen.getAllByText(/I can arrive at 14:00/).length).toBeGreaterThan(0)
  })

  it.each([null, ""])("omits the player comment section when the comment is %p", (comment) => {
    const participation: Props["availablePlayers"][number] = {
      id: 4, tieId: 1, playerId: 2, status: "confirmed", isInLineup: false, comment,
      captainComment: null, captainCommentBy: null, captainCommentAuthor: null,
      respondedAt: date, createdAt: date, updatedAt: date,
      player: { id: 2, firstName: "Anna", lastName: "Player", playerRank: 2, createdAt: date, updatedAt: date },
    }
    render(<LineupClient {...props} availablePlayers={[participation]} />)

    expect(screen.queryByText("participationComment")).not.toBeInTheDocument()
  })
})

describe("captain RSVP controls", () => {
  const saveStatus = setManagedParticipationStatusAction as jest.MockedFunction<typeof setManagedParticipationStatusAction>

  beforeEach(() => saveStatus.mockReset())

  it.each([false, true])("preserves both player editor drafts while audit entries load in single-list mode: %p", async (singleList) => {
    jest.mocked(loadMoreAuditEntriesAction).mockResolvedValue({ entries: [], hasMore: false })
    const participation: Props["availablePlayers"][number] = {
      id: 4, tieId: 1, playerId: 2, status: "confirmed", isInLineup: false,
      comment: null, captainComment: null, captainCommentBy: null, captainCommentAuthor: null,
      respondedAt: date, createdAt: date, updatedAt: date,
      player: { id: 2, firstName: "Anna", lastName: "Player", playerRank: 2, createdAt: date, updatedAt: date },
    }
    render(<LineupClient
      {...props}
      availablePlayers={[participation]}
      playersWithoutParticipation={[{
        id: 9, playerId: 9, teamId: 1, firstName: "No", lastName: "Response",
        captainComment: null, captainCommentAuthor: null, createdAt: date, playerRank: 3,
      }]}
      auditEntries={[entry]}
      auditHasMore
    />)
    if (singleList) fireEvent.click(screen.getByText("showSingleList"))
    else fireEvent.click(screen.getByRole("button", { name: /playersWithoutResponse/ }))

    const selectors = screen.getAllByRole("combobox", { name: "manageRsvp" })
    selectors.forEach((selector) => fireEvent.change(selector, { target: { value: "maybe" } }))
    screen.getAllByRole("button", { name: "captainsComment" }).forEach((toggle) => fireEvent.click(toggle))
    const editors = screen.getAllByRole("textbox", { name: "captainsComment" })
    editors.forEach((editor, index) => fireEvent.change(editor, { target: { value: `Draft ${index}` } }))

    fireEvent.click(screen.getByRole("button", { name: /loadMoreAuditEntries/ }))
    await waitFor(() => expect(screen.queryByRole("button", { name: /loadMoreAuditEntries/ })).not.toBeInTheDocument())

    selectors.forEach((selector, index) => {
      expect(screen.getAllByRole("combobox", { name: "manageRsvp" })[index]).toBe(selector)
      expect(selector).toHaveValue("maybe")
      expect(screen.getAllByRole("textbox", { name: "captainsComment" })[index]).toBe(editors[index])
      expect(editors[index]).toHaveValue(`Draft ${index}`)
      expect(screen.getAllByRole("button", { name: "captainsComment" })[index]).toHaveAttribute("aria-expanded", "true")
    })
  })

  it("uses unique label and comment-panel associations for duplicate player editors", () => {
    const participation: Props["lineupPlayers"][number] = {
      id: 4, tieId: 1, playerId: 2, status: "confirmed", isInLineup: true,
      comment: null, captainComment: null, captainCommentBy: null, captainCommentAuthor: null,
      respondedAt: date, createdAt: date, updatedAt: date,
      player: { id: 2, firstName: "Anna", lastName: "Player", playerRank: 2, createdAt: date, updatedAt: date },
    }
    render(<LineupClient
      {...props}
      lineupPlayers={[participation]}
      lineupCount={1}
      playersWithoutParticipation={[{
        id: 9, playerId: 9, teamId: 1, firstName: "No", lastName: "Response",
        captainComment: null, captainCommentAuthor: null, createdAt: date, playerRank: 3,
      }]}
    />)
    fireEvent.click(screen.getByText("showSingleList"))

    const selectors = screen.getAllByRole("combobox", { name: "manageRsvp" })
    const toggles = screen.getAllByRole("button", { name: "captainsComment" })
    expect(selectors).toHaveLength(3)
    expect(toggles).toHaveLength(3)
    expect(new Set(selectors.map((selector) => selector.id)).size).toBe(3)
    expect(new Set(toggles.map((toggle) => toggle.getAttribute("aria-controls"))).size).toBe(3)

    selectors.forEach((selector, index) => {
      const label = screen.getAllByText("manageRsvp")[index]
      expect(label).toHaveAttribute("for", selector.id)
      expect(document.getElementById(label.getAttribute("for")!)).toBe(selector)

      const toggle = toggles[index]
      fireEvent.click(toggle)
      const panelId = toggle.getAttribute("aria-controls")
      expect(panelId).not.toBeNull()
      const panel = document.getElementById(panelId!)
      expect(panel).not.toBeNull()
      expect(toggle.parentElement?.parentElement).toContainElement(panel)
      expect(within(panel!).getByRole("textbox", { name: "captainsComment" })).toBeInTheDocument()
    })
  })

  it.each([false, true])("saves comments without creating an RSVP in single-list layout: %p", async (singleList) => {
    const saveComment = jest.mocked(saveParticipationCaptainCommentAction)
    saveComment.mockReset().mockResolvedValue({ success: true })
    render(<LineupClient
      {...props}
      playersWithoutParticipation={[{
        id: 9, playerId: 9, teamId: 1, firstName: "No", lastName: "Response",
        captainComment: null, captainCommentAuthor: null, createdAt: date, playerRank: 3,
      }]}
    />)
    if (singleList) {
      fireEvent.click(screen.getByText("showSingleList"))
    } else {
      fireEvent.click(screen.getByText(/playersWithoutResponse/))
    }
    const toggle = screen.getByRole("button", { name: "captainsComment" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("textbox", { name: "captainsComment" })).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    const editor = screen.getByRole("textbox", { name: "captainsComment" })
    expect(editor).toHaveClass("text-xs", "md:text-xs")
    expect(screen.getByLabelText("manageRsvp")).toHaveValue("")
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled()
    fireEvent.change(editor, { target: { value: "Will speak to the player tomorrow" } })
    const card = editor.parentElement?.parentElement
    if (!card) throw new Error("Missing comment editor container")
    expect(within(card).getAllByRole("button", { name: "save" })).toHaveLength(1)
    fireEvent.click(toggle)
    expect(screen.queryByRole("textbox", { name: "captainsComment" })).not.toBeInTheDocument()
    expect(screen.getByText("Will speak to the player tomorrow")).toBeInTheDocument()
    fireEvent.click(within(card).getByRole("button", { name: "save" }))

    await waitFor(() => expect(saveComment).toHaveBeenCalledWith("1", "9", "Will speak to the player tomorrow", null))
    expect(saveStatus).not.toHaveBeenCalled()
  })

  it("saves an RSVP and captain comment together for a player with no response", async () => {
    const saveComment = jest.mocked(saveParticipationCaptainCommentAction)
    saveComment.mockReset().mockResolvedValue({ success: true })
    render(<LineupClient
      {...props}
      playersWithoutParticipation={[{
        id: 9, playerId: 9, teamId: 1, firstName: "No", lastName: "Response",
        captainComment: null, captainCommentAuthor: null,
        createdAt: date, playerRank: 3,
      }]}
    />)

    fireEvent.click(screen.getByText("showSingleList"))
    const selector = screen.getByLabelText("manageRsvp")
    expect(selector).toHaveDisplayValue("noResponsePlayers")
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled()
    fireEvent.change(selector, { target: { value: "confirmed" } })
    fireEvent.click(screen.getByRole("button", { name: "captainsComment" }))
    fireEvent.change(screen.getByRole("textbox", { name: "captainsComment" }), { target: { value: "Doubles only" } })
    fireEvent.click(screen.getByRole("button", { name: "save" }))

    await waitFor(() => expect(saveComment).toHaveBeenCalledWith("1", "9", "Doubles only", "confirmed"))
    expect(saveStatus).not.toHaveBeenCalled()
  })

  it("locks RSVP status controls while the lineup is finalized", () => {
    const participation = {
      id: 4, tieId: 1, playerId: 2, status: "maybe" as const, comment: null,
      captainComment: null, captainCommentBy: null, captainCommentAuthor: null,
      isInLineup: false, respondedAt: date, createdAt: date, updatedAt: date,
      player: { id: 2, firstName: "Maybe", lastName: "Player", playerRank: 2, createdAt: date, updatedAt: date },
    }
    render(<LineupClient
      {...props}
      tie={{ ...props.tie, isLineupReady: true }}
      otherParticipations={[participation]}
    />)

    expect(screen.getByLabelText("manageRsvp")).toBeDisabled()
  })
})

describe("lineup audit pagination", () => {
  const loadMore = loadMoreAuditEntriesAction as jest.MockedFunction<typeof loadMoreAuditEntriesAction>
  const linkText = 'loadMoreAuditEntries:{"count":100}'
  const older = (id: number, playerId: number, lastName: string): ServerAuditEntry => ({
    ...entry, id, playerId, playerFirstName: "Anna", playerLastName: lastName,
    previousStatus: "confirmed", newStatus: "declined",
  })

  beforeEach(() => loadMore.mockReset())

  it("hides the load-more link when there are no older entries", () => {
    render(<LineupClient {...props} auditEntries={[entry]} auditHasMore={false} auditPageSize={100} />)
    expect(screen.queryByText(linkText)).not.toBeInTheDocument()
  })

  it("loads older entries by offset and appends them", async () => {
    loadMore.mockResolvedValueOnce({ entries: [older(5, 2, "Older")], hasMore: true })
    loadMore.mockResolvedValueOnce({ entries: [older(3, 3, "Oldest")], hasMore: false })
    render(<LineupClient {...props} auditEntries={[{ ...entry, id: 10 }]} auditHasMore auditPageSize={100} />)

    fireEvent.click(screen.getByText(linkText))
    expect(await screen.findByText("Anna Older")).toBeInTheDocument()
    expect(loadMore).toHaveBeenLastCalledWith("1", 1)

    fireEvent.click(screen.getByText(linkText))
    expect(await screen.findByText("Anna Oldest")).toBeInTheDocument()
    expect(loadMore).toHaveBeenLastCalledWith("1", 2)
    await waitFor(() => expect(screen.queryByText(linkText)).not.toBeInTheDocument())
    expect(screen.getByText("Anna Smith")).toBeInTheDocument()
  })

  it("shows an error when loading fails", async () => {
    loadMore.mockRejectedValueOnce(new Error("boom"))
    render(<LineupClient {...props} auditEntries={[entry]} auditHasMore auditPageSize={100} />)
    fireEvent.click(screen.getByText(linkText))
    expect(await screen.findByText("boom")).toBeInTheDocument()
  })
})
