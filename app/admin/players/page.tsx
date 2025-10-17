"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, Check, X, Upload } from "lucide-react"
import type { Player } from "@/lib/types"
import { getPlayers, createPlayerAction, updatePlayerAction, deletePlayerAction } from "@/app/actions/players"

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isBatchAdding, setIsBatchAdding] = useState(false)
  const [batchData, setBatchData] = useState("")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
  })

  useEffect(() => {
    loadPlayers()
  }, [])

  const loadPlayers = async () => {
    const data = await getPlayers()
    setPlayers(data as unknown as Player[])
  }

  const handleEdit = (player: Player) => {
    setEditingId(String(player.id))
    setFormData({
      firstName: player.firstName,
      lastName: player.lastName,
    })
  }

  const handleUpdate = async () => {
    if (!editingId) return
    const formDataObj = new FormData()
    formDataObj.append("first_name", formData.firstName)
    formDataObj.append("last_name", formData.lastName)

    await updatePlayerAction(editingId, formDataObj)
    await loadPlayers()
    setEditingId(null)
    setFormData({ firstName: "", lastName: "" })
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ firstName: "", lastName: "" })
  }

  const handleAdd = async () => {
    const formDataObj = new FormData()
    formDataObj.append("first_name", formData.firstName)
    formDataObj.append("last_name", formData.lastName)

    await createPlayerAction(formDataObj)
    await loadPlayers()
    setIsAdding(false)
    setFormData({ firstName: "", lastName: "" })
  }

  const handleBatchAdd = async () => {
    const lines = batchData.split("\n").filter((line) => line.trim())
    for (const line of lines) {
      const [firstName, lastName] = line.split(",").map((s) => s.trim())
      const formDataObj = new FormData()
      formDataObj.append("first_name", firstName || "")
      formDataObj.append("last_name", lastName || "")

      await createPlayerAction(formDataObj)
    }
    await loadPlayers()
    setIsBatchAdding(false)
    setBatchData("")
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this player?")) {
      await deletePlayerAction(id)
      await loadPlayers()
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Players</h2>
              <p className="mt-2 text-gray-600">Manage your players</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsBatchAdding(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Batch Add
              </Button>
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Player
              </Button>
            </div>
          </div>

          {(isAdding || editingId !== null) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingId !== null ? "Edit Player" : "Add New Player"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="e.g., Christof"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="e.g., Hahn"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={editingId !== null ? handleUpdate : handleAdd}>
                    <Check className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isBatchAdding && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Batch Add Players</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="batchData">Enter player data (one per line: FirstName, LastName)</Label>
                  <Textarea
                    id="batchData"
                    value={batchData}
                    onChange={(e) => setBatchData(e.target.value)}
                    placeholder="Christof, Hahn&#10;Michael, Schmidt"
                    rows={6}
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleBatchAdd}>
                    <Check className="mr-2 h-4 w-4" />
                    Add Players
                  </Button>
                  <Button variant="outline" onClick={() => setIsBatchAdding(false)}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {players.map((player) => (
              <Card key={player.id}>
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {player.firstName} {player.lastName}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(player)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(String(player.id))}>
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
