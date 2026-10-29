import * as db from "@/lib/db"
import { notificationsEnabled } from "./guard"
import { buildParticipationMessage } from "./messages"
import { getProvider } from "./registry"
import { isWindowMode, DEFAULT_WINDOW_MODE, type NotificationMessage } from "./types"
import { isWithinWindow } from "./window"

type UpsertInput = Parameters<typeof db.upsertParticipation>[0]

/**
 * Sends one message through a channel. Unless `force` is set (test button),
 * nothing is sent on non-production deployments.
 */
export async function sendNotification(params: {
  channel: string
  target: string
  message: NotificationMessage
  force?: boolean
}): Promise<boolean> {
  if (!params.force && !notificationsEnabled()) {
    console.log(`[NOTIFICATIONS] Skipped (disabled on this deployment) channel=${params.channel}`)
    return false
  }

  const provider = getProvider(params.channel)
  if (!provider) {
    throw new Error(`Unknown notification channel: ${params.channel}`)
  }

  await provider.send(params.target, params.message)
  return true
}

const normalizeComment = (comment: string | null | undefined) => (comment ?? "").trim()

export async function notifyParticipationChange(
  previous: db.Participation | undefined,
  current: db.Participation,
  now: Date = new Date(),
): Promise<void> {
  if (previous && previous.status === current.status && normalizeComment(previous.comment) === normalizeComment(current.comment)) {
    return
  }

  if (!notificationsEnabled()) {
    console.log("[NOTIFICATIONS] Skipped participation change (disabled on this deployment)")
    return
  }

  const { tie, player } = await db.getParticipationNotificationContext(current.tieId, current.playerId)
  if (!tie || !player) return

  const recipients = (await db.getCaptainRecipientsForTeam(tie.teamId)).filter(
    // the captain who changed their own participation does not need to be told
    (r) => r.playerId === null || r.playerId !== current.playerId,
  )
  if (recipients.length === 0) return

  const message = buildParticipationMessage({
    playerName: `${player.firstName} ${player.lastName}`,
    teamName: tie.teamName,
    opponent: tie.opponent,
    tieDate: new Date(tie.tieDate),
    previousStatus: previous?.status ?? null,
    status: current.status,
    comment: current.comment,
  })

  const nextTieId = recipients.some((r) => r.windowMode === "next_tie")
    ? await db.getNextUpcomingTieId(tie.teamId, now)
    : undefined

  await Promise.all(
    recipients.map(async (recipient) => {
      const mode = isWindowMode(recipient.windowMode) ? recipient.windowMode : DEFAULT_WINDOW_MODE
      if (!isWithinWindow(mode, new Date(tie.tieDate), now, nextTieId === tie.id)) return

      try {
        await sendNotification({ channel: recipient.channel, target: recipient.target, message })
      } catch (error) {
        console.error(
          `[NOTIFICATIONS] Failed to notify user ${recipient.userId} via ${recipient.channel}:`,
          error instanceof Error ? error.message : "unknown error",
        )
      }
    }),
  )
}

/** Single write path for participations: stores the response and notifies captains on changes. */
export async function upsertParticipationAndNotify(data: UpsertInput): Promise<db.Participation> {
  const previous = await db.getParticipationByTieAndPlayer(data.tieId, data.playerId)
  const current = await db.upsertParticipation(data)

  try {
    await notifyParticipationChange(previous, current)
  } catch (error) {
    console.error("[NOTIFICATIONS] Failed to process participation change:", error instanceof Error ? error.message : error)
  }

  return current
}
