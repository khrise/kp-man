"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, MapPin, Users, Download, LogOut, Eye, Filter, X, Check, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  getTiesForSeason,
  getPlayersForSeason,
  getParticipationsForTie,
  updateParticipation,
  getSeasonInfo,
  getTeamsForSeason,
  getParticipationsForPlayer,
  getPlayerRanksForSeason,
} from "@/app/actions/public"
import { TieDetailsDialog } from "@/components/tie-details-dialog"
import { ParticipationCommentDialog } from "@/components/participation-comment-dialog"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslation } from "@/lib/i18n"
import { Season, Team } from "@/lib/types"
import { PlayerParticipationDto } from "@/lib/db"
import { cn, getISOWeekInfo } from "@/lib/utils"

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
  isLineupReady?: boolean
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
  isLineupReady?: boolean
}

type SortOption = "date-desc" | "date-asc" | "team" | "opponent"
type WeeklyTableSort = "name-asc" | "rank-asc"

type SeasonPlayerRankEntry = {
  playerId: number
  teamId: number
  teamName: string
  playerRank: number
}

type WeekGroup = {
  key: string
  weekNumber: number
  year: number
  startOfWeek: Date
  endOfWeek: Date
  ties: Tie[]
}

const compareTies = (sortBy: SortOption) => {
  return (a: Tie, b: Tie) => {
    switch (sortBy) {
      case "date-desc":
        return new Date(b.tieDate).getTime() - new Date(a.tieDate).getTime()
      case "date-asc":
        return new Date(a.tieDate).getTime() - new Date(b.tieDate).getTime()
      case "team":
        return a.teamName.localeCompare(b.teamName) || new Date(a.tieDate).getTime() - new Date(b.tieDate).getTime()
      case "opponent":
        return a.opponent.localeCompare(b.opponent) || new Date(a.tieDate).getTime() - new Date(b.tieDate).getTime()
      default:
        return 0
    }
  }
}

