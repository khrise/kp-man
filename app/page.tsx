"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslation } from "@/lib/i18n"
import { validateAccessCode } from "@/app/actions/public"

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    const storedCode = localStorage.getItem("season_access_code")
    const storedSeasonId = localStorage.getItem("season_id")
    if (storedCode && storedSeasonId) {
      router.push(`/spieltage/${storedCode}`)
    }
    
    // Check for error parameter
    const errorParam = searchParams.get("error")
    if (errorParam === "invalid") {
      setError(t("invalidAccessCode"))
    }
  }, [router, searchParams, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await validateAccessCode(accessCode)

      if (result.valid && result.seasonId) {
        localStorage.setItem("season_access_code", accessCode)
        localStorage.setItem("season_id", String(result.seasonId))
        router.push(`/spieltage/${accessCode}`)
      } else {
        setError(t("invalidAccessCode"))
      }
    } catch (err) {
      console.error("invalidAccessCode", err)
      setError(t("invalidAccessCode"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#2c3e50] px-4">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher className="border-gray-600 bg-transparent text-white hover:bg-gray-700" />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mb-4 flex justify-center">
            <svg
              width="60"
              height="60"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-blue-600"
            >
              <path d="M10 8L10 32L18 28L18 12L10 8Z" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M18 12L26 8L26 32L18 28" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M26 8L30 10L30 30L26 32" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <CardTitle className="text-center text-2xl font-bold">{t("sportsClubPlanning")}</CardTitle>
          <CardDescription className="text-center">{t("enterAccessCode")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessCode">{t("seasonAccessCode")}</Label>
              <Input
                id="accessCode"
                type="text"
                placeholder={t("seasonAccessCode")}
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                required
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("loading") || "Loading..." : t("accessSeason")}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t("administrator")}{" "}
              <a href="/admin/login" className="font-medium text-blue-600 hover:underline">
                {t("loginHere")}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
