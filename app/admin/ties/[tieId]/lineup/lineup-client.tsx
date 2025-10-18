"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, UserX, Clock } from "lucide-react"
import { toggleLineupAction } from "@/app/actions/lineup"
import { useTranslation } from "@/lib/i18n"
import { Tie, Team, Participation, PlayerWithRank } from "@/lib/types"

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
  lineupCount: number
  maxPlayers: number
}

export function LineupClient({
  tie,
  team,
  lineupPlayers,
  availablePlayers,
  otherParticipations,
  lineupCount,
  maxPlayers
}: LineupClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

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
  }) => (
    <Card className={`${isInLineup ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <h3 className="font-semibold text-sm">
                #{participation.player.playerRank} {participation.player.firstName} {participation.player.lastName}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
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
              </div>
            </div>
          </div>
          
          {canToggle && (
            <Button
              size="sm"
              variant={isInLineup ? "outline" : "default"}
              onClick={() => handleToggleLineup(participation.id, isInLineup)}
              disabled={isLoading || (!isInLineup && lineupCount >= maxPlayers)}
            >
              {isInLineup ? t("remove") : t("add")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

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
              {tie.tieDate.toLocaleDateString()} {tie.tieDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
          </div>
        </div>
      </div>

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
                        canToggle={true}
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
                      canToggle={true}
                    />
                  ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  {t("noPlayersAdded")}
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
    </main>
  )
}