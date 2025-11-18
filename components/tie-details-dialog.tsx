"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, MapPin, Users, CheckCircle, HelpCircle, XCircle } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import type { TieWithDetails } from "@/app/ties/spieltage-client"
import { useEffect, useState } from "react"
import { getParticipationsForTie } from "@/app/actions/public"
import { ParticipationWithPlayer } from "@/lib/db"

interface TieDetailsDialogProps {
  tie: TieWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TieDetailsDialog({ tie, open, onOpenChange }: TieDetailsDialogProps) {
  const { t } = useTranslation()
  const [participationsLoading, setParticipationsLoading] = useState(true)
  const [participations, setParticipations] = useState<ParticipationWithPlayer[]>([])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  useEffect(() => {
    async function fetchParticipations() {
      setParticipationsLoading(true)
      const [participations] = await Promise.all([getParticipationsForTie(String(tie.id))])
      setParticipations(participations)
      setParticipationsLoading(false)
    }
    fetchParticipations()
  }, [tie.id])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const sortPlayersByRank = (list: ParticipationWithPlayer[]) => {
    return [...list].sort((a, b) => {
      const rankA = typeof a.playerRank === "number" ? a.playerRank : Number.POSITIVE_INFINITY
      const rankB = typeof b.playerRank === "number" ? b.playerRank : Number.POSITIVE_INFINITY

      if (rankA !== rankB) {
        return rankA - rankB
      }

      const lastNameCompare = a.lastName.localeCompare(b.lastName)
      if (lastNameCompare !== 0) {
        return lastNameCompare
      }

      return a.firstName.localeCompare(b.firstName)
    })
  }

  const confirmedPlayers = sortPlayersByRank(participations.filter((p) => p.status === "confirmed"))
  const maybePlayers = sortPlayersByRank(participations.filter((p) => p.status === "maybe"))
  const declinedPlayers = sortPlayersByRank(participations.filter((p) => p.status === "declined"))

  // lineupPlayers removed — we show lineup membership inline with a badge per player instead of a separate list
  const lineupFinalized = tie.isLineupReady === true

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {tie.teamName} {t("vs")} {tie.opponent}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Match Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar className="h-5 w-5" />
              <span>
                {formatDate(tie.tieDate)} um {formatTime(tie.tieDate)}
              </span>
            </div>

            <div className="flex items-center gap-3 text-gray-700">
              <MapPin className="h-5 w-5" />
              <span>{tie.location}</span>
            </div>

            <div className="flex items-center gap-3 text-gray-700">
              <Users className="h-5 w-5" />
              <span>
                {tie.confirmedCount} {t("confirmed").toLowerCase()}, {tie.maybeCount} {t("undecided")},{" "}
                {tie.declinedCount} {t("declined").toLowerCase()}
              </span>
            </div>
          </div>

          {/* Participation Lists */}
          {participationsLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Instead of a separate lineup list, show a small badge next to the player name when selected for the lineup. */}
              {/* Confirmed */}
              {confirmedPlayers.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">
                      {t("confirmed")} ({confirmedPlayers.length})
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {confirmedPlayers.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 rounded bg-green-50 px-3 py-2 text-sm text-gray-700"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate">
                              {p.firstName} {p.lastName} ({p.playerRank})
                            </span>
                            {p.comment && (
                              <span className="max-w-32 truncate text-xs text-gray-500 italic" title={p.comment}>
                                &quot;{p.comment}&quot;
                              </span>
                            )}
                          </div>
                        </div>
                        {lineupFinalized && p.isInLineup && (
                          <span className="ml-2 inline-flex flex-shrink-0 items-center rounded-full bg-blue-600 text-white text-[10px] px-2 py-0.5">
                            {t("inLineup")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Maybe */}
              {maybePlayers.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-semibold text-gray-900">
                      {t("maybe")} ({maybePlayers.length})
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {maybePlayers.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 rounded bg-yellow-50 px-3 py-2 text-sm text-gray-700"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate">
                              {p.firstName} {p.lastName} ({p.playerRank})
                            </span>
                            {p.comment && (
                              <span className="max-w-32 truncate text-xs text-gray-500 italic" title={p.comment}>
                                &quot;{p.comment}&quot;
                              </span>
                            )}
                          </div>
                        </div>
                        {lineupFinalized && p.isInLineup && (
                          <span className="ml-2 inline-flex flex-shrink-0 items-center rounded-full bg-blue-600 text-white text-[10px] px-2 py-0.5">
                            {t("inLineup")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Declined */}
              {declinedPlayers.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-gray-900">
                      {t("declined")} ({declinedPlayers.length})
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {declinedPlayers.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 rounded bg-red-50 px-3 py-2 text-sm text-gray-700"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate">
                              {p.firstName} {p.lastName} ({p.playerRank})
                            </span>
                            {p.comment && (
                              <span className="max-w-32 truncate text-xs text-gray-500 italic" title={p.comment}>
                                &quot;{p.comment}&quot;
                              </span>
                            )}
                          </div>
                        </div>
                        {lineupFinalized && p.isInLineup && (
                          <span className="ml-2 inline-flex flex-shrink-0 items-center rounded-full bg-blue-600 text-white text-[10px] px-2 py-0.5">
                            {t("inLineup")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {participations.length === 0 && <p className="text-center text-sm text-gray-500">{t("noResponses")}</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
