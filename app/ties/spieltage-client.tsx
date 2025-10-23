"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, MapPin, Users, Download, LogOut, Eye, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  getTiesForSeason,
  getPlayersForSeason,
  getParticipationsForTie,
  updateParticipation,
  getSeasonInfo,
  getTeamsForSeason,
  getParticipationsForPlayer,
} from "@/app/actions/public"
import { TieDetailsDialog } from "@/components/tie-details-dialog"
import { ParticipationCommentDialog } from "@/components/participation-comment-dialog"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslation } from "@/lib/i18n"
import { Season, Team } from "@/lib/types"
import { PlayerParticipationDto } from "@/lib/db"

export const dynamic = "force-dynamic"

// Utility functions for ICS generation
const formatDateForICS = (date: Date): string => {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")
}

export type SpieltagePlayer = {
  id: number
  firstName: string
  lastName: string
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
  tieDate: Date
  location: string | null
  isHome: boolean
  teamName: string
  confirmedCount: number
  maybeCount: number
  declinedCount: number
}

export type Tie = {
  id: number
  teamId: number
  opponent: string
  tieDate: Date
  location: string | null
  isHome: boolean
  teamName: string
  confirmedCount: number
  maybeCount: number
  declinedCount: number
}

interface SpieltageClientProps {
  accessCode?: string
  seasonId?: number
}

