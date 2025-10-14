"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Check, X } from "lucide-react"
import { createSeasonAction, updateSeasonAction, deleteSeasonAction } from "@/app/actions/seasons"

type Season = {
  id: string
  name: string
  start_date: string
  end_date: string
  access_code: string
  created_at: string
  updated_at: string
}

function generateAccessCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function SeasonsClient({ initialSeasons }: { initialSeasons: Season[] }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    access_code: "",
  })

  const handleAddNew = () => {
    setIsAdding(true)
    setFormData({
      name: "",
      start_date: "",
      end_date: "",
      access_code: generateAccessCode(),
    })
  }

  const handleEdit = (season: Season) => {
    setEditingId(season.id)
    const formatDate = (date: string | Date) => {
      const dateObj = typeof date === "string" ? new Date(date) : date
      return dateObj.toISOString().split("T")[0]
    }

    setFormData({
      name: season.name,
      start_date: formatDate(season.start_date),
      end_date: formatDate(season.end_date),
      access_code: season.access_code,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formDataObj = new FormData()
    formDataObj.append("name", formData.name)
    formDataObj.append("start_date", formData.start_date)
    formDataObj.append("end_date", formData.end_date)
    formDataObj.append("access_code", formData.access_code)

    if (editingId) {
      await updateSeasonAction(editingId, formDataObj)
      setEditingId(null)
    } else {
      await createSeasonAction(formDataObj)
      setIsAdding(false)
    }

    setFormData({ name: "", start_date: "", end_date: "", access_code: "" })
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ name: "", start_date: "", end_date: "", access_code: "" })
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this season?")) {
      await deleteSeasonAction(id)
    }
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Seasons</h2>
          <p className="mt-2 text-gray-600">Manage your sports seasons</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Season
        </Button>
      </div>

      {(isAdding || editingId !== null) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId !== null ? "Edit Season" : "Add New Season"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Season Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Saison 2025/2026"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="access_code">Access Code</Label>
                  <Input
                    id="access_code"
                    value={formData.access_code}
                    onChange={(e) => setFormData({ ...formData, access_code: e.target.value })}
                    placeholder="e.g., SEASON2025"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
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
        {initialSeasons.map((season) => (
          <Card key={season.id}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <h3 className="text-lg font-semibold">{season.name}</h3>
                <p className="text-sm text-gray-600">
                  {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
                </p>
                <p className="mt-1 text-sm text-gray-600">Access Code: {season.access_code}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(season)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(season.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
