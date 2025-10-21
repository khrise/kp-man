"use client"

import { SessionProvider } from "next-auth/react"
import { ConfigProvider } from "@/components/config-provider"
import type { ReactNode } from "react"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ConfigProvider>
        {children}
      </ConfigProvider>
    </SessionProvider>
  )
}