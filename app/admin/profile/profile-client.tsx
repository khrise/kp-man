"use client"

import { useEffect, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getMyNotificationSettingsAction,
  saveMyNotificationSettingAction,
  sendTestNotificationAction,
  type NotificationSettingDto,
} from "@/app/actions/notifications"
import { useTranslation } from "@/lib/i18n"

const WINDOW_LABELS = {
  next_tie: "windowNextTie",
  days_7: "window7",
  days_14: "window14",
  days_30: "window30",
  all: "windowAll",
} as const

type Feedback = { type: "success" | "error"; message: string } | null

export default function ProfileClient() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<NotificationSettingDto[] | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({})

  useEffect(() => {
    getMyNotificationSettingsAction()
      .then(setSettings)
      .catch(() => setForbidden(true))
  }, [])

  const update = (channel: string, patch: Partial<NotificationSettingDto>) =>
    setSettings((current) => current?.map((s) => (s.channel === channel ? { ...s, ...patch } : s)) ?? null)

  const handleSave = async (setting: NotificationSettingDto) => {
    try {
      await saveMyNotificationSettingAction(setting)
      setFeedback((f) => ({ ...f, [setting.channel]: { type: "success", message: t("settingsSaved") } }))
    } catch (error) {
      const message = (error as Error)?.message ?? "Operation failed"
      setFeedback((f) => ({ ...f, [setting.channel]: { type: "error", message } }))
    }
  }

  const handleTest = async (setting: NotificationSettingDto) => {
    const result = await sendTestNotificationAction(setting.channel, setting.target)
    setFeedback((f) => ({
      ...f,
      [setting.channel]: result.success
        ? { type: "success", message: t("testNotificationSent") }
        : { type: "error", message: result.error },
    }))
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <main className="mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-3xl font-bold text-gray-900">{t("notificationPreferences")}</h2>
          <p className="mt-2 mb-6 text-gray-600">{t("notificationPreferencesDesc")}</p>

          {forbidden && <p className="text-sm text-gray-600">{t("captainsOnly")}</p>}

          {settings?.map((setting) => {
            const fb = feedback[setting.channel]
            return (
              <Card key={setting.channel} className="mb-6">
                <CardHeader>
                  <CardTitle className="capitalize">{setting.channel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={setting.enabled}
                      onChange={(e) => update(setting.channel, { enabled: e.target.checked })}
                    />
                    {t("notificationsEnabled")}
                  </label>

                  <div className="space-y-2">
                    <Label htmlFor={`target-${setting.channel}`}>{t("pushoverUserKey")}</Label>
                    <Input
                      id={`target-${setting.channel}`}
                      value={setting.target}
                      autoComplete="off"
                      onChange={(e) => update(setting.channel, { target: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">{t("pushoverUserKeyHelp")}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("notificationWindow")}</Label>
                    <Select
                      value={setting.windowMode}
                      onValueChange={(value) => update(setting.channel, { windowMode: value })}
                    >
                      <SelectTrigger className="w-[260px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(WINDOW_LABELS).map(([mode, key]) => (
                          <SelectItem key={mode} value={mode}>
                            {t(key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={() => handleSave(setting)}>{t("save")}</Button>
                    <Button variant="outline" onClick={() => handleTest(setting)} disabled={!setting.target.trim()}>
                      {t("sendTestNotification")}
                    </Button>
                    {fb && (
                      <span className={fb.type === "success" ? "text-sm text-green-700" : "text-sm text-red-700"}>
                        {fb.message}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </main>
      </div>
    </AuthGuard>
  )
}
