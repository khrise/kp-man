"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/i18n"
import { getSettings, updateSetting } from "@/app/actions/settings"
import type { AppSetting } from "@/lib/db"
import { AdminHeader } from "@/components/admin-header"

export default function SettingsClient() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<AppSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await getSettings()
      setSettings(data)
      // Initialize edited values with current values
      const initialValues: Record<string, string> = {}
      data.forEach(setting => {
        initialValues[setting.key] = setting.value
      })
      setEditedValues(initialValues)
    } catch (error) {
      console.error("Failed to load settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (setting: AppSetting) => {
    setSaving(setting.key)
    try {
      const result = await updateSetting(
        setting.key,
        editedValues[setting.key] || setting.value,
        setting.type,
        setting.description || undefined
      )
      
      if (result.success) {
        // Update the settings state
        setSettings(prev => prev.map(s => 
          s.key === setting.key 
            ? { ...s, value: editedValues[setting.key] || setting.value }
            : s
        ))
      } else {
        console.error("Failed to save setting:", result.error)
        alert("Failed to save setting: " + (result.error || "Unknown error"))
      }
    } catch (error) {
      console.error("Failed to save setting:", error)
      alert("Failed to save setting")
    } finally {
      setSaving(null)
    }
  }

  const handleValueChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }))
  }

  const hasChanges = (setting: AppSetting) => {
    return editedValues[setting.key] !== setting.value
  }

  const renderSettingInput = (setting: AppSetting) => {
    const value = editedValues[setting.key] || setting.value

    switch (setting.type) {
      case 'boolean':
        return (
          <Select
            value={value}
            onValueChange={(newValue) => handleValueChange(setting.key, newValue)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t("yes")}</SelectItem>
              <SelectItem value="false">{t("no")}</SelectItem>
            </SelectContent>
          </Select>
        )
      
      case 'json':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            rows={4}
            className="font-mono text-sm"
          />
        )
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
          />
        )
      
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">{t("loading") || "Loading..."}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("appSettings")}</h1>
          <p className="mt-2 text-gray-600">
            {t("appSettingsDescription")}
          </p>
        </div>

        <div className="space-y-6">
          {settings.map((setting) => (
            <Card key={setting.key}>
              <CardHeader>
                <CardTitle className="text-lg">{setting.key}</CardTitle>
                {setting.description && (
                  <CardDescription>{setting.description}</CardDescription>
                )}
                <div className="text-sm text-gray-500">
                  {t("settingType")}: <span className="font-mono">{setting.type}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={setting.key}>{t("settingValue")}</Label>
                  {renderSettingInput(setting)}
                </div>
                
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSave(setting)}
                    disabled={!hasChanges(setting) || saving === setting.key}
                    className="w-24"
                  >
                    {saving === setting.key ? t("saving") : t("save")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}