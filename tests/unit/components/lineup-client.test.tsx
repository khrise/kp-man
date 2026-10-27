import React from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { LineupClient } from "@/app/admin/ties/[tieId]/lineup/lineup-client"
import {
  loadMoreAuditEntriesAction,
  saveParticipationCaptainCommentAction,
  saveTieCaptainCommentAction,
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
  lineupPlayers: [], availablePlayers: [], otherParticipations: [], weekendConflictPlayerIds: [],
  playersWithoutParticipation: [],
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

  describe("weekend participation conflict warnings", () => {
    it("shows a warning on only the affected player's lineup-view card", () => {
      const affectedPlayer: Props["availablePlayers"][number] = {
        id: 4, tieId: 1, playerId: 2, status: "confirmed", isInLineup: false,
        comment: null, captainComment: null, captainCommentBy: null, captainCommentAuthor: null,
        respondedAt: date, createdAt: date, updatedAt: date,
        player: { id: 2, firstName: "Anna", lastName: "Player", playerRank: 2, createdAt: date, updatedAt: date },
      }
      const unaffectedPlayer: Props["availablePlayers"][number] = {
        ...affectedPlayer,
        id: 5,
        playerId: 3,
        player: { id: 3, firstName: "Bob", lastName: "Player", playerRank: 3, createdAt: date, updatedAt: date },
      }

      render(
        <LineupClient
          {...props}
          availablePlayers={[affectedPlayer, unaffectedPlayer]}
          weekendConflictPlayerIds={[2]}
        />,
      )

      const warning = screen.getByText("weekendConflict")
      expect(warning).toBeInTheDocument()
      expect(warning.closest("[title]")).toHaveAttribute("title", "weekendConflictHint")
      expect(screen.getAllByText("weekendConflict")).toHaveLength(1)
    })
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

  it("resets an existing RSVP through the no-response radio and saves the comment together", async () => {
    const saveComment = jest.mocked(saveParticipationCaptainCommentAction).mockReset().mockResolvedValue({ success: true })
    const participation: Props["availablePlayers"][number] = {
      id: 4, tieId: 1, playerId: 2, status: "confirmed", isInLineup: false,
      comment: "Player note", captainComment: "Old note", captainCommentBy: 8, captainCommentAuthor: "Captain",
      respondedAt: date, createdAt: date, updatedAt: date,
      player: { id: 2, firstName: "Anna", lastName: "Player", playerRank: 2, createdAt: date, updatedAt: date },
    }
    render(<LineupClient {...props} availablePlayers={[participation]} />)
    fireEvent.click(screen.getByRole("button", { name: "editRsvp" }))
    expect(screen.getByRole("heading", { name: /manageRsvp.*Anna Player/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("radio", { name: "noResponsePlayers" }))
    fireEvent.change(screen.getByRole("textbox", { name: "captainsComment" }), { target: { value: "New note" } })
    fireEvent.click(screen.getByRole("button", { name: "save" }))
    await waitFor(() => expect(saveComment).toHaveBeenCalledWith("1", "2", "New note", "no_response"))
    await waitFor(() => expect(screen.queryByRole("radio")).not.toBeInTheDocument())
  })

  it("keeps the form and draft visible after a failed save and discards it on Cancel", async () => {
    jest.mocked(saveParticipationCaptainCommentAction).mockReset().mockRejectedValue(new Error("Save failed"))
    render(<LineupClient {...props} playersWithoutParticipation={[{
      id: 9, playerId: 9, teamId: 1, firstName: "No", lastName: "Response",
      captainComment: null, captainCommentAuthor: null, createdAt: date, playerRank: 3,
    }]} />)
    fireEvent.click(screen.getByText("showSingleList"))
    fireEvent.click(screen.getByRole("button", { name: "editRsvp" }))
    fireEvent.change(screen.getByRole("textbox", { name: "captainsComment" }), { target: { value: "Draft" } })
    fireEvent.click(screen.getByRole("button", { name: "save" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Save failed")
    expect(screen.getByRole("textbox", { name: "captainsComment" })).toHaveValue("Draft")
    fireEvent.click(screen.getByRole("button", { name: "cancel" }))
    fireEvent.click(screen.getByRole("button", { name: "editRsvp" }))
    expect(screen.getByRole("textbox", { name: "captainsComment" })).toHaveValue("")
  })

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

    fireEvent.click(screen.getAllByRole("button", { name: "editRsvp" })[0])
    const radio = screen.getByRole("radio", { name: "maybe" })
    fireEvent.click(radio)
    const editor = screen.getByRole("textbox", { name: "captainsComment" })
    fireEvent.change(editor, { target: { value: "Draft" } })

    fireEvent.click(screen.getByRole("button", { name: /loadMoreAuditEntries/ }))
    await waitFor(() => expect(screen.queryByRole("button", { name: /loadMoreAuditEntries/ })).not.toBeInTheDocument())

    expect(screen.getByRole("radio", { name: "maybe" })).toBe(radio)
    expect(radio).toBeChecked()
    expect(screen.getByRole("textbox", { name: "captainsComment" })).toBe(editor)
    expect(editor).toHaveValue("Draft")
  })

  it("opens only one top-of-page form for a player appearing in both columns", () => {
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

    const buttons = screen.getAllByRole("button", { name: "editRsvp" })
    expect(buttons).toHaveLength(3)
    fireEvent.click(buttons[0])
    expect(screen.getAllByRole("radio")).toHaveLength(4)
    expect(screen.getAllByRole("textbox", { name: "captainsComment" })).toHaveLength(1)
    fireEvent.click(buttons[1])
    expect(screen.getAllByRole("radio")).toHaveLength(4)
    expect(screen.getByRole("radio", { name: "confirmed" })).toBeChecked()
    fireEvent.click(screen.getByRole("button", { name: "cancel" }))
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
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
    expect(screen.queryByRole("textbox", { name: "captainsComment" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "editRsvp" }))
    const editor = screen.getByRole("textbox", { name: "captainsComment" })
    expect(editor.tagName).toBe("INPUT")
    expect(screen.getByRole("radio", { name: "noResponsePlayers" })).toBeChecked()
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled()
    fireEvent.change(editor, { target: { value: "Will speak to the player tomorrow" } })
    expect(screen.getAllByRole("button", { name: "save" })).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "save" }))

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
    fireEvent.click(screen.getByRole("button", { name: "editRsvp" }))
    expect(screen.getByRole("radio", { name: "noResponsePlayers" })).toBeChecked()
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled()
    fireEvent.click(screen.getByRole("radio", { name: "confirmed" }))
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

    fireEvent.click(screen.getByRole("button", { name: "editRsvp" }))
    screen.getAllByRole("radio").forEach((radio) => expect(radio).toBeDisabled())
    expect(screen.getByRole("textbox", { name: "captainsComment" })).not.toBeDisabled()
  })
})

describe("tie captain comment", () => {
  it("displays the comment beneath the headline and only opens a single-line input on request", async () => {
    const save = jest.mocked(saveTieCaptainCommentAction).mockResolvedValue({ success: true })
    render(<LineupClient {...props} tie={{ ...props.tie, captainComment: "Bring balls", captainCommentAuthor: "Captain" }} />)
    const heading = screen.getByRole("heading", { name: "manageLineup" })
    expect(heading.parentElement?.parentElement).toContainElement(screen.getByText("Bring balls"))
    expect(screen.getByText("commentBy Captain")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "captainsComment" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "editTieCaptainComment" }))
    const input = screen.getByRole("textbox", { name: "captainsComment" })
    expect(input.tagName).toBe("INPUT")
    fireEvent.change(input, { target: { value: "Draft" } })
    fireEvent.click(screen.getByRole("button", { name: "cancel" }))
    expect(save).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "editTieCaptainComment" }))
    expect(screen.getByRole("textbox", { name: "captainsComment" })).toHaveValue("Bring balls")
    fireEvent.change(screen.getByRole("textbox", { name: "captainsComment" }), { target: { value: "Bring rackets" } })
    fireEvent.click(screen.getByRole("button", { name: "save" }))
    await waitFor(() => expect(save).toHaveBeenCalledWith("1", "Bring rackets"))
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "captainsComment" })).not.toBeInTheDocument())
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

  it("switches between player groups and newest-first entries with all change details", () => {
    const newest = {
      ...entry, id: 8, playerId: 2, playerFirstName: "Ben", playerLastName: "Jones",
      changedBy: "Captain Ben", createdAt: "2026-06-02T14:00:00Z",
      previousStatus: "confirmed", newStatus: "declined",
      previousIsInLineup: true, newIsInLineup: false,
      previousComment: null, newComment: "Player note",
      previousCaptainComment: "Old note", newCaptainComment: "New note",
    }
    render(<LineupClient {...props} auditEntries={[
      { ...entry, changedBy: "Captain Anna", previousStatus: "maybe", newStatus: "confirmed" },
      newest,
      { ...entry, id: 7, playerId: 3, playerFirstName: "Chris", playerLastName: "Smith",
        changedBy: "Captain Chris", createdAt: newest.createdAt },
    ]} />)

    expect(screen.getAllByText(/participationChanges/)).toHaveLength(3)
    fireEvent.click(screen.getByRole("button", { name: "showChronologicalAudit" }))
    const list = screen.getByRole("list", { name: "chronologicalAudit" })
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(3)
    const first = within(items[0])
    expect(first.getByText("Ben Jones")).toBeInTheDocument()
    expect(first.getByText("Captain Ben")).toBeInTheDocument()
    expect(items[0].querySelector("time")).toHaveAttribute("datetime", newest.createdAt)
    expect(first.getByText(new Date(newest.createdAt).toLocaleString())).toBeInTheDocument()
    expect(first.getByText("statusLabel:")).toBeInTheDocument()
    expect(first.getByText("lineupLabel:")).toBeInTheDocument()
    expect(first.getByText('emptyComment → "Player note"')).toBeInTheDocument()
    expect(first.getByText('"Old note" → "New note"')).toBeInTheDocument()
    expect(within(items[1]).getByText("Chris Smith")).toBeInTheDocument()
    expect(within(items[2]).getByText("Anna Smith")).toBeInTheDocument()
    expect(screen.queryByText(/participationChanges/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "showAuditByPlayer" }))
    expect(screen.queryByRole("list", { name: "chronologicalAudit" })).not.toBeInTheDocument()
    expect(screen.getAllByText(/participationChanges/)).toHaveLength(3)
  })

  it("retains loaded entries across view switches and paginates the chronological view", async () => {
    loadMore.mockResolvedValueOnce({ entries: [older(5, 2, "Older")], hasMore: false })
    render(<LineupClient {...props} auditEntries={[{ ...entry, id: 10 }]} auditHasMore />)
    fireEvent.click(screen.getByRole("button", { name: "showChronologicalAudit" }))
    fireEvent.click(screen.getByText(linkText))
    expect(await screen.findByText("Anna Older")).toBeInTheDocument()
    expect(loadMore).toHaveBeenCalledWith("1", 1)
    expect(within(screen.getByRole("list", { name: "chronologicalAudit" })).getAllByRole("listitem")).toHaveLength(2)
    fireEvent.click(screen.getByRole("button", { name: "showAuditByPlayer" }))
    expect(screen.getByText("Anna Older")).toBeInTheDocument()
    expect(screen.queryByText(linkText)).not.toBeInTheDocument()
  })

  it("keeps the empty state when switching to chronological view", () => {
    render(<LineupClient {...props} auditEntries={[]} />)
    fireEvent.click(screen.getByRole("button", { name: "showChronologicalAudit" }))
    expect(screen.getByText("No audit entries")).toBeInTheDocument()
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument()
  })

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
