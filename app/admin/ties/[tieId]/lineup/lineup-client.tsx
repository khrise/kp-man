"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Users, UserCheck, UserX, Clock, HelpCircle, Mail, Copy } from "lucide-react"
import { toggleLineupAction, markTieReadyAction, loadMoreAuditEntriesAction } from "@/app/actions/lineup"
import { useTranslation } from "@/lib/i18n"
import { Tie, Team, Participation, PlayerWithRank } from "@/lib/types"
import type { TeamPlayerWithDetails } from "@/lib/db"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

type TieWithDetails = Tie & {
  opponent: string
  tieDate: Date
}

type ParticipationWithPlayer = Participation & {
  player: PlayerWithRank
}

type LineupClientProps = {
  tie: TieWithDetails
  team: Omit<Team, "playerIds">
  lineupPlayers: ParticipationWithPlayer[]
  availablePlayers: ParticipationWithPlayer[]
  otherParticipations: ParticipationWithPlayer[]
  playersWithoutParticipation: TeamPlayerWithDetails[]
  lineupCount: number
  maxPlayers: number
  auditEntries?: AuditEntry[]
  auditHasMore?: boolean
  auditPageSize?: number
}
 
type AuditEntry = {
  id: number
  participationId: number | null
  playerId: number
  tieId: number
  previousStatus: string | null
  newStatus: string | null
  previousComment: string | null
  newComment: string | null
  previousIsInLineup: boolean | null
  newIsInLineup: boolean | null
  changedBy: string | null
  createdAt: string
  playerFirstName?: string | null
  playerLastName?: string | null
}

