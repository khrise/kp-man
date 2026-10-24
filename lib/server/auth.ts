import "server-only"

import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/next-auth"
import { getUserById } from "@/lib/db"
import { getCaptainTeamIds, getPlayerTeamIds } from "@/lib/team-captains"
import { hasPermission, Permission } from "@/lib/permissions"

export class AuthorizationError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Authentication required" : "Access denied")
    this.name = "AuthorizationError"
  }
}

export async function requirePermission(permission: Permission) {
  const session = await auth()
  const userId = Number(session?.user?.id)
  if (!session?.user || !Number.isSafeInteger(userId) || userId <= 0) {
    throw new AuthorizationError(401)
  }

  // Resolve the current role so deleted users and demoted admins lose access immediately.
  const user = await getUserById(userId)
  if (!user || !hasPermission(user.role, permission)) {
    throw new AuthorizationError(403)
  }

  return user
}

export async function requireAdmin() {
  return requirePermission(Permission.UsersManage)
}

export async function requireManagement(permission: Permission = Permission.ManagementAccess) {
  const user = await requirePermission(permission)
  const teamIds = user.role === "admin" ? undefined : await getCaptainTeamIds(user.id)
  return { user, teamIds }
}

export async function requireTeamPermission(teamId: number, permission: Permission) {
  const user = await requirePermission(permission)
  if (!Number.isSafeInteger(teamId) || teamId <= 0) throw new Error("Invalid team ID")
  if (user.role !== "admin" && !(await getCaptainTeamIds(user.id)).includes(teamId)) {
    throw new AuthorizationError(403)
  }
  return user
}

export async function requirePlayerPermission(playerId: number) {
  const user = await requirePermission(Permission.PlayersManage)
  if (user.role !== "admin") {
    const [assigned, memberships] = await Promise.all([getCaptainTeamIds(user.id), getPlayerTeamIds(playerId)])
    if (!memberships.length || memberships.some((teamId) => !assigned.includes(teamId))) {
      throw new AuthorizationError(403)
    }
  }
  return user
}

export async function requireAdminPage(permission: Permission = Permission.UsersManage) {
  try {
    return await requirePermission(permission)
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error
    if (error.status === 401) redirect("/admin/login")
    notFound()
  }
}
