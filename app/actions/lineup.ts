"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"
import { requirePermission, requireTeamPermission } from "@/lib/server/auth"
import { Permission } from "@/lib/permissions"
import { getWeekendParticipationConflicts } from "@/lib/utils"

export async function toggleLineupAction(participationId: string, tieId: string) {
  await requirePermission(Permission.LineupManage)
  const participationIdNum = Number(participationId)
  const tieIdNum = Number(tieId)

  if (Number.isNaN(participationIdNum) || Number.isNaN(tieIdNum)) {
    throw new Error("Invalid participation or tie ID")
  }

  const tie = await db.getTieById(tieIdNum)
  if (!tie) throw new Error("Tie not found")
  await requireTeamPermission(tie.teamId, Permission.LineupManage)

  // Get current participation
  const participation = await db.getParticipationById(participationIdNum)
  if (!participation) {
    throw new Error("Participation not found")
  }
  if (participation.tieId !== tieIdNum) throw new Error("Participation does not belong to tie")

  // Only confirmed players can be in lineup
  if (participation.status !== "confirmed") {
    throw new Error("Only confirmed players can be added to lineup")
  }

  // If the lineup is finalized, do not allow toggling lineup membership
  if (tie.isLineupReady) {
    throw new Error("Cannot modify lineup: lineup has been finalized")
  }

  // Toggle lineup status
  await db.updateParticipationLineup(participationIdNum, !participation.isInLineup)

  revalidatePath(`/admin/ties/${tieId}/lineup`)
  return { success: true }
}

export async function markTieReadyAction(tieId: string, ready: boolean) {
  // Server Actions accept arbitrary client input; a truthy string like "false" must not select the weaker permission
  if (typeof ready !== "boolean") {
    throw new Error("Invalid ready flag")
  }
  await requirePermission(ready ? Permission.LineupManage : Permission.LineupReopen)
  const tieIdNum = Number(tieId)
  if (Number.isNaN(tieIdNum)) {
    throw new Error("Invalid tie ID")
  }

  const tie = await db.getTieById(tieIdNum)
  if (!tie) throw new Error("Tie not found")
  await requireTeamPermission(tie.teamId, ready ? Permission.LineupManage : Permission.LineupReopen)

  await db.updateTieReady(tieIdNum, ready)

  revalidatePath(`/admin/ties/${tieId}/lineup`)
  return { success: true }
}

export async function setManagedParticipationStatusAction(
  tieId: string,
  playerId: string,
  status: "confirmed" | "maybe" | "declined",
) {
  const tieIdNum = Number(tieId)
  const playerIdNum = Number(playerId)
  if (!Number.isSafeInteger(tieIdNum) || tieIdNum <= 0 || !Number.isSafeInteger(playerIdNum) || playerIdNum <= 0) {
    throw new Error("Invalid tie or player ID")
  }
  if (!["confirmed", "maybe", "declined"].includes(status)) {
    throw new Error("Invalid participation status")
  }

  await requirePermission(Permission.LineupManage)
  const tie = await db.getTieById(tieIdNum)
  if (!tie) throw new Error("Tie not found")
  const user = await requireTeamPermission(tie.teamId, Permission.LineupManage)
  await db.setManagedParticipationStatus(tieIdNum, playerIdNum, status, user.username)

  revalidatePath(`/admin/ties/${tieId}/lineup`)
  revalidatePath("/spieltage")
  return { success: true }
}

export async function saveParticipationCaptainCommentAction(
  tieId: string,
  playerId: string,
  comment: string,
  status: "confirmed" | "maybe" | "declined" | "no_response" | null = null,
) {
  const tieIdNum = Number(tieId)
  const playerIdNum = Number(playerId)
  if (!Number.isSafeInteger(tieIdNum) || tieIdNum <= 0 || !Number.isSafeInteger(playerIdNum) || playerIdNum <= 0) {
    throw new Error("Invalid tie or player ID")
  }
  if (typeof comment !== "string" || comment.length > 1000) throw new Error("Comment must be 1000 characters or fewer")
  if (status !== null && !["confirmed", "maybe", "declined", "no_response"].includes(status)) {
    throw new Error("Invalid participation status")
  }

  await requirePermission(Permission.LineupManage)
  const tie = await db.getTieById(tieIdNum)
  if (!tie) throw new Error("Tie not found")
  const user = await requireTeamPermission(tie.teamId, Permission.LineupManage)
  await db.updateParticipationCaptainComment(tieIdNum, playerIdNum, comment.trim() || null, user.id, user.username, status)
  revalidatePath("/admin/ties")
  revalidatePath(`/admin/ties/${tieId}/lineup`)
  revalidatePath("/spieltage")
  return { success: true }
}

