"use server"

import { revalidatePath } from "next/cache"
import { getAllAppSettings, getAppSetting, setAppSetting, deleteAppSetting, type AppSetting } from "@/lib/db"
import { refreshConfig } from "@/lib/config-service"

export async function getSettings(): Promise<AppSetting[]> {
  return getAllAppSettings()
}

export async function getSetting(key: string): Promise<AppSetting | null> {
  const setting = await getAppSetting(key)
  return setting || null
}

export async function updateSetting(
  key: string,
  value: string,
  type: AppSetting["type"] = "string",
  description?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await setAppSetting(key, value, type, description)

    // Force refresh config and revalidate pages
    await refreshConfig()
    revalidatePath("/", "layout") // Revalidate all pages since layout uses config
    revalidatePath("/") // Also revalidate the root path
    revalidatePath("/admin") // And admin pages

    return { success: true }
  } catch (error) {
    console.error("Failed to update setting:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function removeSetting(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteAppSetting(key)

    // Force refresh config and revalidate
    await refreshConfig()
    revalidatePath("/", "layout")
    revalidatePath("/")
    revalidatePath("/admin")

    return { success: true }
  } catch (error) {
    console.error("Failed to delete setting:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
