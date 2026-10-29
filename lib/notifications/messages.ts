import type { NotificationMessage } from "./types"

type Status = "confirmed" | "maybe" | "declined"

const STATUS_LABELS: Record<Status, string> = {
  confirmed: "Zugesagt",
  maybe: "Vielleicht",
  declined: "Abgesagt",
}

export interface ParticipationChangeInfo {
  playerName: string
  teamName: string
  opponent: string
  tieDate: Date
  previousStatus: Status | null
  status: Status
  comment: string | null
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(date)
}

export function buildParticipationMessage(info: ParticipationChangeInfo): NotificationMessage {
  const change = info.previousStatus
    ? `${STATUS_LABELS[info.previousStatus]} → ${STATUS_LABELS[info.status]}`
    : STATUS_LABELS[info.status]
  const lines = [
    `${info.playerName}: ${change}`,
    `${info.teamName} vs. ${info.opponent}`,
    formatDate(info.tieDate),
  ]
  if (info.comment) lines.push(`Kommentar: ${info.comment}`)

  return { title: `Teilnahme geändert (${info.teamName})`, body: lines.join("\n") }
}

export function buildTestMessage(): NotificationMessage {
  return {
    title: "[TEST] Spieltage-Planer",
    body: "Dies ist eine Testbenachrichtigung. Die Einrichtung funktioniert.",
  }
}
