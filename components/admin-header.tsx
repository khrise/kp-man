"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { AdminLanguageSwitcher } from "@/components/admin-language-switcher"
import { useTranslation } from "@/lib/i18n"

export function AdminHeader() {
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useTranslation()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-blue-600"
            >
              <path d="M10 8L10 32L18 28L18 12L10 8Z" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M18 12L26 8L26 32L18 28" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M26 8L30 10L30 30L26 32" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
            <Link href="/admin/dashboard">
              <h1 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                Admin Dashboard
              </h1>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/admin/seasons" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              {t("seasons")}
            </Link>
            <Link href="/admin/teams" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              {t("teams")}
            </Link>
            <Link href="/admin/players" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              {t("players")}
            </Link>
            <Link href="/admin/ties" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              {t("ties")}
            </Link>
            <Link href="/admin/users" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              {t("users")}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {session?.user && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{session.user.username || session.user.email}</span>
            </div>
          )}
          <AdminLanguageSwitcher />
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t("logout")}
          </Button>
        </div>
      </div>
    </header>
  )
}
