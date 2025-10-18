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
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

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
  teamSize: number
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
  const [enableRankInput, setEnableRankInput] = useState(false)
  const [showAvailablePlayers, setShowAvailablePlayers] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    league: "",
    teamSize: "6",
    seasonId: seasons[0] ? String(seasons[0].id) : "",
    playerIds: [] as string[],
  })

  const handleMovePlayerToRank = (currentIndex: number, newRank: number) => {
    const newIndex = newRank - 1 // Convert rank to index
    if (newIndex < 0 || newIndex >= formData.playerIds.length || newIndex === currentIndex) {
      return // Invalid rank or no change
    }
    
    const playerIds = [...formData.playerIds]
    const [movedPlayer] = playerIds.splice(currentIndex, 1) // Remove from current position
    playerIds.splice(newIndex, 0, movedPlayer) // Insert at new position
    
    setFormData({ ...formData, playerIds })
  }

  const handleEdit = (team: Team) => {
    setEditingId(team.id)
    setFormData({
      name: team.name,
      league: team.league || "",
      teamSize: String(team.teamSize),
      seasonId: String(team.seasonId),
      playerIds: team.players?.map((p) => String(p.id)) || [],
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formDataObj = new FormData()
    formDataObj.append("name", formData.name)
    formDataObj.append("league", formData.league)
    formDataObj.append("team_size", formData.teamSize)
    formDataObj.append("season_id", formData.seasonId)
    formDataObj.append("player_ids", JSON.stringify(formData.playerIds))

    if (editingId !== null) {
      await updateTeamAction(String(editingId), formDataObj)
      setEditingId(null)
    } else {
      await createTeamAction(formDataObj)
      setIsAdding(false)
    }

    setFormData({ name: "", league: "", teamSize: "6", seasonId: seasons[0] ? String(seasons[0].id) : "", playerIds: [] })
    setEnableRankInput(false) // Reset toggle state
    setShowAvailablePlayers(false) // Reset available players visibility
    router.refresh()
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ name: "", league: "", teamSize: "6", seasonId: seasons[0] ? String(seasons[0].id) : "", playerIds: [] })
    setEnableRankInput(false) // Reset toggle state
    setShowAvailablePlayers(false) // Reset available players visibility
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
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({})

  return (
    <>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-bold text-gray-900">{t("teams")}</h2>
          <p className="mt-2 text-gray-600">{t("manageTeamsDesc")}</p>
        </div>
        <div className="flex gap-2 sm:flex-shrink-0">
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t("addTeam")}</span>
            <span className="sm:hidden">{t("add")}</span>
          </Button>
        </div>
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
                  <Label htmlFor="teamSize">{t("teamSize")}</Label>
                  <Input
                    id="teamSize"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.teamSize}
                    onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                    placeholder="6"
                    required
                  />
                  <p className="text-xs text-gray-500">{t("teamSizeDesc")}</p>
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
                <div className="space-y-3">
                  <Label>{t("teamRoster")}</Label>
                  
                  {/* Add Players Button */}
                  {availablePlayers.length > 0 && !showAvailablePlayers && (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAvailablePlayers(true)}
                        className="w-full sm:w-auto"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {t("addPlayers")} ({availablePlayers.length} {t("availablePlayers").toLowerCase()})
                      </Button>
                    </div>
                  )}

                  {/* Available Players Section */}
                  {availablePlayers.length > 0 && showAvailablePlayers && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">{t("availablePlayers")} ({availablePlayers.length})</h4>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const allPlayerIds = availablePlayers.map(p => String(p.id))
                              setFormData({ ...formData, playerIds: [...formData.playerIds, ...allPlayerIds] })
                            }}
                          >
                            {t("selectAll")}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAvailablePlayers(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto border rounded-lg bg-gray-50 p-3">
                        <div className="space-y-2">
                          {availablePlayers.map((player) => (
                            <label
                              key={player.id}
                              className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded"
                            >
                              <input
                                type="checkbox"
                                className="rounded border-gray-300"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleAddPlayer(String(player.id))
                                  }
                                }}
                              />
                              <span className="text-sm">
                                {player.firstName} {player.lastName}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {availablePlayers.length === 0 && (
                    <p className="text-sm text-gray-500">{t("allPlayersAdded")}</p>
                  )}
                </div>

                {formData.playerIds.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700">{t("teamPlayers")} ({formData.playerIds.length})</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{t("enableRankEdit")}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableRankInput}
                            onChange={(e) => setEnableRankInput(e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-11 h-6 rounded-full transition-colors ${
                            enableRankInput ? 'bg-blue-600' : 'bg-gray-200'
                          }`}>
                            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                              enableRankInput ? 'translate-x-5' : 'translate-x-0'
                            } mt-0.5 ml-0.5`}></div>
                          </div>
                        </label>
                      </div>
                    </div>
                    {formData.playerIds.map((playerId, index) => {
                      const player = players.find((p) => String(p.id) === playerId)
                      if (!player) return null
                      return (
                        <div
                          key={playerId}
                          className="flex items-center justify-between rounded-lg border bg-white p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center gap-1">
                              <label className="text-xs text-gray-500">{t("rank")}</label>
                              {enableRankInput ? (
                                <Input
                                  type="number"
                                  min="1"
                                  max={formData.playerIds.length}
                                  value={index + 1}
                                  onChange={(e) => {
                                    const newRank = parseInt(e.target.value)
                                    if (!isNaN(newRank)) {
                                      handleMovePlayerToRank(index, newRank)
                                    }
                                  }}
                                  className="w-16 h-8 text-center text-sm"
                                />
                              ) : (
                                <span className="flex h-8 w-16 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                                  {index + 1}
                                </span>
                              )}
                            </div>
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
                              title={t("moveUp")}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMovePlayerDown(index)}
                              disabled={index === formData.playerIds.length - 1}
                              title={t("moveDown")}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePlayer(playerId)}
                              title={t("removePlayer")}
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
        {initialTeams.map((team) => {
          const open = !!openMap[team.id]
          return (
          <Card key={team.id}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold truncate">{team.name}</h3>
                  <p className="text-sm text-gray-600">{team.league ?? "–"}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {t("season")}: {seasons.find((s) => s.id === team.seasonId)?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("teamSize")}: {team.teamSize} {t("playersCount")}
                  </p>
                  {team.players && team.players.length > 0 && (
                    <div className="mt-4">
                        <AccordionItem 
                          value={`roster-${team.id}`} 
                          open={open} 
                          onOpenChange={(newOpen) => setOpenMap(prev => ({ ...prev, [team.id]: newOpen }))}
                          className="border-none"
                        >
                          <AccordionTrigger className="py-0 text-sm font-medium text-gray-700 hover:no-underline">
                            {t("roster")} ({team.players.length} {t("playersCount")})
                          </AccordionTrigger>
                          <AccordionContent className="pt-3 pb-0">
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
                          </AccordionContent>
                        </AccordionItem>
                    </div>
                )}
                </div>
                <div className="flex gap-2 sm:flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(team)}>
                    <Edit className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">{t("edit")}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(team.id)}>
                    <Trash2 className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">{t("delete")}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          )
        })}
      </div>
    </>
  )
}