export function LineupClient({
  tie,
  team,
  lineupPlayers,
  availablePlayers,
  otherParticipations,
  playersWithoutParticipation,
  lineupCount,
  maxPlayers,
  auditEntries,
  auditHasMore = false,
  auditPageSize = 100,
}: LineupClientProps) {
  const { t, tWithParams } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [separateOthers, setSeparateOthers] = useState(true)
  const [isNoResponseOpen, setIsNoResponseOpen] = useState(false)
  const [isTogglingReady, setIsTogglingReady] = useState(false)
  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<"idle" | "copied">("idle")
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [olderAuditEntries, setOlderAuditEntries] = useState<AuditEntry[]>([])
  const [olderAuditHasMore, setOlderAuditHasMore] = useState<boolean | null>(null)
  const [isLoadingMoreAudit, setIsLoadingMoreAudit] = useState(false)
  const [auditLoadError, setAuditLoadError] = useState<string | null>(null)

  // New entries since the first page can shift offsets, so skip ids already shown.
  const allAuditEntries = useMemo(() => {
    const firstPage = auditEntries ?? []
    const shownIds = new Set(firstPage.map((e) => e.id))
    return [...firstPage, ...olderAuditEntries.filter((e) => !shownIds.has(e.id))]
  }, [auditEntries, olderAuditEntries])

  const hasMoreAudit = olderAuditHasMore ?? auditHasMore

  const handleLoadMoreAudit = async () => {
    if (isLoadingMoreAudit) return

    setIsLoadingMoreAudit(true)
    setAuditLoadError(null)
    try {
      const offset = (auditEntries?.length ?? 0) + olderAuditEntries.length
      const result = await loadMoreAuditEntriesAction(String(tie.id), offset)
      setOlderAuditEntries((prev) => [...prev, ...result.entries])
      setOlderAuditHasMore(result.hasMore)
    } catch (error) {
      setAuditLoadError((error as Error)?.message ?? t("loadMoreAuditEntriesFailed"))
    } finally {
      setIsLoadingMoreAudit(false)
    }
  }

  const tieDate = useMemo(() => {
    const parsed = tie.tieDate instanceof Date ? tie.tieDate : new Date(tie.tieDate)
    return Number.isNaN(parsed.getTime()) ? new Date(NaN) : parsed
  }, [tie.tieDate])

  const invitationEmailContent = useMemo(() => {
    if (Number.isNaN(tieDate.getTime()) || lineupPlayers.length === 0) {
      return ""
    }

    const sortedPlayers = [...lineupPlayers].sort((a, b) => a.player.playerRank - b.player.playerRank)
    const playerNames = sortedPlayers
      .map((participation) => {
        const nameParts = [participation.player.firstName, participation.player.lastName].filter(Boolean)
        return nameParts.join(" ").trim()
      })
      .join(", ")

    const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(tieDate).replace(".", "")
    const dateText = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "numeric", year: "numeric" }).format(
      tieDate,
    )
    const timeText = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
    }).format(tieDate)

    const meetingTime = new Date(tieDate.getTime() - 15 * 60 * 1000)
    const meetingTimeText = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
    }).format(meetingTime)

    const location = tie.location?.trim() ? tie.location.trim() : "Ort wird noch bestätigt"
    const homeAwayText = tie.isHome ? "Heimspiel" : "Auswärtsspiel"

    return `${team.name} vs. ${tie.opponent}
${homeAwayText}
${weekday}, ${dateText} · ${timeText} Uhr · ${location} (Treff ${meetingTimeText} Uhr vor Ort)
Aufstellung: ${playerNames}`
  }, [lineupPlayers, team.name, tie.location, tie.isHome, tie.opponent, tieDate])

  const handleCopyInvitation = async () => {
    if (!invitationEmailContent) return

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(invitationEmailContent)
      } else {
        throw new Error("Clipboard API unavailable")
      }
    } catch (error) {
      console.warn("Clipboard API failed, attempting fallback", error)
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.select()
        document.execCommand("copy")
      }
    } finally {
      setCopyFeedback("copied")
      setTimeout(() => setCopyFeedback("idle"), 2000)
    }
  }

  // Check for problematic lineup situations
  const problematicPlayers = lineupPlayers.filter(p => p.status !== "confirmed")
  const hasProblematicPlayers = problematicPlayers.length > 0

  // Group audit entries by player for display
  const groupedAudit = useMemo(() => {
    if (allAuditEntries.length === 0) return [] as Array<{
      playerId: number
      playerFirstName?: string | null
      playerLastName?: string | null
      entries: AuditEntry[]
    }>

    const map = new Map<number, AuditEntry[]>()
    for (const e of allAuditEntries) {
      const list = map.get(e.playerId) ?? []
      list.push(e)
      map.set(e.playerId, list)
    }

    return Array.from(map.entries()).map(([playerId, entries]) => ({
      playerId,
      playerFirstName: entries[0]?.playerFirstName ?? null,
      playerLastName: entries[0]?.playerLastName ?? null,
      entries: entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }))
  }, [allAuditEntries])

  const handleToggleLineup = async (participationId: number, isCurrentlyInLineup: boolean) => {
    if (isLoading) return
    
    // Check if we're trying to add a player but already at max capacity
    if (!isCurrentlyInLineup && lineupCount >= maxPlayers) {
      alert(t("maxPlayersReached"))
      return
    }

    setIsLoading(true)
    try {
      await toggleLineupAction(String(participationId), String(tie.id))
      router.refresh()
    } catch (error) {
      console.error("Failed to toggle lineup:", error)
      alert(error instanceof Error ? error.message : t("onlyConfirmedPlayers"))
    } finally {
      setIsLoading(false)
    }
  }

  const PlayerCard = ({ participation, isInLineup, canToggle }: { 
    participation: ParticipationWithPlayer, 
    isInLineup: boolean,
    canToggle: boolean
  }) => {
    // Check if this is a problematic lineup situation
    const isProblematic = isInLineup && participation.status !== "confirmed"
    
    return (
      <Card className={`${isInLineup ? 'ring-2 ring-blue-500 bg-blue-50' : ''} ${isProblematic ? 'ring-red-500 bg-red-50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-2">
                #{participation.player.playerRank} {participation.player.firstName} {participation.player.lastName}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={
                  participation.status === "confirmed" ? "default" : 
                  participation.status === "maybe" ? "secondary" : "destructive"
                }>
                  {participation.status === "confirmed" && <UserCheck className="w-3 h-3 mr-1" />}
                  {participation.status === "maybe" && <Clock className="w-3 h-3 mr-1" />}
                  {participation.status === "declined" && <UserX className="w-3 h-3 mr-1" />}
                  {t(participation.status)}
                </Badge>
                {isInLineup && (
                  <Badge variant="outline" className="bg-blue-100">
                    {t("inLineup")}
                  </Badge>
                )}
                {isProblematic && (
                  <Badge variant="destructive" className="bg-red-500 text-white">
                    ⚠️ {t("needsAttention")}
                  </Badge>
                )}
              </div>
            </div>
            
            {canToggle && (
              <Button
                size="sm"
                variant={isInLineup ? "outline" : "default"}
                onClick={() => handleToggleLineup(participation.id, isInLineup)}
                disabled={isLoading || tie.isLineupReady || (!isInLineup && lineupCount >= maxPlayers)}
                className="w-full sm:w-auto mt-2 sm:mt-0"
              >
                {isInLineup ? t("remove") : t("add")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const NoResponsePlayerCard = ({ player }: { player: TeamPlayerWithDetails }) => {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <h3 className="font-semibold text-sm">
                  #{player.playerRank} {player.firstName} {player.lastName}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="bg-gray-100 text-gray-600">
                    <HelpCircle className="w-3 h-3 mr-1" />
                    {t("noResponsePlayers")}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const maybeParticipations = otherParticipations.filter((p) => p.status === "maybe")
  const declinedParticipations = otherParticipations.filter((p) => p.status !== "maybe")
  const availableListItems: Array<
    | { rank: number; kind: "participation"; participation: ParticipationWithPlayer; inLineup: boolean }
    | { rank: number; kind: "noResponse"; player: TeamPlayerWithDetails }
  > = [
    ...(separateOthers ? availablePlayers : [...lineupPlayers, ...availablePlayers, ...otherParticipations]).map(
      (participation) => ({
        rank: participation.player.playerRank,
        kind: "participation" as const,
        participation,
        inLineup: lineupPlayers.some((p) => p.id === participation.id),
      })
    ),
    ...(separateOthers ? [] : playersWithoutParticipation).map(
      (player) => ({ rank: player.playerRank, kind: "noResponse" as const, player })
    ),
  ]
  const otherSections = (
    separateOthers
      ? [
          { key: "maybe", title: t("maybe"), icon: <HelpCircle className="w-5 h-5 text-yellow-600" />, items: maybeParticipations },
          { key: "declined", title: t("declined"), icon: <UserX className="w-5 h-5 text-red-600" />, items: declinedParticipations },
        ]
      : []
  ).filter((section) => section.items.length > 0)

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {(otherParticipations.length > 0 || playersWithoutParticipation.length > 0) && (
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSeparateOthers((v) => !v)}
          >
            {separateOthers ? t("showSingleList") : t("showSeparateLists")}
          </Button>
        </div>
      )}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {t("manageLineup")}
              </h1>
              {tie.isLineupReady && (
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {t("lineupComplete")}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-gray-600">
              {team.name} {t("vs")} {tie.opponent}
            </p>
            <p className="text-sm text-gray-500">
              {Number.isNaN(tieDate.getTime())
                ? "—"
                : `${tieDate.toLocaleDateString()} ${tieDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </p>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span className="text-lg font-semibold">
                {lineupCount}/{maxPlayers}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              {tie.isLineupReady ? (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      setCopyFeedback("idle")
                      setIsInvitationDialogOpen(true)
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {t("sendInvitations")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (isTogglingReady) return
                      if (!confirm(t("confirmUnmarkLineup") || "Remove finalization?")) return
                      setIsTogglingReady(true)
                      try {
                        await markTieReadyAction(String(tie.id), false)
                        router.refresh()
                      } catch (err) {
                        console.error("Failed to unmark ready:", err)
                        alert(err instanceof Error ? err.message : String(err))
                      } finally {
                        setIsTogglingReady(false)
                      }
                    }}
                    disabled={isTogglingReady}
                  >
                    {t("unmarkLineupReady")}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  onClick={async () => {
                    if (isTogglingReady) return
                    if (lineupCount < maxPlayers) {
                      alert(t("lineupIncomplete"))
                      return
                    }
                    setIsTogglingReady(true)
                    try {
                      await markTieReadyAction(String(tie.id), true)
                      router.refresh()
                    } catch (err) {
                      console.error("Failed to mark ready:", err)
                      alert(err instanceof Error ? err.message : String(err))
                    } finally {
                      setIsTogglingReady(false)
                    }
                  }}
                  disabled={isTogglingReady || lineupCount < maxPlayers}
                >
                  {t("markLineupReady")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warning banner for problematic players */}
      {hasProblematicPlayers && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <UserX className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                ⚠️ {t("lineupIssuesDetected")}
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {problematicPlayers.length === 1 
                  ? t("onePlayerInLineupChanged") 
                  : `${problematicPlayers.length} ${t("playersInLineupChanged")}`}
              </p>
              <ul className="mt-2 text-sm text-red-700">
                {problematicPlayers.map(p => (
                  <li key={p.id}>
                    • #{p.player.playerRank} {p.player.firstName} {p.player.lastName} ({t(p.status)})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Selected Players */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <span>{t("lineupPlayers")} ({lineupCount})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineupPlayers.length > 0 ? (
                lineupPlayers
                  .sort((a, b) => a.player.playerRank - b.player.playerRank)
                  .map((participation, index) => (
                    <div key={participation.id} className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                        {index + 1}
                      </div>
                      <PlayerCard 
                        participation={participation} 
                        isInLineup={true}
                        canToggle={!tie.isLineupReady}
                      />
                    </div>
                  ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  {t("noPlayersAdded")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available Players */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-600" />
                <span>{separateOthers ? t("availablePlayers") : t("allPlayers")} ({availableListItems.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableListItems.length > 0 ? (
                [...availableListItems]
                  .sort((a, b) => a.rank - b.rank)
                  .map((item) =>
                    item.kind === "noResponse" ? (
                      <NoResponsePlayerCard key={`nr-${item.player.id}`} player={item.player} />
                    ) : (
                      <PlayerCard
                        key={item.participation.id}
                        participation={item.participation}
                        isInLineup={item.inLineup}
                        canToggle={!item.inLineup && !tie.isLineupReady && item.participation.status === "confirmed"}
                      />
                    )
                  )
              ) : (
                <p className="text-gray-500 text-center py-8">
                  {t("noPlayersAvailable")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Other Participations (Maybe/Declined) */}
          {otherSections.map((section) => (
            <Card key={section.key} className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {section.icon}
                  <span>{section.title} ({section.items.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...section.items]
                  .sort((a, b) => a.player.playerRank - b.player.playerRank)
                  .map((participation) => (
                    <PlayerCard 
                      key={participation.id}
                      participation={participation} 
                      isInLineup={false}
                      canToggle={false}
                    />
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Players Without Response - Full Width Section */}
      {separateOthers && playersWithoutParticipation.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardContent className="p-0">
              <AccordionItem
                value="no-response"
                open={isNoResponseOpen}
                onOpenChange={setIsNoResponseOpen}
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold">
                      {t("playersWithoutResponse")} ({playersWithoutParticipation.length})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6" maxHeight="max-h-none">
                  <div className="grid gap-3 md:grid-cols-2">
                    {playersWithoutParticipation
                      .sort((a, b) => a.playerRank - b.playerRank)
                      .map((player) => (
                        <NoResponsePlayerCard key={player.id} player={player} />
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </CardContent>
          </Card>
        </div>
      )}

      {/* RSVP Audit Log */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-gray-600" />
              <span>RSVP Audit</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {groupedAudit.length === 0 && (
                <p className="text-sm text-gray-500">No audit entries</p>
              )}

              {groupedAudit.length > 0 && (
                <div className="space-y-4">
                  {groupedAudit.map((group) => (
                    <div key={group.playerId} className="bg-gray-50 border border-gray-100 rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{group.playerFirstName} {group.playerLastName}</div>
                        <div className="text-xs text-gray-500">{group.entries.length} {t("participationResponses")}</div>
                      </div>

                      <ul className="space-y-2">
                        {group.entries.map((e) => (
                          <li key={e.id} className="text-sm text-gray-700 bg-white border border-gray-100 rounded p-3">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <div className="min-w-0 text-left">{e.changedBy ?? ""}</div>
                              <div className="ml-4 text-right">{new Date(e.createdAt).toLocaleString()}</div>
                            </div>

                            {e.previousStatus !== e.newStatus && (
                              <div className="text-xs">
                                <span className="text-gray-400 mr-1">{t("statusLabel")}:</span>
                                <span className="font-medium">{e.previousStatus ?? "—"}</span>
                                <span className="mx-2">→</span>
                                <span className="font-medium">{e.newStatus ?? "—"}</span>
                              </div>
                            )}

                            {e.previousIsInLineup !== e.newIsInLineup && (
                              <div className="text-xs mt-1">
                                <span className="text-gray-400 mr-1">{t("lineupLabel")}:</span>
                                <span className="font-medium ml-1">{e.previousIsInLineup ? t("inLineup") : t("notInLineup")}</span>
                                <span className="mx-2">→</span>
                                <span className="font-medium">{e.newIsInLineup ? t("inLineup") : t("notInLineup")}</span>
                              </div>
                            )}

                            {e.previousComment !== e.newComment && (
                              <div className="text-xs mt-1">
                                <span className="text-gray-400 mr-1">{t("commentChange")}</span>
                                <span className="ml-1">{`"${e.previousComment ?? ""}" → "${e.newComment ?? ""}"`}</span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {hasMoreAudit && (
                <div className="flex flex-col items-center pt-2">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleLoadMoreAudit}
                    disabled={isLoadingMoreAudit}
                  >
                    {isLoadingMoreAudit
                      ? t("loading")
                      : tWithParams("loadMoreAuditEntries", { count: auditPageSize })}
                  </Button>
                  {auditLoadError && <p className="text-xs text-red-600">{auditLoadError}</p>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isInvitationDialogOpen} onOpenChange={setIsInvitationDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("invitationEmailTitle")}</DialogTitle>
            <DialogDescription>{t("invitationEmailDescription")}</DialogDescription>
          </DialogHeader>
          <Textarea
            ref={textareaRef}
            value={invitationEmailContent || t("invitationEmailUnavailable")}
            readOnly
            rows={6}
            className="font-mono text-sm"
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setIsInvitationDialogOpen(false)}>
              {t("close")}
            </Button>
            <Button onClick={handleCopyInvitation} disabled={!invitationEmailContent}>
              <Copy className="mr-2 h-4 w-4" />
              {copyFeedback === "copied" ? t("emailContentCopied") : t("copyEmailContent")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
