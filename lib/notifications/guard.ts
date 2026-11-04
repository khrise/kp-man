export type GuardReason = "override_true" | "override_false" | "production" | "not_production"

export interface NotificationStatus {
  enabled: boolean
  reason: GuardReason
  pushoverConfigured: boolean
}

function evaluate(env: NodeJS.ProcessEnv): { enabled: boolean; reason: GuardReason } {
  const override = env.NOTIFICATIONS_ENABLED?.trim().toLowerCase()
  if (override === "true") return { enabled: true, reason: "override_true" }
  if (override === "false") return { enabled: false, reason: "override_false" }
  return env.VERCEL_ENV === "production"
    ? { enabled: true, reason: "production" }
    : { enabled: false, reason: "not_production" }
}

/**
 * Real notifications are only sent on production deployments.
 * NOTIFICATIONS_ENABLED=true|false overrides; otherwise only Vercel production is enabled.
 */
export function notificationsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return evaluate(env).enabled
}

// Exposes only booleans, never the token itself
export function getNotificationStatus(env: NodeJS.ProcessEnv = process.env): NotificationStatus {
  return { ...evaluate(env), pushoverConfigured: Boolean(env.PUSHOVER_APP_TOKEN?.trim()) }
}
