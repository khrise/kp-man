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