export async function saveTieCaptainCommentAction(tieId: string, comment: string) {
  const tieIdNum = Number(tieId)
  if (!Number.isSafeInteger(tieIdNum) || tieIdNum <= 0) throw new Error("Invalid tie ID")
  if (typeof comment !== "string" || comment.length > 1000) throw new Error("Comment must be 1000 characters or fewer")

  await requirePermission(Permission.LineupManage)
  const tie = await db.getTieById(tieIdNum)
  if (!tie) throw new Error("Tie not found")
  const user = await requireTeamPermission(tie.teamId, Permission.LineupManage)
  await db.updateTieCaptainComment(tieIdNum, comment.trim() || null, user.id, user.username)

  revalidatePath("/admin/ties")
  revalidatePath(`/admin/ties/${tieId}/lineup`)
  revalidatePath("/spieltage")
  return { success: true }
}

export async function getLineupData(tieId: string) {
  await requirePermission(Permission.LineupManage)
  const tieIdNum = Number(tieId)
  if (Number.isNaN(tieIdNum)) {
    throw new Error("Invalid tie ID")
  }

  const authorizedTie = await db.getTieById(tieIdNum)
  if (!authorizedTie) throw new Error("Tie not found")
  await requireTeamPermission(authorizedTie.teamId, Permission.LineupManage)
  const tie = await db.getTieWithParticipations(tieIdNum)
  if (!tie) {
    throw new Error("Tie not found")
  }

  const team = await db.getTeamById(tie.teamId)
  if (!team) {
    throw new Error("Team not found")
  }

  const seasonTies = await db.getTiesBySeasonId(team.seasonId)
  const weekendConflictPlayerIds = getWeekendParticipationConflicts(seasonTies).get(tieIdNum) ?? []

  // Get players without any participation response
  const playersWithoutParticipation = await db.getPlayersWithoutParticipation(tieIdNum)

  // Separate players by lineup status first, then by participation status
  const lineupPlayers = tie.participations.filter((p) => p.isInLineup)
  const nonLineupParticipations = tie.participations.filter((p) => !p.isInLineup)

  // From non-lineup players, separate confirmed (available) from others
  const availablePlayers = nonLineupParticipations.filter((p) => p.status === "confirmed")
  const otherParticipations = nonLineupParticipations.filter((p) => p.status !== "confirmed")

  // Load the first page of RSVP audit entries server-side; older pages are
  // fetched on demand via loadMoreAuditEntriesAction.
  const { entries: auditEntries, hasMore: auditHasMore } = await loadAuditPage(tieIdNum)

  return {
    tie,
    team,
    weekendConflictPlayerIds,
    lineupPlayers,
    availablePlayers,
    otherParticipations,
    playersWithoutParticipation,
    lineupCount: lineupPlayers.length,
    teamSize: team.teamSize,
    auditEntries,
    auditHasMore,
    auditPageSize: AUDIT_PAGE_SIZE,
  }
}

export async function loadMoreAuditEntriesAction(tieId: string, offset: number) {
  await requirePermission(Permission.AuditRead)
  const tieIdNum = Number(tieId)
  if (Number.isNaN(tieIdNum) || !Number.isInteger(offset) || offset < 0) {
    throw new Error("Invalid tie ID or offset")
  }

  const tie = await db.getTieById(tieIdNum)
  if (!tie) throw new Error("Tie not found")
  await requireTeamPermission(tie.teamId, Permission.AuditRead)

  return loadAuditPage(tieIdNum, offset)
}

const AUDIT_PAGE_SIZE = 100

async function loadAuditPage(tieId: number, offset = 0) {
  // Fetch one extra row to determine whether older entries exist.
  const rows = await db.getParticipationAuditForTie(tieId, AUDIT_PAGE_SIZE + 1, offset)
  const hasMore = rows.length > AUDIT_PAGE_SIZE
  const entries = rows.slice(0, AUDIT_PAGE_SIZE).map((r) => ({
    ...r,
    // Ensure createdAt is serializable for client components
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  }))

  return { entries, hasMore }
}
