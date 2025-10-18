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
import { useTranslation } from "@/lib/i18n"

export default function PlayersPage() {
  const { t } = useTranslation()
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
    const playersToAdd: { firstName: string; lastName: string }[] = []
    
    // Parse all lines first
    for (const line of lines) {
      let firstName = ""
      let lastName = ""
      
      if (line.includes(",")) {
        // Format: "lastname, firstname"
        const [last, first] = line.split(",").map((s) => s.trim())
        firstName = first || ""
        lastName = last || ""
      } else {
        // Format: "firstname lastname"
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 2) {
          firstName = parts[0]
          lastName = parts.slice(1).join(" ") // Handle multiple last names
        } else if (parts.length === 1) {
          firstName = parts[0]
          lastName = ""
        }
      }
      
      if (firstName || lastName) {
        playersToAdd.push({ firstName, lastName })
      }
    }
    
    // Filter out duplicates (both within the batch and against existing players)
    const uniquePlayersToAdd = playersToAdd.filter((newPlayer, index, arr) => {
      // Check for duplicates within the batch itself
      const firstOccurrence = arr.findIndex(p => 
        p.firstName.toLowerCase() === newPlayer.firstName.toLowerCase() && 
        p.lastName.toLowerCase() === newPlayer.lastName.toLowerCase()
      )
      if (firstOccurrence !== index) return false
      
      // Check against existing players
      const existingPlayer = players.find(existing => 
        existing.firstName.toLowerCase() === newPlayer.firstName.toLowerCase() && 
        existing.lastName.toLowerCase() === newPlayer.lastName.toLowerCase()
      )
      return !existingPlayer
    })
    
    // Add only unique players
    let importedCount = 0
    for (const player of uniquePlayersToAdd) {
      const formDataObj = new FormData()
      formDataObj.append("first_name", player.firstName)
      formDataObj.append("last_name", player.lastName)

      try {
        await createPlayerAction(formDataObj)
        importedCount++
      } catch (error) {
        console.error("Failed to add player:", player, error)
      }
    }
    
    await loadPlayers()
    setIsBatchAdding(false)
    setBatchData("")
    
    // Show import results
    const totalParsed = playersToAdd.length
    const skippedCount = totalParsed - importedCount
    
    if (totalParsed === 0) {
      alert(t('noPlayersToImport'))
    } else if (skippedCount === 0) {
      alert(`${t('importSuccess')}: ${importedCount} ${importedCount === 1 ? t('player') : t('players')}`)
    } else if (importedCount === 0) {
      alert(`${t('allPlayersSkipped')}: ${skippedCount} ${skippedCount === 1 ? t('player') : t('players')}`)
    } else {
      alert(`${t('importResult')}: ${importedCount} ${t('imported')}, ${skippedCount} ${t('skipped')}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('confirmDeletePlayer'))) {
      await deletePlayerAction(id)
      await loadPlayers()
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-3xl font-bold text-gray-900">{t('players')}</h2>
              <p className="mt-2 text-gray-600">
                {t('managePlayersDesc')} • {players.length} {players.length === 1 ? t('player') : t('players')}
              </p>
            </div>
            <div className="flex gap-2 sm:flex-shrink-0">
              <Button variant="outline" onClick={() => setIsBatchAdding(true)}>
                <Upload className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t('batchAdd')}</span>
                <span className="sm:hidden">{t('batchAdd')}</span>
              </Button>
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t('addPlayer')}</span>
                <span className="sm:hidden">{t('add')}</span>
              </Button>
            </div>
          </div>

          {(isAdding || editingId !== null) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingId !== null ? t('editPlayer') : t('addNewPlayer')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('firstName')}</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="e.g., John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('lastName')}</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="e.g., Doe"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={editingId !== null ? handleUpdate : handleAdd}>
                    <Check className="mr-2 h-4 w-4" />
                    {t('save')}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" />
                    {t('cancel')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isBatchAdding && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t('batchAddPlayers')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="batchData">{t('enterPlayerData')}</Label>
                  <Textarea
                    id="batchData"
                    value={batchData}
                    onChange={(e) => setBatchData(e.target.value)}
                    placeholder="Doe, John"
                    rows={6}
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleBatchAdd}>
                    <Check className="mr-2 h-4 w-4" />
                    {t('addPlayers')}
                  </Button>
                  <Button variant="outline" onClick={() => setIsBatchAdding(false)}>
                    <X className="mr-2 h-4 w-4" />
                    {t('cancel')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {players.map((player) => (
              <Card key={player.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold truncate">
                        {player.firstName} {player.lastName}
                      </h3>
                    </div>
                    <div className="flex gap-2 sm:flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(player)}>
                        <Edit className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">{t('edit')}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(String(player.id))}>
                        <Trash2 className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">{t('delete')}</span>
                      </Button>
                    </div>
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