export function SpieltageClient({ accessCode, seasonId: propSeasonId }: SpieltageClientProps = {}) {
  const router = useRouter()

  const searchParams = useSearchParams()
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [showPlayerSelection, setShowPlayerSelection] = useState(false)
  const [showRememberPrompt, setShowRememberPrompt] = useState(false)
  const [ties, setTies] = useState<Tie[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<SpieltagePlayer[]>([])
  const [playerParticipations, setPlayerParticipations] = useState<PlayerParticipationDto[]>([])
  const [season, setSeason] = useState<Pick<Season, "id" | "name">>({ id: 0, name: "" })
  const [loading, setLoading] = useState(true)
  const [participationsLoading, setParticipationsLoading] = useState(true)
  const [selectedTie, setSelectedTie] = useState<TieWithDetails | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [pendingParticipation, setPendingParticipation] = useState<{
    tieId: number
    status: "confirmed" | "maybe" | "declined"
  } | null>(null)
  const [timeFilter, setTimeFilter] = useState<"all" | "upcoming">("all")
  const [teamFilter, setTeamFilter] = useState<"all" | "my">("all")
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "team" | "opponent">("date-asc")
  const { t } = useTranslation()

  // localStorage utility functions
  const getStoredPlayerId = (): number | null => {
    try {
      const stored = localStorage.getItem("selectedPlayerId")
      return stored ? Number(stored) : null
    } catch {
      return null
    }
  }

  const storePlayerId = (playerId: number) => {
    try {
      localStorage.setItem("selectedPlayerId", playerId.toString())
    } catch {
      // Handle storage errors gracefully
    }
  }

  const updateParticipationCallback = useCallback(
    async (playerId: number) => {
      if (playerId === null || !propSeasonId) {
        return
      }
      setParticipationsLoading(true)
      try {
        const participations = await getParticipationsForPlayer(propSeasonId, playerId)
        setPlayerParticipations(participations)
      } catch (error) {
        console.error("Failed to fetch participations:", error)
      } finally {
        setParticipationsLoading(false)
      }
    },
    [propSeasonId],
  )

  // Check if we should show the remember prompt
  const checkShowRememberPrompt = useCallback((selectedId: number) => {
    const storedId = getStoredPlayerId()
    const shouldShow = !storedId || storedId !== selectedId
    setShowRememberPrompt(shouldShow)
  }, [])

  // Function to remember the current player
  const rememberPlayer = () => {
    if (selectedPlayerId) {
      storePlayerId(selectedPlayerId)
      setShowRememberPrompt(false)
    }
  }

  // Function to update URL with player selection
  const updatePlayerInURL = useCallback(
    (playerId: number | null) => {
      const currentParams = new URLSearchParams(searchParams.toString())

      if (playerId !== null) {
        currentParams.set("player", playerId.toString())
      } else {
        currentParams.delete("player")
      }

      const newURL = `${window.location.pathname}?${currentParams.toString()}`
      window.history.replaceState({}, "", newURL)
    },
    [searchParams],
  )

  // Function to handle player selection change
  const handlePlayerChange = (playerId: number | null) => {
    setSelectedPlayerId(playerId)
    updatePlayerInURL(playerId)
    setShowPlayerSelection(false)

    if (playerId) {
      checkShowRememberPrompt(playerId)
    } else {
      setShowRememberPrompt(false)
    }
  }

  // Function to handle switching players
  const handleSwitchPlayer = () => {
    setShowPlayerSelection(true)
  }

  // Get selected player details
  const selectedPlayer = selectedPlayerId !== null ? players.find((p) => p.id === selectedPlayerId) : null

  // Utility functions for ICS generation (inside component to access t)
  const generateICSContent = (tie: Tie): string => {
    const startDate = new Date(tie.tieDate)
    // Assume 4-hour duration for tennis matches
    const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000)

    const summary = `${tie.teamName} ${t("vs")} ${tie.opponent}`
    const location = tie.location || ""
    const description = `Tennis: ${summary}${tie.isHome ? ` (${t("home")})` : ` (${t("away")})`}`

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Tennis Club//Match Calendar//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:tie-${tie.id}@tennisclub.local`,
      `DTSTART:${formatDateForICS(startDate)}`,
      `DTEND:${formatDateForICS(endDate)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n")

    return icsContent
  }

  const downloadICS = (tie: Tie) => {
    const icsContent = generateICSContent(tie)
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = `tennis-match-${tie.teamName.replace(/\s+/g, "-")}-vs-${tie.opponent.replace(/\s+/g, "-")}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    const loadData = async () => {
      // Require props - no localStorage fallback needed with URL-based routing
      if (!propSeasonId || !accessCode) {
        router.push("/")
        return
      }

      try {
        if (!season || season.id !== propSeasonId) {
          const [seasonData, playersData, teamsData, tiesData] = await Promise.all([
            getSeasonInfo(String(propSeasonId)),
            getPlayersForSeason(String(propSeasonId)),
            getTeamsForSeason(String(propSeasonId)),
            getTiesForSeason(String(propSeasonId)),
          ])

          setPlayers(
            playersData.sort((a, b) => {
              // Sort by firstName first, then by lastName
              const firstNameCompare = a.firstName.localeCompare(b.firstName)
              if (firstNameCompare !== 0) {
                return firstNameCompare
              }
              return a.lastName.localeCompare(b.lastName)
            }),
          )

          // Set season name
          if (seasonData) {
            setSeason(seasonData)
          }
          setTeams(teamsData)

          // Load participations for each tie
          // const tiesWithDetails = await Promise.all(
          //   (tiesData).map(async (tie) => {
          //     const participations = await getParticipationsForTie(String(tie.id))

          //     const participationsWithPlayers: SpieltageParticipation[] = participations.map((p) => ({
          //       id: p.id,
          //       tieId: p.tieId,
          //       playerId: p.playerId,
          //       status: p.status,
          //       comment: p.comment ?? null,
          //       playerRank: p.playerRank,
          //       player: {
          //         id: p.playerId,
          //         firstName: p.firstName,
          //         lastName: p.lastName,
          //       },
          //     }))

          //     const tieDate = new Date(tie.tieDate)
          //     if (Number.isNaN(tieDate.getTime())) {
          //       console.warn("Received invalid tie date", tie.id, tie.tieDate)
          //     }

          //     return {
          //       id: tie.id,
          //       teamId: tie.teamId,
          //       opponent: tie.opponent,
          //       tieDate,
          //       location: tie.location ?? null,
          //       isHome: tie.isHome,
          //       teamName: tie.teamName,
          //       teamPlayerIds: tie.teamPlayerIds ?? [],
          //       participations: participationsWithPlayers,
          //       confirmedCount: participationsWithPlayers.filter((p) => p.status === "confirmed").length,
          //       maybeCount: participationsWithPlayers.filter((p) => p.status === "maybe").length,
          //       declinedCount: participationsWithPlayers.filter((p) => p.status === "declined").length,
          //     }
          //   }),
          // )
          const fancyTies = tiesData.map((tie) => {
            return {
              ...tie,
              confirmedCount: tie.participations.filter((p) => p.status === "confirmed").length,
              maybeCount: tie.participations.filter((p) => p.status === "maybe").length,
              declinedCount: tie.participations.filter((p) => p.status === "declined").length,
              teamName: teamsData.find((team) => team.id === tie.teamId)?.name || "n/a",
            }
          })

          setTies(fancyTies)
        }

        const playerParam = searchParams.get("player")
        if (playerParam && players.some((p) => p.id === Number(playerParam))) {
          setSelectedPlayerId(Number(playerParam))
          setShowPlayerSelection(false)
          updateParticipationCallback(Number(playerParam))
          // Check if we should show remember prompt for URL-selected player
          checkShowRememberPrompt(Number(playerParam))
        } else {
          // Check localStorage only if no URL parameter
          const storedPlayerId = getStoredPlayerId()
          if (storedPlayerId && players.some((p) => p.id === storedPlayerId)) {
            setSelectedPlayerId(storedPlayerId)
            // updatePlayerInURL(storedPlayerId)
            setShowPlayerSelection(false)
            updateParticipationCallback(storedPlayerId)
            // Don't show remember prompt for stored player
          } else {
            // No valid player found - show selection UI
            setShowPlayerSelection(true)
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [
    router,
    accessCode,
    propSeasonId,
    searchParams,
    checkShowRememberPrompt,
    updatePlayerInURL,
    updateParticipationCallback,
    season,
    players,
  ])

  const handleLogout = () => {
    // Simply redirect to home - no localStorage cleanup needed with URL-based routing
    router.push("/")
  }

  const getPlayerParticipation = (tieId: number) => {
    if (selectedPlayerId === null) {
      return undefined
    }
    return playerParticipations.find((p) => p.tieId === tieId)
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
      await updateParticipation(String(tieId), String(selectedPlayerId), status, comment || "")

      const participations = await getParticipationsForTie(String(tieId))
      const participationsWithPlayers: SpieltageParticipation[] = participations.map((p) => ({
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
      updateParticipationCallback(selectedPlayerId)
    } catch (error) {
      console.error("Failed to update participation:", error)
    }
  }

  const handleShowDetails = async (tie: Tie) => {
    setSelectedTie({ ...tie } as TieWithDetails)
    setShowDetailsDialog(true)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isPlayerOnTeam = (teamId: number) => {
    if (selectedPlayerId === null) return false
    return teams.find((team) => team.id === teamId)?.playerIds.includes(selectedPlayerId)
  }

  // Apply all filters and sorting
  const filteredAndSortedTies = (() => {
    let filtered = ties

    // Time filter
    if (timeFilter === "upcoming") {
      const now = new Date()
      filtered = filtered.filter((tie) => new Date(tie.tieDate) >= now)
    }

    // Team filter
    if (teamFilter === "my" && selectedPlayerId !== null) {
      filtered = filtered.filter((tie) => isPlayerOnTeam(tie.teamId))
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(a.tieDate).getTime() - new Date(b.tieDate).getTime()
        case "date-desc":
          return new Date(b.tieDate).getTime() - new Date(a.tieDate).getTime()
        case "team":
          return a.teamName.localeCompare(b.teamName)
        case "opponent":
          return a.opponent.localeCompare(b.opponent)
        default:
          return 0
      }
    })

    return filtered
  })()

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
                {season ? season.name : t("matchDays")}
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher className="border-gray-400 bg-transparent text-white hover:bg-white hover:text-gray-900 transition-colors" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-gray-400 bg-transparent text-white hover:bg-white hover:text-gray-900 transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="mb-12 text-3xl font-semibold text-white">
          {season ? `${season.name} - ${t("upcomingMatches")}` : t("upcomingMatches")}
        </h1>

        {/* Player Selection Section */}
        <div className="mb-8 flex items-center gap-4">
          {showPlayerSelection ? (
            <>
              <label className="text-base text-white">{t("impersonatePlayer")}</label>
              <Select
                value={selectedPlayerId !== null ? String(selectedPlayerId) : ""}
                onValueChange={(value) => handlePlayerChange(value ? Number(value) : null)}
              >
                <SelectTrigger className="w-[250px] border-gray-300 bg-white text-gray-900">
                  <SelectValue placeholder={t("selectPlayer") || "Select a player..."} />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={String(player.id)}>
                      {player.firstName} {player.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : selectedPlayer ? (
            <div className="text-lg text-white">
              <span>
                {t("hello")}, {selectedPlayer.firstName}!
              </span>
              <span className="ml-2 text-sm opacity-75">
                (
                <button
                  onClick={handleSwitchPlayer}
                  className="text-white hover:text-blue-300 underline underline-offset-2"
                >
                  {t("switchPlayer")}
                </button>
                {showRememberPrompt && (
                  <>
                    <span className="mx-1">|</span>
                    <button
                      onClick={rememberPlayer}
                      className="text-white hover:text-green-300 underline underline-offset-2"
                    >
                      {t("rememberMe")}
                    </button>
                  </>
                )}
                )
              </span>
            </div>
          ) : null}
        </div>

        {/* Filters & Sorting Section */}
        <div className="mb-8">
          <details className="group">
            <summary className="flex w-full cursor-pointer items-center justify-between rounded-lg bg-[#34495e] px-4 py-3 text-left text-sm font-medium text-white transition-all hover:bg-[#3d5266] group-open:bg-[#3d5266]">
              <span>{t("filterByTeam")}</span>
              <ChevronDown className="h-5 w-5 text-white transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="mt-3 space-y-6 rounded-lg bg-[#2c3e50] p-4">
              {/* Team Filter */}
              <div>
                <Label className="mb-2 block text-sm font-medium text-white">{t("filterByTeam")}</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="filter-all-teams"
                      name="teamFilter"
                      value="all"
                      checked={teamFilter === "all"}
                      onChange={(e) => setTeamFilter(e.target.value as "all" | "my")}
                      className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                    />
                    <Label htmlFor="filter-all-teams" className="text-sm text-white">
                      {t("showAllPlayers")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="filter-my-teams"
                      name="teamFilter"
                      value="my"
                      checked={teamFilter === "my"}
                      onChange={(e) => setTeamFilter(e.target.value as "all" | "my")}
                      disabled={selectedPlayerId === null}
                      className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <Label htmlFor="filter-my-teams" className="text-sm text-white">
                      {t("showMyTeams")}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Time Filter */}
              <div>
                <Label className="mb-2 block text-sm font-medium text-white">{t("filterByDate")}</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="filter-all-times"
                      name="timeFilter"
                      value="all"
                      checked={timeFilter === "all"}
                      onChange={(e) => setTimeFilter(e.target.value as "all" | "upcoming")}
                      className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                    />
                    <Label htmlFor="filter-all-times" className="text-sm text-white">
                      {t("showAllDates")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="filter-upcoming"
                      name="timeFilter"
                      value="upcoming"
                      checked={timeFilter === "upcoming"}
                      onChange={(e) => setTimeFilter(e.target.value as "all" | "upcoming")}
                      className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                    />
                    <Label htmlFor="filter-upcoming" className="text-sm text-white">
                      {t("showUpcomingMatches")}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <Label className="mb-2 block text-sm font-medium text-white">{t("sortBy")}</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="sort-date-asc"
                      name="sortBy"
                      value="date-asc"
                      checked={sortBy === "date-asc"}
                      onChange={(e) => setSortBy(e.target.value as "date-desc" | "date-asc" | "team" | "opponent")}
                      className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                    />
                    <Label htmlFor="sort-date-asc" className="text-sm text-white">
                      {t("dateAsc")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="sort-date-desc"
                      name="sortBy"
                      value="date-desc"
                      checked={sortBy === "date-desc"}
                      onChange={(e) => setSortBy(e.target.value as "date-desc" | "date-asc" | "team" | "opponent")}
                      className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                    />
                    <Label htmlFor="sort-date-desc" className="text-sm text-white">
                      {t("dateDesc")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="sort-team"
                      name="sortBy"
                      value="team"
                      checked={sortBy === "team"}
                      onChange={(e) => setSortBy(e.target.value as "date-desc" | "date-asc" | "team" | "opponent")}
                      className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                    />
                    <Label htmlFor="sort-team" className="text-sm text-white">
                      {t("teamName")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="sort-opponent"
                      name="sortBy"
                      value="opponent"
                      checked={sortBy === "opponent"}
                      onChange={(e) => setSortBy(e.target.value as "date-desc" | "date-asc" | "team" | "opponent")}
                      className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                    />
                    <Label htmlFor="sort-opponent" className="text-sm text-white">
                      {t("opponentName")}
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Game Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedTies.map((tie) => {
            const participation = getPlayerParticipation(tie.id)
            const status = participation?.status || null
            const canParticipate = isPlayerOnTeam(tie.teamId) // Check team membership
            // console.log("Rendering tie", tie.id, " - player participation:", participation, " - canParticipate:", canParticipate)
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
                    <button
                      onClick={() => downloadICS(tie)}
                      className="ml-auto inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800 transition-colors hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-300"
                      title="Download calendar event"
                    >
                      <Download className="h-3 w-3" />
                      ICS
                    </button>
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

                {selectedPlayerId === null || participationsLoading ? (
                  selectedPlayerId === null ? (
                    <div className="rounded border-2 border-gray-400 bg-gray-100 px-3 py-2 text-center text-sm text-gray-500">
                      {t("selectPlayerFirst") || "Please select a player first"}
                    </div>
                  ) : (
                    <div className="rounded border-2 border-gray-400 bg-gray-100 px-3 py-2 text-center text-sm text-gray-500">
                      {t("loading")}
                    </div>
                  )
                ) : canParticipate ? (
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
