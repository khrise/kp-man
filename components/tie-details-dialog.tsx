import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, MapPin, Users, CheckCircle, HelpCircle, XCircle } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

type Player = {
  id: string
  first_name: string
  last_name: string
  email: string
}

type Participation = {
  id: string
  tie_id: string
  player_id: string
  status: "confirmed" | "maybe" | "declined"
  player: Player
}

type TieWithDetails = {
  id: string
  team_id: string
  opponent: string
  date_time: string
  location: string
  is_home: boolean
  team_name: string
  participations: Participation[]
  confirmedCount: number
  maybeCount: number
  declinedCount: number
}

interface TieDetailsDialogProps {
  tie: TieWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TieDetailsDialog({ tie, open, onOpenChange }: TieDetailsDialogProps) {
  const { t } = useTranslation()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
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

  const confirmedPlayers = tie.participations.filter((p) => p.status === "confirmed")
  const maybePlayers = tie.participations.filter((p) => p.status === "maybe")
  const declinedPlayers = tie.participations.filter((p) => p.status === "declined")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {tie.team_name} {t("vs")} {tie.opponent}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Match Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar className="h-5 w-5" />
              <span>
                {formatDate(tie.date_time)} um {formatTime(tie.date_time)}
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
          <div className="space-y-4">
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
                    <div key={p.id} className="rounded bg-green-50 px-3 py-2 text-sm text-gray-700">
                      {p.player.first_name} {p.player.last_name}
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
                    <div key={p.id} className="rounded bg-yellow-50 px-3 py-2 text-sm text-gray-700">
                      {p.player.first_name} {p.player.last_name}
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
                    <div key={p.id} className="rounded bg-red-50 px-3 py-2 text-sm text-gray-700">
                      {p.player.first_name} {p.player.last_name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tie.participations.length === 0 && <p className="text-center text-sm text-gray-500">{t("noResponses")}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
