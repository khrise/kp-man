"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { getLocale, setLocale, type Locale } from "@/lib/i18n"

interface LanguageSwitcherProps {
  variant?: "default" | "outline"
  className?: string
}

export function LanguageSwitcher({ variant = "outline", className = "" }: LanguageSwitcherProps) {
  const [locale, setLocaleState] = useState<Locale>("de")

  useEffect(() => {
    setLocaleState(getLocale())
  }, [])

  const toggleLocale = () => {
    const newLocale: Locale = locale === "de" ? "en" : "de"
    setLocale(newLocale)
    setLocaleState(newLocale)
    // Trigger a re-render of the page
    window.location.reload()
  }

  return (
    <Button variant={variant} size="sm" onClick={toggleLocale} className={className}>
      {locale === "de" ? "EN" : "DE"}
    </Button>
  )
}
