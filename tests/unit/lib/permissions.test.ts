import { hasPermission, permissionRoles, Permission } from "@/lib/permissions"

const captainPermissions: Permission[] = [
  Permission.ManagementAccess, Permission.TeamsManage, Permission.PlayersManage,
  Permission.TiesManage, Permission.LineupManage, Permission.AuditRead,
]

it("maps every permission to roles", () => {
  expect(Object.keys(permissionRoles).sort()).toEqual(Object.values(Permission).sort())
})

it.each(Object.values(Permission))("allows admins to use %s", (permission) => {
  expect(hasPermission("admin", permission)).toBe(true)
})

it.each(Object.values(Permission))("enforces the captain policy for %s", (permission) => {
  expect(hasPermission("team_captain", permission)).toBe(captainPermissions.includes(permission))
})

it.each(["player", "user"] as const)("does not grant management permissions to %s", (role) => {
  for (const permission of Object.values(Permission)) {
    expect(hasPermission(role, permission)).toBe(false)
  }
})
