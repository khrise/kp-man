"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { getClubName } from "@/app/actions/config"

interface AppConfig {
  clubName: string
  // Future settings can be added here
}

interface ConfigContextType {
  config: AppConfig | null
  loading: boolean
  error: string | null
}

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  loading: true,
  error: null,
})

export function useConfig() {
  const context = useContext(ConfigContext)
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider")
  }
  return context
}

interface ConfigProviderProps {
  children: ReactNode
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Load all configuration settings
        const clubName = await getClubName()
        // Future: load other settings here
        
        setConfig({
          clubName,
          // Future settings will be added here
        })
      } catch (err) {
        console.error("Failed to load configuration:", err)
        setError(err instanceof Error ? err.message : "Failed to load configuration")
        
        // Set fallback config on error
        setConfig({
          clubName: "Sports Club",
        })
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  // Show loading spinner while configuration is being fetched
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    )
  }

  // Show error state if configuration failed to load (with fallback config)
  if (error) {
    console.warn("Configuration error (using fallbacks):", error)
  }

  return (
    <ConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </ConfigContext.Provider>
  )
}