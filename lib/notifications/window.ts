import type { WindowMode } from "./types"

const DAY_MS = 24 * 60 * 60 * 1000

const DAYS_BY_MODE: Partial<Record<WindowMode, number>> = {
  days_7: 7,
  days_14: 14,
  days_30: 30,
}

/**
 * Decides whether a change should notify, based on the captain's window preset.
 * Past ties never notify. `isNextTie` is only used for the `next_tie` preset.
 */
export function isWithinWindow(mode: WindowMode, tieDate: Date, now: Date, isNextTie: boolean): boolean {
  if (tieDate.getTime() < now.getTime()) return false

  switch (mode) {
    case "all":
      return true
    case "next_tie":
      return isNextTie
    default: {
      const days = DAYS_BY_MODE[mode]
      return days !== undefined && tieDate.getTime() - now.getTime() <= days * DAY_MS
    }
  }
}
