import { isWithinWindow } from "@/lib/notifications/window"
import { getNotificationStatus, notificationsEnabled } from "@/lib/notifications/guard"

const now = new Date("2026-01-01T12:00:00Z")
const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000)

describe("isWithinWindow", () => {
  it("never notifies for past ties", () => {
    for (const mode of ["next_tie", "days_7", "days_14", "days_30", "all"] as const) {
      expect(isWithinWindow(mode, inDays(-1), now, true)).toBe(false)
    }
  })

  it.each([
    ["days_7", 7],
    ["days_14", 14],
    ["days_30", 30],
  ] as const)("%s includes the boundary and excludes beyond it", (mode, days) => {
    expect(isWithinWindow(mode, inDays(days), now, false)).toBe(true)
    expect(isWithinWindow(mode, new Date(inDays(days).getTime() + 1), now, false)).toBe(false)
  })

  it("all accepts any upcoming tie", () => {
    expect(isWithinWindow("all", inDays(400), now, false)).toBe(true)
  })

  it("next_tie depends on isNextTie", () => {
    expect(isWithinWindow("next_tie", inDays(100), now, true)).toBe(true)
    expect(isWithinWindow("next_tie", inDays(1), now, false)).toBe(false)
  })
})

describe("notificationsEnabled", () => {
  const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv

  it("is off by default and on preview/development", () => {
    expect(notificationsEnabled(env({}))).toBe(false)
    expect(notificationsEnabled(env({ VERCEL_ENV: "preview" }))).toBe(false)
    expect(notificationsEnabled(env({ VERCEL_ENV: "development" }))).toBe(false)
  })

  it("is on for Vercel production", () => {
    expect(notificationsEnabled(env({ VERCEL_ENV: "production" }))).toBe(true)
  })

  it("NOTIFICATIONS_ENABLED overrides VERCEL_ENV", () => {
    expect(notificationsEnabled(env({ VERCEL_ENV: "preview", NOTIFICATIONS_ENABLED: "true" }))).toBe(true)
    expect(notificationsEnabled(env({ VERCEL_ENV: "production", NOTIFICATIONS_ENABLED: "false" }))).toBe(false)
  })
})

describe("getNotificationStatus", () => {
  const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv
  it("reports the reason and token presence without exposing the token", () => {
    const status = getNotificationStatus(env({ VERCEL_ENV: "preview", PUSHOVER_APP_TOKEN: "secret" }))
    expect(status).toEqual({ enabled: false, reason: "not_production", pushoverConfigured: true })
    expect(getNotificationStatus(env({ VERCEL_ENV: "production" }))).toEqual({
      enabled: true, reason: "production", pushoverConfigured: false,
    })
    expect(getNotificationStatus(env({ NOTIFICATIONS_ENABLED: "true" })).reason).toBe("override_true")
  })
})
