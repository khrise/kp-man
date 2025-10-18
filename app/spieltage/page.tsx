"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SpieltageRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Check if user has stored access code and redirect to new URL structure
    const storedCode = localStorage.getItem("season_access_code")
    if (storedCode) {
      router.replace(`/spieltage/${storedCode}`)
    } else {
      // No access code found, redirect to home
      router.replace("/")
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecting...</p>
    </div>
  )
}
