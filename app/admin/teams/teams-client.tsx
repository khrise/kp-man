"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Check, X, ChevronUp, ChevronDown, UserMinus } from "lucide-react"
import { createTeamAction, updateTeamAction, deleteTeamAction } from "@/app/actions/teams"
import { useTranslation } from "@/lib/i18n"

export const dynamic = "force-dynamic"

type TeamPlayer = {
  id: number
  firstName: string
  lastName: string
  playerRank: number
}

type Team = {
  id: number
  seasonId: number
  name: string
  league: string | null
  players?: TeamPlayer[]
}

type Season = {
  id: number
  name: string
}

type Player = {
  id: number
  firstName: string
  lastName: string
}

export function TeamsClient({
  initialTeams,
  seasons,
  players,
}: {
  initialTeams: Team[]
  seasons: Season[]
  players: Player[]
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectKey, setSelectKey] = useState(0)
  const [formData, setFormData] = useState({
    name: "",
    league: "",
    seasonId: seasons[0] ? String(seasons[0].id) : "",
    playerIds: [] as string[],
  })

  const handleEdit = (team: Team) => {
    setEditingId(team.id)
    setFormData({
      name: team.name,
      league: team.league || "",
      seasonId: String(team.seasonId),
      playerIds: team.players?.map((p) => String(p.id)) || [],
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formDataObj = new FormData()
    formDataObj.append("name", formData.name)
    formDataObj.append("league", formData.league)
    formDataObj.append("season_id", formData.seasonId)
    formDataObj.append("player_ids", JSON.stringify(formData.playerIds))

    if (editingId !== null) {
      await updateTeamAction(String(editingId), formDataObj)
      setEditingId(null)
    } else {
      await createTeamAction(formDataObj)
      setIsAdding(false)
    }

    setFormData({ name: "", league: "", seasonId: seasons[0] ? String(seasons[0].id) : "", playerIds: [] })
    router.refresh()
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ name: "", league: "", seasonId: seasons[0] ? String(seasons[0].id) : "", playerIds: [] })
  }

  const handleDelete = async (id: number) => {
    if (confirm(t("confirmDeleteTeam"))) {
      await deleteTeamAction(String(id))
      router.refresh()
    }
  }

  const handleAddPlayer = (playerId: string) => {
    const normalizedId = String(playerId)
    if (!formData.playerIds.includes(normalizedId)) {
      setFormData({ ...formData, playerIds: [...formData.playerIds, normalizedId] })
      setSelectKey((prev) => prev + 1)
    }
  }

  const handleRemovePlayer = (playerId: string) => {
    const normalizedId = String(playerId)
    setFormData({ ...formData, playerIds: formData.playerIds.filter((id) => id !== normalizedId) })
  }

  const handleMovePlayerUp = (index: number) => {
    if (index > 0) {
      const newPlayerIds = [...formData.playerIds]
      ;[newPlayerIds[index - 1], newPlayerIds[index]] = [newPlayerIds[index], newPlayerIds[index - 1]]
      setFormData({ ...formData, playerIds: newPlayerIds })
    }
  }

  const handleMovePlayerDown = (index: number) => {
    if (index < formData.playerIds.length - 1) {
      const newPlayerIds = [...formData.playerIds]
      ;[newPlayerIds[index], newPlayerIds[index + 1]] = [newPlayerIds[index + 1], newPlayerIds[index]]
      setFormData({ ...formData, playerIds: newPlayerIds })
    }
  }

  const availablePlayers = players.filter((p) => !formData.playerIds.includes(String(p.id)))

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{t("teams")}</h2>
          <p className="mt-2 text-gray-600">{t("manageTeamsDesc")}</p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addTeam")}
        </Button>
      </div>

      {(isAdding || editingId !== null) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId !== null ? t("editTeam") : t("addNewTeam")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("teamName")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., H40"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="league">{t("league")}</Label>
                  <Input
                    id="league"
                    value={formData.league}
                    onChange={(e) => setFormData({ ...formData, league: e.target.value })}
                    placeholder="e.g., Herren 40 Bezirksliga"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="season">{t("season")}</Label>
                  <Select
                    value={formData.seasonId}
                    onValueChange={(value) => setFormData({ ...formData, seasonId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((season) => (
                        <SelectItem key={season.id} value={String(season.id)}>
                          {season.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t("teamRoster")}</Label>
                  <Select key={selectKey} onValueChange={(value) => handleAddPlayer(value)}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder={t("addPlayerToTeam")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlayers.map((player) => (
                        <SelectItem key={player.id} value={String(player.id)}>
                          {player.firstName} {player.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.playerIds.length > 0 ? (
                  <div className="space-y-2">
                    {formData.playerIds.map((playerId, index) => {
                      const player = players.find((p) => String(p.id) === playerId)
                      if (!player) return null
                      return (
                        <div
                          key={playerId}
                          className="flex items-center justify-between rounded-lg border bg-white p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium">
                                {player.firstName} {player.lastName}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMovePlayerUp(index)}
                              disabled={index === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMovePlayerDown(index)}
                              disabled={index === formData.playerIds.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePlayer(playerId)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-500 py-4">{t("noPlayersAdded")}</p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button type="submit">
                  <Check className="mr-2 h-4 w-4" />
                  {t("save")}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {initialTeams.map((team) => (
          <Card key={team.id}>
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{team.name}</h3>
                    <p className="text-sm text-gray-600">{team.league ?? "–"}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {t("season")}: {seasons.find((s) => s.id === team.seasonId)?.name}
                    </p>
                    {team.players && team.players.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">{t("roster")} ({team.players.length} {t("playersCount")}):</p>
                        <div className="flex flex-wrap gap-2">
                          {team.players.map((player, index) => (
                            <div
                              key={player.id}
                              className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm"
                            >
                              <span className="font-semibold text-blue-700">{index + 1}.</span>
                              <span>
                                {player.firstName} {player.lastName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(team)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(team.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
