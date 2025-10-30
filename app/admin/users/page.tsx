"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Check, X, Key, Shield } from "lucide-react"
import type { Player } from "@/lib/types"
import {
  getUsers,
  createUserAction,
  updateUserAction,
  updateUserPasswordAction,
  deleteUserAction,
} from "@/app/actions/users"
import { getPlayers } from "@/app/actions/players"
import { useTranslation } from "@/lib/i18n"

interface UserWithPlayer {
  id: number
  username: string
  email: string
  role: "admin" | "user" | "team_captain" | "player"
  playerId: number | null
  createdAt: Date
  updatedAt: Date
  playerFirstName?: string
  playerLastName?: string
}

export default function UsersPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<UserWithPlayer[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [changingPasswordId, setChangingPasswordId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user" | "team_captain" | "player",
    playerId: "none" as string,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [usersData, playersData] = await Promise.all([getUsers(), getPlayers()])
    setUsers(usersData as UserWithPlayer[])
    setPlayers(playersData as Player[])
  }

  const handleEdit = (user: UserWithPlayer) => {
    setEditingId(String(user.id))
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
      playerId: user.playerId ? String(user.playerId) : "none",
    })
  }

  const handleUpdate = async () => {
    if (!editingId) return
    const formDataObj = new FormData()
    formDataObj.append("username", formData.username)
    formDataObj.append("email", formData.email)
    formDataObj.append("role", formData.role)
    formDataObj.append("player_id", formData.playerId === "none" ? "" : formData.playerId)

    await updateUserAction(editingId, formDataObj)
    await loadData()
    setEditingId(null)
    resetForm()
  }

  const handleUpdatePassword = async () => {
    if (!changingPasswordId || !formData.password) return
    const formDataObj = new FormData()
    formDataObj.append("password", formData.password)

    await updateUserPasswordAction(changingPasswordId, formDataObj)
    await loadData()
    setChangingPasswordId(null)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "user",
      playerId: "none",
    })
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setChangingPasswordId(null)
    resetForm()
  }

  const handleAdd = async () => {
    const formDataObj = new FormData()
    formDataObj.append("username", formData.username)
    formDataObj.append("email", formData.email)
    formDataObj.append("password", formData.password)
    formDataObj.append("role", formData.role)
    formDataObj.append("player_id", formData.playerId === "none" ? "" : formData.playerId)

    await createUserAction(formDataObj)
    await loadData()
    setIsAdding(false)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (confirm(t("confirmDeleteUser"))) {
      await deleteUserAction(id)
      await loadData()
    }
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: "bg-red-100 text-red-800 border-red-300",
      team_captain: "bg-blue-100 text-blue-800 border-blue-300",
      user: "bg-gray-100 text-gray-800 border-gray-300",
      player: "bg-green-100 text-green-800 border-green-300",
    }
    return badges[role as keyof typeof badges] || badges.user
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{t("users")}</h2>
              <p className="mt-2 text-gray-600">{t("manageUsersDesc")}</p>
            </div>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("addUser")}
            </Button>
          </div>

          {(isAdding || editingId !== null) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  <Shield className="mr-2 inline h-5 w-5" />
                  {editingId !== null ? t("editUser") : t("addNewUser")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">{t("username")}</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="e.g., john.doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g., john@example.com"
                    />
                  </div>
                  {isAdding && (
                    <div className="space-y-2">
                      <Label htmlFor="password">{t("password")}</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="role">{t("role")}</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "admin" | "user" | "team_captain" | "player") =>
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">{t("user")}</SelectItem>
                        <SelectItem value="team_captain">{t("teamCaptain")}</SelectItem>
                        <SelectItem value="admin">{t("admin")}</SelectItem>
                        <SelectItem value="player">{t("player")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="playerId">{t("associatedPlayer")}</Label>
                    <Select
                      value={formData.playerId}
                      onValueChange={(value) => setFormData({ ...formData, playerId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a player" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("noPlayerAssociation")}</SelectItem>
                        {players.map((player) => (
                          <SelectItem key={player.id} value={String(player.id)}>
                            {player.firstName} {player.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={editingId !== null ? handleUpdate : handleAdd}>
                    <Check className="mr-2 h-4 w-4" />
                    {t("save")}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" />
                    {t("cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {changingPasswordId && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  <Key className="mr-2 inline h-5 w-5" />
                  {t("changePassword")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t("newPassword")}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleUpdatePassword}>
                    <Check className="mr-2 h-4 w-4" />
                    {t("updatePassword")}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" />
                    {t("cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{user.username}</h3>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getRoleBadge(
                          user.role,
                        )}`}
                      >
                        {user.role.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    {user.playerFirstName && user.playerLastName && (
                      <p className="text-sm text-blue-600">
                        {t("linkedTo")}: {user.playerFirstName} {user.playerLastName}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setChangingPasswordId(String(user.id))
                        setFormData({ ...formData, password: "" })
                      }}
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(String(user.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
