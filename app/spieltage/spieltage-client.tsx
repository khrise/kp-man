"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar, MapPin, Users, Download, LogOut, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getTiesForSeason,
  getPlayersForSeason,
  getParticipationsForTie,
  updateParticipation,
} from "@/app/actions/public"
import { TieDetailsDialog } from "@/components/tie-details-dialog"
import { ParticipationCommentDialog } from "@/components/participation-comment-dialog"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslation } from "@/lib/i18n"
export type SpieltagePlayer = {
  id: number
  firstName: string
  lastName: string
  email: string | null
}

export type SpieltageParticipation = {
  id: number
  tieId: number
  playerId: number
  status: "confirmed" | "maybe" | "declined"
  comment: string | null
  playerRank: number
  player: SpieltagePlayer
}

export type TieWithDetails = {
  id: number
  teamId: number
  opponent: string
  tieDate: string
  location: string | null
  isHome: boolean
  teamName: string
  teamPlayerIds: number[]
  participations: SpieltageParticipation[]
  confirmedCount: number
  maybeCount: number
  declinedCount: number
}

export function SpieltageClient() {
  const router = useRouter()
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [ties, setTies] = useState<TieWithDetails[]>([])
  const [players, setPlayers] = useState<SpieltagePlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTie, setSelectedTie] = useState<TieWithDetails | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [pendingParticipation, setPendingParticipation] = useState<{
    tieId: number
    status: "confirmed" | "maybe" | "declined"
  } | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    const loadData = async () => {
      const seasonId = localStorage.getItem("season_id")
      const accessCode = localStorage.getItem("season_access_code")

      if (!seasonId || !accessCode) {
        router.push("/")
        return
      }

      try {
        const [tiesData, playersData] = await Promise.all([getTiesForSeason(seasonId), getPlayersForSeason(seasonId)])

        const mappedPlayers: SpieltagePlayer[] = (playersData as SpieltagePlayer[]).map((player) => ({
          id: Number(player.id),
          firstName: player.firstName,
          lastName: player.lastName,
          email: player.email ?? null,
        }))

        setPlayers(mappedPlayers)

        // Load participations for each tie
        const tiesWithDetails = await Promise.all(
          (tiesData as any[]).map(async (tie) => {
            const participations = await getParticipationsForTie(String(tie.id))

            const participationsWithPlayers: SpieltageParticipation[] = participations.map((p: any) => ({
              id: p.id,
              tieId: p.tieId,
              playerId: p.playerId,
              status: p.status,
              comment: p.comment ?? null,
              playerRank: p.playerRank,
              player: {
                id: p.playerId,
                firstName: p.firstName,
                lastName: p.lastName,
                email: p.email ?? null,
              },
            }))

            return {
              id: tie.id,
              teamId: tie.teamId,
              opponent: tie.opponent,
              tieDate: tie.tieDate,
              location: tie.location ?? null,
              isHome: tie.isHome,
              teamName: tie.teamName,
              teamPlayerIds: tie.teamPlayerIds ?? [],
              participations: participationsWithPlayers,
              confirmedCount: participationsWithPlayers.filter((p) => p.status === "confirmed").length,
              maybeCount: participationsWithPlayers.filter((p) => p.status === "maybe").length,
              declinedCount: participationsWithPlayers.filter((p) => p.status === "declined").length,
            }
          }),
        )

        setTies(tiesWithDetails)

        // Set first player as default if not set
        if (mappedPlayers.length > 0 && selectedPlayerId === null) {
          setSelectedPlayerId(mappedPlayers[0].id)
        }
      } catch (error) {
        console.error("Failed to load data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, selectedPlayerId])

  const handleLogout = () => {
    localStorage.removeItem("season_access_code")
    localStorage.removeItem("season_id")
    router.push("/")
  }

  const getPlayerParticipation = (tieId: number) => {
    if (selectedPlayerId === null) {
      return undefined
    }
    const tie = ties.find((t) => t.id === tieId)
    return tie?.participations.find((p) => p.playerId === selectedPlayerId)
  }

  const handleParticipationClick = async (tieId: number, status: "confirmed" | "maybe" | "declined") => {
    if (selectedPlayerId === null) return

    const currentParticipation = getPlayerParticipation(tieId)

    if (currentParticipation?.status === status) {
      return
    }

    setPendingParticipation({ tieId, status })
    setShowCommentDialog(true)
  }

  const handleCommentConfirm = async (comment: string) => {
    if (!pendingParticipation || selectedPlayerId === null) return

    const { tieId, status } = pendingParticipation

    try {
      await updateParticipation(String(tieId), String(selectedPlayerId), status, comment || '')

      const participations = await getParticipationsForTie(String(tieId))
      const participationsWithPlayers: SpieltageParticipation[] = participations.map((p: any) => ({
        id: p.id,
        tieId: p.tieId,
        playerId: p.playerId,
        status: p.status,
        comment: p.comment ?? null,
        playerRank: p.playerRank,
        player: {
          id: p.playerId,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email ?? null,
        },
      }))

      setTies((prevTies) =>
        prevTies.map((tie) => {
          if (tie.id === tieId) {
            return {
              ...tie,
              participations: participationsWithPlayers,
              confirmedCount: participationsWithPlayers.filter((p) => p.status === "confirmed").length,
              maybeCount: participationsWithPlayers.filter((p) => p.status === "maybe").length,
              declinedCount: participationsWithPlayers.filter((p) => p.status === "declined").length,
            }
          }
          return tie
        }),
      )

      setPendingParticipation(null)
    } catch (error) {
      console.error("Failed to update participation:", error)
    }
  }

  const handleShowDetails = (tie: TieWithDetails) => {
    setSelectedTie(tie)
    setShowDetailsDialog(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isPlayerOnTeam = (tie: TieWithDetails) => {
    if (selectedPlayerId === null) return false
    return tie.teamPlayerIds.includes(selectedPlayerId)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#2c3e50]">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#2c3e50]">
      {/* Header */}
      <header className="border-b border-[#3d5266] bg-[#34495e]">
        <div className="mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <path d="M10 8L10 32L18 28L18 12L10 8Z" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M18 12L26 8L26 32L18 28" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M26 8L30 10L30 30L26 32" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <nav className="flex items-center">
              <a href="#" className="border-b-2 border-blue-500 px-4 py-6 text-sm font-medium text-white">
                Spieltage
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher className="border-gray-600 bg-transparent text-white hover:bg-gray-700" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-gray-600 bg-transparent text-white hover:bg-gray-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("exit")}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="mb-12 text-3xl font-semibold text-white">{t("upcomingMatches")}</h1>

        {/* Filter Section */}
        <div className="mb-8 flex items-center gap-4">
          <label className="text-base text-white">{t("impersonatePlayer")}</label>
          <Select
            value={selectedPlayerId !== null ? String(selectedPlayerId) : ""}
            onValueChange={(value) => setSelectedPlayerId(value ? Number(value) : null)}
          >
            <SelectTrigger className="w-[250px] border-gray-300 bg-white text-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={String(player.id)}>
                  {player.firstName} {player.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="secondary"
          className="mb-8 bg-[#4a5f7a] text-white hover:bg-[#5a6f8a]"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? t("hideFilters") : t("showFilters")}
        </Button>

        {/* Game Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ties.map((tie) => {
            const participation = getPlayerParticipation(tie.id)
            const status = participation?.status || null
            const canParticipate = isPlayerOnTeam(tie) // Check team membership

            return (
              <div key={tie.id} className="rounded-lg bg-[#4a5f7a] p-6 shadow-lg">
                <h2 className="mb-4 text-xl font-semibold text-white">
                  {tie.teamName} {t("vs")} {tie.opponent}
                </h2>

                <div className="mb-4 space-y-3">
                  <div className="flex items-center gap-3 text-white">
                    <Calendar className="h-5 w-5" />
                    <span className="text-sm">
                      {formatDate(tie.tieDate)} {formatTime(tie.tieDate)}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      <Download className="h-3 w-3" />
                      ICS
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-white">
                    <MapPin className="h-5 w-5" />
                    <span className="text-sm">{tie.location || "—"}</span>
                  </div>

                  <div className="flex items-center gap-3 text-white">
                    <Users className="h-5 w-5" />
                    <span className="text-sm">
                      {tie.confirmedCount} {t("participants")}, {tie.maybeCount} {t("undecided")}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => handleShowDetails(tie)}
                  className="mb-4 w-full bg-blue-600 text-sm font-bold uppercase tracking-wide text-white hover:bg-blue-700"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t("showDetails")}
                </Button>

                {canParticipate ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleParticipationClick(tie.id, "confirmed")}
                      className={`rounded border-2 px-3 py-2 text-sm font-medium transition-colors ${
                        status === "confirmed"
                          ? "border-green-500 bg-white text-green-600"
                          : "border-gray-400 bg-white text-gray-600 hover:border-green-400"
                      }`}
                    >
                      {t("confirm")}
                    </button>
                    <button
                      onClick={() => handleParticipationClick(tie.id, "maybe")}
                      className={`rounded border-2 px-3 py-2 text-sm font-medium transition-colors ${
                        status === "maybe"
                          ? "border-yellow-500 bg-white text-yellow-600"
                          : "border-gray-400 bg-white text-gray-600 hover:border-yellow-400"
                      }`}
                    >
                      {t("maybe")}
                    </button>
                    <button
                      onClick={() => handleParticipationClick(tie.id, "declined")}
                      className={`rounded border-2 px-3 py-2 text-sm font-medium transition-colors ${
                        status === "declined"
                          ? "border-red-500 bg-white text-red-600"
                          : "border-gray-400 bg-white text-gray-600 hover:border-red-400"
                      }`}
                    >
                      {t("decline")}
                    </button>
                  </div>
                ) : (
                  <div className="rounded border-2 border-gray-400 bg-gray-100 px-3 py-2 text-center text-sm text-gray-500">
                    {t("notOnTeam") || "You are not a member of this team"}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {/* Tie Details Dialog */}
      {selectedTie && (
        <TieDetailsDialog tie={selectedTie} open={showDetailsDialog} onOpenChange={setShowDetailsDialog} />
      )}

      {/* Participation Comment Dialog */}
      <ParticipationCommentDialog
        open={showCommentDialog}
        onOpenChange={setShowCommentDialog}
        status={pendingParticipation?.status || "confirmed"}
        onConfirm={handleCommentConfirm}
        translations={{
          title: t("participationComment"),
          description: t("addOptionalComment"),
          commentLabel: t("commentLabel"),
          commentPlaceholder: t("commentPlaceholder"),
          cancel: t("cancel"),
          confirm: t("confirm"),
        }}
      />
    </div>
  )
}
