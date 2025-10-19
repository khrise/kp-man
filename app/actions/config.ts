"use server"

import { getConfigValue } from "@/lib/config-service"

export async function getClubName(): Promise<string> {
  return getConfigValue("clubName")
}
