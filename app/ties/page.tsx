"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function TiesRedirect() {
  const router = useRouter()

  useEffect(() => {
    // No access code in URL, redirect to home for user to enter access code
    router.replace("/")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecting...</p>
    </div>
  )
}