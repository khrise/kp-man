import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { endOfISOWeek, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ISOWeekInfo {
  weekNumber: number
  year: number
  startOfWeek: Date
  endOfWeek: Date
}

export function getISOWeekInfo(date: Date): ISOWeekInfo {
  const reference = new Date(date)
  const weekNumber = getISOWeek(reference)
  const year = getISOWeekYear(reference)

  return {
    weekNumber,
    year,
    startOfWeek: startOfISOWeek(reference),
    endOfWeek: endOfISOWeek(reference),
  }
}

export function getISOWeekKey(date: Date): string {
  const { year, weekNumber } = getISOWeekInfo(date)
  return `${year}-W${String(weekNumber).padStart(2, "0")}`
}

// Friday to Sunday of the same ISO week count as one weekend.
function isWeekendTieDay(date: Date): boolean {
  const dayOfWeek = date.getDay()
  return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0
}

export function getWeekendParticipationConflicts(
  ties: readonly {
    id: number
    tieDate: Date
    participations?: readonly { playerId: number; status: "confirmed" | "maybe" | "declined" }[]
  }[],
): Map<number, number[]> {
  const tieIdsByWeekAndPlayer = new Map<string, Map<number, Set<number>>>()

  for (const tie of ties) {
    if (!isWeekendTieDay(tie.tieDate)) continue

    const weekKey = getISOWeekKey(tie.tieDate)
    let tieIdsByPlayer = tieIdsByWeekAndPlayer.get(weekKey)
    if (!tieIdsByPlayer) {
      tieIdsByPlayer = new Map()
      tieIdsByWeekAndPlayer.set(weekKey, tieIdsByPlayer)
    }

    for (const participation of tie.participations ?? []) {
      if (participation.status === "declined") continue

      let tieIds = tieIdsByPlayer.get(participation.playerId)
      if (!tieIds) {
        tieIds = new Set()
        tieIdsByPlayer.set(participation.playerId, tieIds)
      }
      tieIds.add(tie.id)
    }
  }

  const conflictsByTie = new Map<number, Set<number>>()

  for (const tie of ties) {
    if (!isWeekendTieDay(tie.tieDate)) continue

    const tieIdsByPlayer = tieIdsByWeekAndPlayer.get(getISOWeekKey(tie.tieDate))
    for (const participation of tie.participations ?? []) {
      if (participation.status === "declined") continue
      if ((tieIdsByPlayer?.get(participation.playerId)?.size ?? 0) < 2) continue

      let conflictingPlayerIds = conflictsByTie.get(tie.id)
      if (!conflictingPlayerIds) {
        conflictingPlayerIds = new Set()
        conflictsByTie.set(tie.id, conflictingPlayerIds)
      }
      conflictingPlayerIds.add(participation.playerId)
    }
  }

  return new Map(
    Array.from(conflictsByTie, ([tieId, playerIds]) => [tieId, Array.from(playerIds).sort((a, b) => a - b)]),
  )
}
