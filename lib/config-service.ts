import { defaultConfig, type AppConfig } from "./config"
import { getAllAppSettings } from "./db"

/**
 * Configuration Service
 *
 * Manages application configuration by merging default values
 * with database-stored settings for runtime customization.
 */

let cachedConfig: AppConfig | null = null
let lastCacheTime = 0
// Shorter cache in development, longer in production
const CACHE_DURATION = process.env.NODE_ENV === "development" ? 30 * 1000 : 5 * 60 * 1000 // 30s in dev, 5min in prod

/**
 * Gets the current application configuration
 * Merges default config with database settings
 */
export async function getAppConfig(skipCache = false): Promise<AppConfig> {
  const now = Date.now()

  // Return cached config if it's still fresh and we're not skipping cache
  if (!skipCache && cachedConfig && now - lastCacheTime < CACHE_DURATION) {
    return cachedConfig
  }

  try {
    // Get all settings from database
    const dbSettings = await getAllAppSettings()

    // Convert database settings to a map for easy lookup
    const settingsMap = new Map(
      dbSettings.map((setting) => [setting.key, parseSettingValue(setting.value, setting.type)]),
    )

    // Merge with default config
    const config: AppConfig = {
      clubName: (settingsMap.get("clubName") as string) || defaultConfig.clubName,
      supportEmail: (settingsMap.get("supportEmail") as string) || defaultConfig.supportEmail,
    }

    // Cache the result
    cachedConfig = config
    lastCacheTime = now

    return config
  } catch (error) {
    console.error("Failed to load app configuration from database, using defaults:", error)
    return defaultConfig
  }
}

/**
 * Parses a setting value based on its type
 */
function parseSettingValue(value: string, type: string): unknown {
  switch (type) {
    case "boolean":
      return value === "true"
    case "number":
      return parseFloat(value)
    case "json":
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    case "string":
    default:
      return value
  }
}

/**
 * Clears the configuration cache
 * Call this after updating settings to force a refresh
 */
export function clearConfigCache(): void {
  cachedConfig = null
  lastCacheTime = 0
}

/**
 * Gets a specific configuration value with fallback
 */
export async function getConfigValue<K extends keyof AppConfig>(
  key: K,
  fallback?: AppConfig[K],
): Promise<AppConfig[K]> {
  const config = await getAppConfig()
  return config[key] ?? fallback ?? defaultConfig[key]
}

/**
 * Forces a fresh config reload from database
 * Useful after updating settings
 */
export async function refreshConfig(): Promise<AppConfig> {
  clearConfigCache()
  return getAppConfig(true)
}
