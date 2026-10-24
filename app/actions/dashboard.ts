"use server"

import { getDashboardStats } from "@/lib/db"
import { requireManagement } from "@/lib/server/auth"

export async function fetchDashboardStats() {
  const { teamIds } = await requireManagement()
  try {
    const stats = await getDashboardStats(teamIds)
    return { success: true, data: stats }
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error)
    return {
      success: false,
      error: "Failed to fetch dashboard statistics",
    }
  }
}
