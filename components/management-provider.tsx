"use client"

import { createContext, useContext } from "react"
import type { UserRole } from "@/lib/types"
import { hasPermission, type Permission } from "@/lib/permissions"

const ManagementRole = createContext<UserRole>("player")

export function ManagementProvider({ role, children }: { role: UserRole; children: React.ReactNode }) {
  return <ManagementRole.Provider value={role}>{children}</ManagementRole.Provider>
}

export function usePermission(permission: Permission) {
  return hasPermission(useContext(ManagementRole), permission)
}
