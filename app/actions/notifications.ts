"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/next-auth"
import * as db from "@/lib/db"
import { sendNotification } from "@/lib/notifications/dispatcher"
import { buildTestMessage } from "@/lib/notifications/messages"
import { getChannels } from "@/lib/notifications/registry"
import { DEFAULT_WINDOW_MODE, isWindowMode } from "@/lib/notifications/types"

export interface NotificationSettingDto {
  channel: string
  enabled: boolean
  target: string
  windowMode: string
}

// Preferences always belong to the logged-in team captain; no user id is accepted from the client
async function requireCaptain() {
  const session = await auth()
  const userId = Number(session?.user?.id)
  if (!session?.user || Number.isNaN(userId)) {
    throw new Error("Not authenticated")
  }

  const user = await db.getUserById(userId)
  if (!user || user.role !== "team_captain") {
    throw new Error("Only team captains can manage notification preferences")
  }
  return user
}

export async function getMyNotificationSettingsAction(): Promise<NotificationSettingDto[]> {
  const user = await requireCaptain()
  const stored = await db.getNotificationSettings(user.id)

  return getChannels().map((channel) => {
    const existing = stored.find((s) => s.channel === channel)
    return {
      channel,
      enabled: existing?.enabled ?? false,
      target: existing?.target ?? "",
      windowMode: existing?.windowMode ?? DEFAULT_WINDOW_MODE,
    }
  })
}

export async function saveMyNotificationSettingAction(setting: NotificationSettingDto) {
  const user = await requireCaptain()

  if (!getChannels().includes(setting.channel)) {
    throw new Error("Unknown notification channel")
  }
  if (!isWindowMode(setting.windowMode)) {
    throw new Error("Invalid time window")
  }
  const target = setting.target.trim()
  if (setting.enabled && !target) {
    throw new Error("A target is required to enable notifications")
  }

  await db.upsertNotificationSetting({
    userId: user.id,
    channel: setting.channel,
    enabled: setting.enabled,
    target,
    windowMode: setting.windowMode,
  })
  revalidatePath("/admin/profile")
  return { success: true }
}

// Test messages bypass the production guard so channels can be verified on any environment
export async function sendTestNotificationAction(channel: string, target: string) {
  await requireCaptain()

  try {
    await sendNotification({ channel, target: target.trim(), message: buildTestMessage(), force: true })
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Sending failed" }
  }
}
