"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/i18n"
import { validateAccessCode } from "@/app/actions/public"
import { useConfig } from "@/components/config-provider"

export function HomePageForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()
  const { config } = useConfig()

  useEffect(() => {
    // Check for error parameter
    const errorParam = searchParams.get("error")
    if (errorParam === "invalid") {
      setError(t("invalidAccessCode"))
    }
  }, [searchParams, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await validateAccessCode(accessCode)

      if (result.valid && result.seasonId) {
        // No need to store in localStorage with URL-based routing
        router.push(`/ties/${accessCode}`)
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
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-2xl font-bold">{config?.clubName} {t("planning")}</CardTitle>
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
            <Link href="/admin/login" className="font-medium text-blue-600 hover:underline">
              {t("loginHere")}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}