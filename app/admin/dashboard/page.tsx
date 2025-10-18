"use client"

import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, Trophy, ChevronRight } from "lucide-react"
import Link from "next/link"
import { fetchDashboardStats } from "@/app/actions/dashboard"
import { useEffect, useState } from "react"
import { useTranslation } from "@/lib/i18n"

interface DashboardStats {
  totalSeasons: number
  totalTeams: number
  totalPlayers: number
  upcomingTies: number
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<DashboardStats>({
    totalSeasons: 0,
    totalTeams: 0,
    totalPlayers: 0,
    upcomingTies: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const result = await fetchDashboardStats()
        if (result.success && result.data) {
          setStats(result.data)
        }
      } catch (error) {
        console.error("Failed to load dashboard stats:", error)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  const dashboardTiles = [
    {
      title: t("seasons"),
      description: t("activeAndArchived"),
      count: stats.totalSeasons,
      icon: Calendar,
      href: "/admin/seasons",
      color: "bg-blue-500 hover:bg-blue-600",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: t("teams"),
      description: t("teamsInSeason"),
      count: stats.totalTeams,
      icon: Trophy,
      href: "/admin/teams",
      color: "bg-green-500 hover:bg-green-600",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: t("players"),
      description: t("registeredPlayers"),
      count: stats.totalPlayers,
      icon: Users,
      href: "/admin/players",
      color: "bg-purple-500 hover:bg-purple-600",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: t("ties"),
      description: t("upcomingTies"),
      count: stats.upcomingTies,
      icon: Calendar,
      href: "/admin/ties",
      color: "bg-orange-500 hover:bg-orange-600",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      title: t("users"),
      description: t("manageUsersDesc"),
      count: "→",
      icon: Users,
      href: "/admin/users",
      color: "bg-gray-500 hover:bg-gray-600",
      iconBg: "bg-gray-100",
      iconColor: "text-gray-600",
    },
  ]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">{t("dashboard")}</h2>
            <p className="mt-2 text-gray-600">{t("manageSportsClub")}</p>
          </div>

          {/* Unified Dashboard Tiles */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dashboardTiles.map((tile) => {
              const Icon = tile.icon
              return (
                <Link key={tile.href} href={tile.href}>
                  <Card className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`rounded-full p-3 ${tile.iconBg}`}>
                              <Icon className={`h-6 w-6 ${tile.iconColor}`} />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {tile.title}
                              </h3>
                              <p className="text-sm text-gray-600">{tile.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold text-gray-900">
                              {loading ? "..." : tile.count}
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Recent Activity Section */}
          <div className="mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t("recentActivity")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center text-gray-500 py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>{t("latestUpdates")}</p>
                    <p className="text-sm text-gray-400 mt-1">Coming soon...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
