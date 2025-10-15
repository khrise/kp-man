"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Check, X } from "lucide-react"
import { createTieAction, updateTieAction, deleteTieAction } from "@/app/actions/ties"

type Tie = {
  id: number
  teamId: number
  opponent: string
  tieDate: string
  location: string | null
  isHome: boolean
  notes: string | null
  seasonId: number
  teamName: string
  seasonName: string
}

type Team = {
  id: number
  seasonId: number
  name: string
}

type Season = {
  id: number
  name: string
}

type TiesClientProps = {
  initialTies: Tie[]
  teams: Team[]
  seasons: Season[]
}

export function TiesClient({ initialTies, teams, seasons }: TiesClientProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    seasonId: seasons[0] ? String(seasons[0].id) : "",
    teamId: teams[0] ? String(teams[0].id) : "",
    opponent: "",
    tieDate: "",
    tieTime: "",
    location: "",
    isHome: true,
    notes: "",
  })

  const handleEdit = (tie: Tie) => {
    setEditingId(tie.id)
    const date = new Date(tie.tieDate)
    const dateStr = date.toISOString().split("T")[0]
    const timeStr = date.toTimeString().slice(0, 5)
    setFormData({
      seasonId: String(tie.seasonId),
      teamId: String(tie.teamId),
      opponent: tie.opponent,
      tieDate: dateStr,
      tieTime: timeStr,
      location: tie.location || "",
      isHome: tie.isHome,
      notes: tie.notes || "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const formDataToSend = new FormData()
    formDataToSend.append("season_id", formData.seasonId)
    formDataToSend.append("team_id", formData.teamId)
    formDataToSend.append("opponent", formData.opponent)
    formDataToSend.append("date_time", `${formData.tieDate}T${formData.tieTime}`)
    formDataToSend.append("location", formData.location)
    formDataToSend.append("is_home", formData.isHome.toString())

    if (editingId !== null) {
      formDataToSend.append("id", String(editingId))
      await updateTieAction(formDataToSend)
    } else {
      await createTieAction(formDataToSend)
    }

    handleCancel()
    router.refresh()
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({
      seasonId: seasons[0] ? String(seasons[0].id) : "",
      teamId: teams[0] ? String(teams[0].id) : "",
      opponent: "",
      tieDate: "",
      tieTime: "",
      location: "",
      isHome: true,
      notes: "",
    })
  }

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this tie?")) {
      await deleteTieAction(String(id))
      router.refresh()
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Ties</h2>
          <p className="mt-2 text-gray-600">Manage your matches</p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tie
        </Button>
      </div>

      {(isAdding || editingId !== null) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId !== null ? "Edit Tie" : "Add New Tie"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="season">Season</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="team">Team</Label>
                  <Select
                    value={formData.teamId}
                    onValueChange={(value) => setFormData({ ...formData, teamId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={String(team.id)}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opponent">Opponent</Label>
                  <Input
                    id="opponent"
                    value={formData.opponent}
                    onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                    placeholder="e.g., 1. TC Neustadt"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tieDate">Date</Label>
                  <Input
                    id="tieDate"
                    type="date"
                    value={formData.tieDate}
                    onChange={(e) => setFormData({ ...formData, tieDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tieTime">Time</Label>
                  <Input
                    id="tieTime"
                    type="time"
                    value={formData.tieTime}
                    onChange={(e) => setFormData({ ...formData, tieTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Rammenau"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isHome">Home/Away</Label>
                  <Select
                    value={formData.isHome.toString()}
                    onValueChange={(value) => setFormData({ ...formData, isHome: value === "true" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Home</SelectItem>
                      <SelectItem value="false">Away</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button type="submit">
                  <Check className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {initialTies.map((tie) => {
          const date = new Date(tie.tieDate)
          return (
            <Card key={tie.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <h3 className="text-lg font-semibold">
                    {tie.teamName} vs {tie.opponent}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-sm text-gray-600">{tie.location}</p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${
                      tie.isHome ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {tie.isHome ? "Home" : "Away"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(tie)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(tie.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </main>
  )
}
