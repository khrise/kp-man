"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Users, UserCheck, UserX, Clock, HelpCircle } from "lucide-react"
import { toggleLineupAction, markTieReadyAction } from "@/app/actions/lineup"
import { useTranslation } from "@/lib/i18n"
import { Tie, Team, Participation, PlayerWithRank } from "@/lib/types"
import type { TeamPlayerWithDetails } from "@/lib/db"

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
}

export function LineupClient({
  tie,
  team,
  lineupPlayers,
  availablePlayers,
  otherParticipations,
  playersWithoutParticipation,
  lineupCount,
  maxPlayers
}: LineupClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isNoResponseOpen, setIsNoResponseOpen] = useState(false)
  const [isTogglingReady, setIsTogglingReady] = useState(false)

  const tieDate = useMemo(() => {
    const parsed = tie.tieDate instanceof Date ? tie.tieDate : new Date(tie.tieDate)
    return Number.isNaN(parsed.getTime()) ? new Date(NaN) : parsed
  }, [tie.tieDate])

  // Check for problematic lineup situations
  const problematicPlayers = lineupPlayers.filter(p => p.status !== "confirmed")
  const hasProblematicPlayers = problematicPlayers.length > 0

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
                disabled={isLoading || tie.isReady || (!isInLineup && lineupCount >= maxPlayers)}
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

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("manageLineup")}
            </h1>
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
            <p className="text-sm text-gray-500">{t("lineupCount")}</p>
            <div className="mt-2 flex items-center justify-end space-x-2">
              {tie.isReady ? (
                <>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    {t("lineupComplete")}
                  </Badge>
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
                <>
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
                </>
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
                        canToggle={!tie.isReady}
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
                <span>{t("availablePlayers")} ({availablePlayers.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {availablePlayers.length > 0 ? (
                availablePlayers
                  .sort((a, b) => a.player.playerRank - b.player.playerRank)
                  .map((participation) => (
                    <PlayerCard 
                      key={participation.id}
                      participation={participation} 
                      isInLineup={false}
                      canToggle={!tie.isReady}
                    />
                  ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  {t("noPlayersAvailable")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Other Participations (Maybe/Declined) */}
          {otherParticipations.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span>{t("otherParticipations")} ({otherParticipations.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {otherParticipations
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
          )}
        </div>
      </div>

      {/* Players Without Response - Full Width Section */}
      {playersWithoutParticipation.length > 0 && (
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
                    <span className="font-semibold">{t("playersWithoutResponse")} ({playersWithoutParticipation.length})</span>
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
    </main>
  )
}
