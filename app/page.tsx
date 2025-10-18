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

        <Suspense fallback={<div className="text-center text-white">{t("loading")}</div>}>
          <HomePageForm />
        </Suspense>
        
        
      </div>
    </div>
  )
}
