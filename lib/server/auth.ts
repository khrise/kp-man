import "server-only"

import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/next-auth"
import { getUserById } from "@/lib/db"

export class AuthorizationError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Authentication required" : "Admin access required")
    this.name = "AuthorizationError"
  }
}

export async function requireAdmin() {
  const session = await auth()
  const userId = Number(session?.user?.id)
  if (!session?.user || !Number.isSafeInteger(userId) || userId <= 0) {
    throw new AuthorizationError(401)
  }

  // Resolve the current role so deleted users and demoted admins lose access immediately.
  const user = await getUserById(userId)
  if (!user || user.role !== "admin") {
    throw new AuthorizationError(403)
  }

  return user
}

export async function requireAdminPage() {
  try {
    return await requireAdmin()
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error
    if (error.status === 401) redirect("/admin/login")
    notFound()
  }
}
