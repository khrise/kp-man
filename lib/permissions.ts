import type { UserRole } from "@/lib/types"

export enum Permission {
  ManagementAccess = "management.access",
  TeamsManage = "teams.manage",
  TeamsCreate = "teams.create",
  TeamsDelete = "teams.delete",
  CaptainsManage = "captains.manage",
  PlayersManage = "players.manage",
  PlayersDelete = "players.delete",
  TiesManage = "ties.manage",
  LineupManage = "lineup.manage",
  LineupReopen = "lineup.reopen",
  AuditRead = "audit.read",
  SeasonsManage = "seasons.manage",
  UsersManage = "users.manage",
  SettingsManage = "settings.manage",
}

const managementRoles: readonly UserRole[] = ["admin", "team_captain"]
const adminRoles: readonly UserRole[] = ["admin"]

export const permissionRoles = {
  [Permission.ManagementAccess]: managementRoles,
  [Permission.TeamsManage]: managementRoles,
  [Permission.TeamsCreate]: adminRoles,
  [Permission.TeamsDelete]: adminRoles,
  [Permission.CaptainsManage]: adminRoles,
  [Permission.PlayersManage]: managementRoles,
  [Permission.PlayersDelete]: adminRoles,
  [Permission.TiesManage]: managementRoles,
  [Permission.LineupManage]: managementRoles,
  [Permission.LineupReopen]: adminRoles,
  [Permission.AuditRead]: managementRoles,
  [Permission.SeasonsManage]: adminRoles,
  [Permission.UsersManage]: adminRoles,
  [Permission.SettingsManage]: adminRoles,
} satisfies Record<Permission, readonly UserRole[]>

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return permissionRoles[permission].includes(role)
}
