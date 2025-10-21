/**
 * Application Configuration
 *
 * This file provides default configuration values and types for the application.
 * Values can be overridden at runtime through database settings.
 */

export interface AppConfig {
  clubName: string
  supportEmail: string
}

export const defaultConfig: AppConfig = {
  clubName: process.env.SPORTS_CLUB_NAME || "Sports Club",
  supportEmail: process.env.SUPPORT_EMAIL || "support@example.com",
}

// Type for database settings
export interface AppSetting {
  id: number
  key: string
  value: string
  type: "string" | "boolean" | "number" | "json"
  description: string | null
  createdAt: Date
  updatedAt: Date
}
