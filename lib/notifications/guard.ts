/**
 * Real notifications are only sent on production deployments.
 * NOTIFICATIONS_ENABLED=true|false overrides; otherwise only Vercel production is enabled.
 */
export function notificationsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const override = env.NOTIFICATIONS_ENABLED?.trim().toLowerCase()
  if (override === "true") return true
  if (override === "false") return false
  return env.VERCEL_ENV === "production"
}
