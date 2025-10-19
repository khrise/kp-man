"use client"

import type React from "react"
import { Suspense } from "react"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslation } from "@/lib/i18n"
import { HomePageForm } from "./home-page-form"

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#2c3e50] px-4">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher className="border-gray-600 bg-transparent text-white hover:bg-gray-700" />
      </div>

      <div className="w-full max-w-md">

        <Suspense fallback={<div className="text-center text-white">{t("loading")}</div>}>
          <HomePageForm />
        </Suspense>
        
        
      </div>
    </div>
  )
}