const buildWeekGroups = (ties: Tie[], sortBy: SortOption): WeekGroup[] => {
  if (ties.length === 0) {
    return []
  }

  const groupsByKey = new Map<string, WeekGroup>()

  ties.forEach((tie) => {
    const tieDate = new Date(tie.tieDate)
    const { weekNumber, year, startOfWeek, endOfWeek } = getISOWeekInfo(tieDate)
    const key = `${year}-W${String(weekNumber).padStart(2, "0")}`

    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        key,
        weekNumber,
        year,
        startOfWeek,
        endOfWeek,
        ties: [],
      })
    }

    groupsByKey.get(key)?.ties.push(tie)
  })

  const sortedGroups = Array.from(groupsByKey.values())
  const tieComparator = compareTies(sortBy)

  sortedGroups.forEach((group) => {
    group.ties = [...group.ties].sort(tieComparator)
  })

  sortedGroups.sort((a, b) => {
    if (sortBy === "date-desc") {
      return b.startOfWeek.getTime() - a.startOfWeek.getTime()
    }

    if (sortBy === "date-asc") {
      return a.startOfWeek.getTime() - b.startOfWeek.getTime()
    }

    // For non-date sorts keep chronological order
    return a.startOfWeek.getTime() - b.startOfWeek.getTime()
  })

  return sortedGroups
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
  const [seasonPlayerRanks, setSeasonPlayerRanks] = useState<SeasonPlayerRankEntry[]>([])
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
  const [timeFilter, setTimeFilter] = useState<"all" | "upcoming">("upcoming")
  const [teamFilter, setTeamFilter] = useState<"all" | "my">("my")
  const [sortBy, setSortBy] = useState<SortOption>("date-asc")
  const [weeklyTableVisible, setWeeklyTableVisible] = useState<Record<string, boolean>>({})
  const [weeklyTableSort, setWeeklyTableSort] = useState<Record<string, WeeklyTableSort>>({})
  const [weeklyTableLoading, setWeeklyTableLoading] = useState<Record<string, boolean>>({})
  const [weeklyTieLoading, setWeeklyTieLoading] = useState<Record<string, Record<number, boolean>>>({})
  const [weeklyParticipations, setWeeklyParticipations] = useState<
    Record<string, Record<number, SpieltageParticipation[]>>
  >({})
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const detailsCloseTimeoutRef = useRef<number | null>(null)
  const { t, tWithParams, locale } = useTranslation()

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
          const [seasonData, playersData, teamsData, tiesData, rankData] = await Promise.all([
            getSeasonInfo(String(propSeasonId)),
            getPlayersForSeason(String(propSeasonId)),
            getTeamsForSeason(String(propSeasonId)),
            getTiesForSeason(String(propSeasonId)),
            getPlayerRanksForSeason(String(propSeasonId)),
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
          setSeasonPlayerRanks(rankData)

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
    if (detailsCloseTimeoutRef.current !== null) {
      window.clearTimeout(detailsCloseTimeoutRef.current)
      detailsCloseTimeoutRef.current = null
    }
    setSelectedTie({ ...tie } as TieWithDetails)
    setShowDetailsDialog(true)
  }

  const handleDetailsDialogChange = (open: boolean) => {
    setShowDetailsDialog(open)

    if (!open) {
      detailsCloseTimeoutRef.current = window.setTimeout(() => {
        setSelectedTie(null)
        detailsCloseTimeoutRef.current = null
      }, 200)
    } else if (detailsCloseTimeoutRef.current !== null) {
      window.clearTimeout(detailsCloseTimeoutRef.current)
      detailsCloseTimeoutRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (detailsCloseTimeoutRef.current !== null) {
        window.clearTimeout(detailsCloseTimeoutRef.current)
        detailsCloseTimeoutRef.current = null
      }
    }
  }, [])

  const formatDate = useCallback(
    (date: Date) => {
      const localeTag = locale === "de" ? "de-DE" : "en-GB"
      return new Date(date).toLocaleDateString(localeTag, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    },
    [locale],
  )

  const formatTime = useCallback(
    (date: Date) => {
      const localeTag = locale === "de" ? "de-DE" : "en-GB"
      return new Date(date).toLocaleTimeString(localeTag, {
        hour: "2-digit",
        minute: "2-digit",
      })
    },
    [locale],
  )

  const formatWeekday = useCallback(
    (date: Date) => {
      const localeTag = locale === "de" ? "de-DE" : "en-GB"
      return new Date(date).toLocaleDateString(localeTag, {
        weekday: "short",
      })
    },
    [locale],
  )

  const formatWeekHeading = useCallback(
    (group: WeekGroup) => {
      const localeTag = locale === "de" ? "de-DE" : "en-GB"
      const formatter = new Intl.DateTimeFormat(localeTag, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      const formatterWithRange = formatter as Intl.DateTimeFormat & {
        formatRange?: (start: Date, end: Date) => string
      }

      let range: string

      if (typeof formatterWithRange.formatRange === "function") {
        range = formatterWithRange.formatRange(group.startOfWeek, group.endOfWeek)
      } else if (group.startOfWeek.toDateString() === group.endOfWeek.toDateString()) {
        range = formatter.format(group.startOfWeek)
      } else {
        range = `${formatter.format(group.startOfWeek)} – ${formatter.format(group.endOfWeek)}`
      }

      return tWithParams("weekHeading", {
        week: group.weekNumber,
        range,
      })
    },
    [locale, tWithParams],
  )

  const isPlayerOnTeam = useCallback(
    (teamId: number) => {
      if (selectedPlayerId === null) return false
      return teams.find((team) => team.id === teamId)?.playerIds.includes(selectedPlayerId)
    },
    [selectedPlayerId, teams],
  )

  const filteredTies = useMemo(() => {
    const now = new Date()

    return ties.filter((tie) => {
      const tieDate = new Date(tie.tieDate)

      if (timeFilter === "upcoming" && tieDate < now) {
        return false
      }

      if (teamFilter === "my" && selectedPlayerId !== null && !isPlayerOnTeam(tie.teamId)) {
        return false
      }

      return true
    })
  }, [ties, timeFilter, teamFilter, selectedPlayerId, isPlayerOnTeam])

  const weekGroups = useMemo(() => buildWeekGroups(filteredTies, sortBy), [filteredTies, sortBy])

  const playerRankMeta = useMemo(() => {
    const byPlayer = new Map<
      number,
      {
        highestRank: number | null
        rankByTeam: Record<number, { teamName: string; rank: number }>
      }
    >()

    seasonPlayerRanks.forEach((entry) => {
      const current = byPlayer.get(entry.playerId)
      if (!current) {
        byPlayer.set(entry.playerId, {
          highestRank: entry.playerRank,
          rankByTeam: {
            [entry.teamId]: { teamName: entry.teamName, rank: entry.playerRank },
          },
        })
        return
      }

      current.highestRank =
        current.highestRank === null ? entry.playerRank : Math.min(current.highestRank, entry.playerRank)
      current.rankByTeam[entry.teamId] = { teamName: entry.teamName, rank: entry.playerRank }
    })

    return byPlayer
  }, [seasonPlayerRanks])

  const getPlayerRankTooltip = useCallback(
    (playerId: number) => {
      const meta = playerRankMeta.get(playerId)
      if (!meta) {
        return t("noRankInformation")
      }

      const ranks = Object.values(meta.rankByTeam)
        .sort((a, b) => a.rank - b.rank || a.teamName.localeCompare(b.teamName))
        .map((item) => `${item.teamName}: #${item.rank}`)

      return ranks.join(" | ")
    },
    [playerRankMeta, t],
  )

  const fetchTieParticipationsForWeek = useCallback(async (weekKey: string, tieId: number) => {
    setWeeklyTieLoading((prev) => ({
      ...prev,
      [weekKey]: {
        ...(prev[weekKey] ?? {}),
        [tieId]: true,
      },
    }))

    try {
      const participations = await getParticipationsForTie(String(tieId))
      const parsed: SpieltageParticipation[] = participations.map((p) => ({
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

      setWeeklyParticipations((prev) => ({
        ...prev,
        [weekKey]: {
          ...(prev[weekKey] ?? {}),
          [tieId]: parsed,
        },
      }))
    } catch (error) {
      console.error(`Failed to load participations for tie ${tieId}:`, error)
    } finally {
      setWeeklyTieLoading((prev) => ({
        ...prev,
        [weekKey]: {
          ...(prev[weekKey] ?? {}),
          [tieId]: false,
        },
      }))
    }
  }, [])

  const ensureWeeklyTableData = useCallback(
    async (group: WeekGroup, forceRefresh = false) => {
      const weekKey = group.key
      const currentWeekData = weeklyParticipations[weekKey] ?? {}
      const tieIdsToLoad = forceRefresh
        ? group.ties.map((tie) => tie.id)
        : group.ties.map((tie) => tie.id).filter((tieId) => !currentWeekData[tieId])

      if (tieIdsToLoad.length === 0) {
        return
      }

      setWeeklyTableLoading((prev) => ({ ...prev, [weekKey]: true }))
      try {
        await Promise.all(tieIdsToLoad.map((tieId) => fetchTieParticipationsForWeek(weekKey, tieId)))
      } finally {
        setWeeklyTableLoading((prev) => ({ ...prev, [weekKey]: false }))
      }
    },
    [fetchTieParticipationsForWeek, weeklyParticipations],
  )

  const toggleWeeklyTable = useCallback(
    async (group: WeekGroup) => {
      const weekKey = group.key
      const currentlyVisible = weeklyTableVisible[weekKey] ?? false
      const nextVisible = !currentlyVisible

      setWeeklyTableVisible((prev) => ({ ...prev, [weekKey]: nextVisible }))
      if (!weeklyTableSort[weekKey]) {
        setWeeklyTableSort((prev) => ({ ...prev, [weekKey]: "rank-asc" }))
      }

      if (nextVisible) {
        setWeeklyParticipations((prev) => ({ ...prev, [weekKey]: {} }))
        await ensureWeeklyTableData(group, true)
      }
    },
    [ensureWeeklyTableData, weeklyTableSort, weeklyTableVisible],
  )

  const getWeeklyTableRows = useCallback(
    (group: WeekGroup) => {
      const tieTeamIds = new Set(group.ties.map((tie) => tie.teamId))
      const playerIdsInWeek = new Set(
        seasonPlayerRanks.filter((entry) => tieTeamIds.has(entry.teamId)).map((entry) => entry.playerId),
      )

      const rows = players
        .filter((player) => playerIdsInWeek.has(player.id))
        .map((player) => {
          const meta = playerRankMeta.get(player.id)
          const highestRank = meta?.highestRank ?? Number.MAX_SAFE_INTEGER
          const fullName = `${player.firstName} ${player.lastName}`
          return {
            player,
            fullName,
            highestRank,
          }
        })

      const weekSort = weeklyTableSort[group.key] ?? "rank-asc"
      rows.sort((a, b) => {
        if (weekSort === "name-asc") {
          return a.fullName.localeCompare(b.fullName)
        }

        return a.highestRank - b.highestRank || a.fullName.localeCompare(b.fullName)
      })

      return rows
    },
    [playerRankMeta, players, seasonPlayerRanks, weeklyTableSort],
  )

  const matchesSummary = tWithParams("matchesShown", { count: filteredTies.length, total: ties.length })
  const timeFilterLabel = timeFilter === "all" ? t("showAllDates") : t("showUpcomingMatches")
  const teamFilterLabel = teamFilter === "all" ? t("allTeams") : t("showMyTeams")

  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(min-width: 768px)")
    const handleChange = () => {
      if (mediaQuery.matches) {
        setIsMobileFiltersOpen(false)
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  const FilterToggleGroup = ({
    label,
    value,
    onChange,
    options,
    variant,
  }: {
    label: string
    value: string
    onChange: (value: string) => void
    options: { value: string; label: string; disabled?: boolean }[]
    variant: "desktop" | "mobile"
  }) => (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">{label}</p>
      <div className={cn("flex gap-2", variant === "desktop" ? "flex-wrap" : "flex-col")}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={option.disabled}
            aria-pressed={value === option.value}
            className={cn(
              "inline-flex min-h-[2.25rem] items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50",
              variant === "desktop" ? "min-w-[140px]" : "w-full",
              value === option.value
                ? "border-blue-300 bg-blue-500/40 text-white shadow-sm"
                : "border-white/15 text-blue-100 hover:border-blue-200 hover:bg-white/10",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )

  const renderFilterControls = (variant: "desktop" | "mobile") => (
    <div className={cn("gap-6", variant === "desktop" ? "grid md:grid-cols-3" : "space-y-6")}>
      <FilterToggleGroup
        label={t("filterByDate")}
        value={timeFilter}
        onChange={(value) => setTimeFilter(value as "all" | "upcoming")}
        options={[
          { value: "upcoming", label: t("showUpcomingMatches") },
          { value: "all", label: t("showAllDates") },
        ]}
        variant={variant}
      />
      <FilterToggleGroup
        label={t("filterByTeam")}
        value={teamFilter}
        onChange={(value) => setTeamFilter(value as "all" | "my")}
        options={[
          { value: "my", label: t("showMyTeams"), disabled: selectedPlayerId === null },
          { value: "all", label: t("allTeams") },
        ]}
        variant={variant}
      />
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">{t("sortBy")}</p>
        <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
          <SelectTrigger
            className={cn(
              "w-full border-white/20 bg-[#1e2d3d] text-sm text-blue-50 shadow-none transition hover:border-blue-200 focus-visible:border-blue-300 focus-visible:ring-blue-300/40",
              variant === "mobile" ? "h-11" : "h-10",
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#1e2d3d] text-blue-50">
            <SelectItem value="date-asc" className="text-blue-50 focus:bg-blue-500/30 focus:text-white">
              {t("dateAsc")}
            </SelectItem>
            <SelectItem value="date-desc" className="text-blue-50 focus:bg-blue-500/30 focus:text-white">
              {t("dateDesc")}
            </SelectItem>
            <SelectItem value="team" className="text-blue-50 focus:bg-blue-500/30 focus:text-white">
              {t("teamName")}
            </SelectItem>
            <SelectItem value="opponent" className="text-blue-50 focus:bg-blue-500/30 focus:text-white">
              {t("opponentName")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

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
      <main className="mx-auto max-w-7xl px-6 py-8 md:py-12">
        <h1 className="hidden md:block mb-8 text-3xl font-semibold text-white">
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
              <div className="md:ml-2 text-sm opacity-75 md:inline">
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
              </div>
            </div>
          ) : null}
        </div>

        {/* Filters & Sorting Section */}
        <section className="relative mb-12">
          <div className="hidden md:block">
            <div className="rounded-2xl border border-white/10 bg-[#243648]/80 p-6 shadow-lg backdrop-blur">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">{t("filters")}</p>
                    <p className="text-sm text-blue-100">{matchesSummary}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-blue-100">
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{timeFilterLabel}</span>
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{teamFilterLabel}</span>
                  </div>
                </div>
                {renderFilterControls("desktop")}
              </div>
            </div>
          </div>

          <div className="md:hidden">
            <div className="rounded-2xl border border-white/10 bg-[#243648]/80 p-4 shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 text-sm text-blue-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">{t("filters")}</p>
                  <p>{timeFilterLabel}</p>
                  <p>{teamFilterLabel}</p>
                  <p className="text-xs text-blue-200">{matchesSummary}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMobileFiltersOpen(true)}
                  className="border-white/20 bg-white/10 text-blue-100 hover:border-blue-200 hover:bg-white/20"
                >
                  <Filter className="h-4 w-4" />
                  {t("showFilters")}
                </Button>
              </div>
            </div>
          </div>

          <Dialog open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
            <DialogContent className="md:hidden border-white/10 bg-[#1e2a38] text-white shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">{t("filters")}</DialogTitle>
                <DialogDescription className="text-blue-200">{matchesSummary}</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-6">{renderFilterControls("mobile")}</div>
              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="mb-4 w-full bg-blue-600 text-sm font-bold uppercase tracking-wide text-white hover:bg-blue-700"
                >
                  {t("close")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </section>

        <div className="pointer-events-none fixed bottom-6 right-5 z-40 md:hidden">
          <Button
            type="button"
            size="lg"
            onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
            className="pointer-events-auto gap-2 rounded-full bg-blue-500 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-400"
            aria-expanded={isMobileFiltersOpen}
            aria-label={isMobileFiltersOpen ? t("hideFilters") : t("showFilters")}
          >
            {isMobileFiltersOpen ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            {isMobileFiltersOpen ? t("hideFilters") : t("showFilters")}
          </Button>
        </div>

        {/* Game Cards Grid */}
        {weekGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-blue-400/60 bg-[#2c3e50] px-6 py-10 text-center text-sm text-blue-100">
            {t("noTiesFound")}
          </div>
        ) : (
          <div className="space-y-10">
            {weekGroups.map((group) => (
              <section key={group.key} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#34495e] px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/60 bg-[#2c3e50] text-sm font-semibold text-blue-200">
                      {group.weekNumber}
                    </span>
                    <h2 className="text-lg font-semibold text-white">{formatWeekHeading(group)}</h2>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={weeklyTableVisible[group.key] ?? false}
                    onClick={() => void toggleWeeklyTable(group)}
                    className="inline-flex items-center gap-3 rounded-full border border-blue-300/40 bg-[#2c3e50] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue-100 transition hover:border-blue-200 hover:text-white"
                  >
                    <span>{t("weeklyParticipationOverview")}</span>
                    <span
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        weeklyTableVisible[group.key] ? "bg-blue-500" : "bg-blue-950",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          weeklyTableVisible[group.key] ? "translate-x-6" : "translate-x-1",
                        )}
                      />
                    </span>
                  </button>
                </div>

                {!weeklyTableVisible[group.key] && (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {group.ties.map((tie) => {
                      const participation = getPlayerParticipation(tie.id)
                      const status = participation?.status || null
                      const canParticipate = isPlayerOnTeam(tie.teamId)
                      const confirmLabel = status === "confirmed" ? t("confirmedStatusButton") : t("confirm")
                      const declineLabel = status === "declined" ? t("declinedStatusButton") : t("decline")

                      return (
                        <div
                          key={tie.id}
                          className="rounded-lg bg-[#4a5f7a] p-6 shadow-lg min-w-[220px] md:min-w-[260px]"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-blue-200 overflow-hidden">
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="inline-flex items-center justify-center rounded-full border border-blue-400/60 bg-[#2c3e50] px-3 py-1 text-[11px] font-semibold">
                                {formatWeekday(tie.tieDate)}
                              </span>
                            </div>
                            {/* Lineup badges moved next to weekday badge (right-aligned) and slightly smaller. Ensure they don't overflow the card. */}
                            {tie.isLineupReady && (
                              <div className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 ml-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                                  {t("lineupComplete")}
                                </span>
                                {participation?.isInLineup && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                                    {t("yourAreInLineup")}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <h3 className="mb-3 text-xl font-semibold text-white">
                            {tie.teamName} {t("vs")} {tie.opponent}
                          </h3>

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
                                {tie.confirmedCount} {t("participants")}, {tie.maybeCount} {t("undecided")},{" "}
                                {tie.declinedCount} {t("declines")}
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
                                {confirmLabel}
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
                                {declineLabel}
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
                )}

                {weeklyTableVisible[group.key] && (
                  <div className="rounded-xl border border-white/15 bg-[#223244] p-4 shadow-lg">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-white">{t("weeklyParticipationOverview")}</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setWeeklyTableSort((prev) => ({ ...prev, [group.key]: "rank-asc" }))}
                          className={cn(
                            "border-white/20 bg-transparent text-blue-100 hover:bg-white/10",
                            (weeklyTableSort[group.key] ?? "rank-asc") === "rank-asc" &&
                              "border-blue-300 bg-blue-500/30 text-white",
                          )}
                        >
                          {t("sortByRank")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setWeeklyTableSort((prev) => ({ ...prev, [group.key]: "name-asc" }))}
                          className={cn(
                            "border-white/20 bg-transparent text-blue-100 hover:bg-white/10",
                            (weeklyTableSort[group.key] ?? "rank-asc") === "name-asc" &&
                              "border-blue-300 bg-blue-500/30 text-white",
                          )}
                        >
                          {t("sortByPlayerName")}
                        </Button>
                      </div>
                    </div>

                    {weeklyTableLoading[group.key] && (
                      <div className="mb-3 inline-flex items-center gap-2 rounded bg-blue-900/40 px-3 py-2 text-xs text-blue-100">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("loadingWeeklyOverview")}
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse text-sm text-blue-50">
                        <thead>
                          <tr className="border-b border-white/15 bg-[#1e2d3d]">
                            <th className="sticky left-0 z-10 min-w-[210px] bg-[#1e2d3d] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
                              {t("player")}
                            </th>
                            {group.ties.map((tie) => {
                              const isTieLoading = weeklyTieLoading[group.key]?.[tie.id]
                              return (
                                <th key={tie.id} className="min-w-[185px] px-3 py-2 text-left align-top">
                                  <div className="space-y-1">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-200">
                                      {formatDate(tie.tieDate)}
                                    </div>
                                    <div className="text-sm font-medium text-white">
                                      {tie.teamName} {t("vs")} {tie.opponent}
                                    </div>
                                    {isTieLoading && (
                                      <div className="inline-flex items-center gap-1 text-xs text-blue-200">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        {t("loading")}
                                      </div>
                                    )}
                                  </div>
                                </th>
                              )
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {getWeeklyTableRows(group).map(({ player, fullName, highestRank }) => {
                            const rankLabel = Number.isFinite(highestRank)
                              ? tWithParams("highestRankLabel", { rank: highestRank })
                              : t("rankUnknown")

                            return (
                              <tr key={player.id} className="border-b border-white/10 last:border-b-0 hover:bg-white/5">
                                <td className="sticky left-0 z-10 bg-[#223244] px-3 py-2 align-top">
                                  <div className="font-medium text-white" title={getPlayerRankTooltip(player.id)}>
                                    <span className="mr-2 inline-flex rounded-full border border-blue-300/40 bg-[#1a2634] px-2 py-0.5 text-xs text-blue-100">
                                      {rankLabel}
                                    </span>
                                    <span>{fullName}</span>
                                  </div>
                                </td>

                                {group.ties.map((tie) => {
                                  const isTieLoading = weeklyTieLoading[group.key]?.[tie.id]
                                  const tieParticipations = weeklyParticipations[group.key]?.[tie.id] ?? []
                                  const participation = tieParticipations.find((item) => item.playerId === player.id)
                                  const hasComment = Boolean(participation?.comment)

                                  return (
                                    <td key={tie.id} className="px-3 py-2 text-center">
                                      {isTieLoading && tieParticipations.length === 0 ? (
                                        <span className="inline-flex items-center gap-1 text-xs text-blue-200">
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          {t("loading")}
                                        </span>
                                      ) : participation?.status === "confirmed" ? (
                                        <span className="inline-flex items-center gap-1">
                                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                                            <Check className="h-3 w-3" />
                                            {t("yes")}
                                          </span>
                                          {hasComment && (
                                            <span
                                              title={participation?.comment ?? undefined}
                                              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-300/50 bg-blue-900/60 text-blue-100"
                                            >
                                              <MessageSquare className="h-3 w-3" />
                                            </span>
                                          )}
                                        </span>
                                      ) : participation?.status === "maybe" ? (
                                        <span className="inline-flex items-center gap-1">
                                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                                            {t("maybe")}
                                          </span>
                                          {hasComment && (
                                            <span
                                              title={participation?.comment ?? undefined}
                                              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-300/50 bg-blue-900/60 text-blue-100"
                                            >
                                              <MessageSquare className="h-3 w-3" />
                                            </span>
                                          )}
                                        </span>
                                      ) : participation?.status === "declined" ? (
                                        <span className="inline-flex items-center gap-1">
                                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                                            {t("no")}
                                          </span>
                                          {hasComment && (
                                            <span
                                              title={participation?.comment ?? undefined}
                                              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-300/50 bg-blue-900/60 text-blue-100"
                                            >
                                              <MessageSquare className="h-3 w-3" />
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-blue-200">-</span>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Tie Details Dialog */}
      {selectedTie && (
        <TieDetailsDialog tie={selectedTie} open={showDetailsDialog} onOpenChange={handleDetailsDialogChange} />
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
