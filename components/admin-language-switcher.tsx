"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"
import { Locale, getLocale, setLocale } from "@/lib/i18n"

export function AdminLanguageSwitcher() {
  const [currentLocale, setCurrentLocale] = useState<Locale>("de")

  useEffect(() => {
    setCurrentLocale(getLocale())
  }, [])

  const toggleLanguage = () => {
    const newLocale: Locale = currentLocale === "de" ? "en" : "de"
    setLocale(newLocale)
    setCurrentLocale(newLocale)
    // Reload the page to apply the language change
    window.location.reload()
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
    >
      <Globe className="h-4 w-4" />
      <span className="text-sm font-medium">
        {currentLocale.toUpperCase()}
      </span>
    </Button>
  )
}