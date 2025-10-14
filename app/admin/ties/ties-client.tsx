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

type TiesClientProps = {
  initialTies: any[]
  teams: any[]
  seasons: any[]
}

export function TiesClient({ initialTies, teams, seasons }: TiesClientProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    seasonId: seasons[0]?.id || "",
    teamId: teams[0]?.id || "",
    opponent: "",
    tieDate: "",
    tieTime: "",
    location: "",
    isHome: true,
    notes: "",
  })

  const handleEdit = (tie: any) => {
    setEditingId(tie.id)
    const date = new Date(tie.date_time)
    const dateStr = date.toISOString().split("T")[0]
    const timeStr = date.toTimeString().slice(0, 5)
    setFormData({
      seasonId: tie.season_id,
      teamId: tie.team_id,
      opponent: tie.opponent,
      tieDate: dateStr,
      tieTime: timeStr,
      location: tie.location || "",
      isHome: tie.is_home,
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

    if (editingId) {
      formDataToSend.append("id", editingId)
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
      seasonId: seasons[0]?.id || "",
      teamId: teams[0]?.id || "",
      opponent: "",
      tieDate: "",
      tieTime: "",
      location: "",
      isHome: true,
      notes: "",
    })
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this tie?")) {
      const formData = new FormData()
      formData.append("id", id)
      await deleteTieAction(formData)
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
                        <SelectItem key={season.id} value={season.id}>
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
                        <SelectItem key={team.id} value={team.id}>
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
          const date = new Date(tie.date_time)
          return (
            <Card key={tie.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <h3 className="text-lg font-semibold">
                    {tie.team_name} vs {tie.opponent}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-sm text-gray-600">{tie.location}</p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${
                      tie.is_home ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {tie.is_home ? "Home" : "Away"}
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
