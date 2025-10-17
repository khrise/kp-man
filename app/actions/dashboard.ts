"use server"

import { getDashboardStats } from "@/lib/db"

export async function fetchDashboardStats() {
  try {
    const stats = await getDashboardStats()
    return { success: true, data: stats }
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error)
    return {
      success: false,
      error: "Failed to fetch dashboard statistics",
    }
  }
}
