"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, Check, X } from "lucide-react"
import { createSeasonAction, updateSeasonAction, deleteSeasonAction } from "@/app/actions/seasons"
import { useTranslation } from "@/lib/i18n"
import Link from "next/link"

type Season = {
  id: number
  name: string
  startDate: Date
  endDate: Date
  accessCode: string
  isActive: boolean
  isCurrent: boolean
  createdAt: Date
  updatedAt: Date
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
  const { t } = useTranslation()
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    accessCode: "",
    isCurrent: false,
  })

  const handleAddNew = () => {
    setIsAdding(true)
    setFormData({
      name: "",
      startDate: "",
      endDate: "",
      accessCode: generateAccessCode(),
      isCurrent: false,
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
      startDate: formatDate(season.startDate),
      endDate: formatDate(season.endDate),
      accessCode: season.accessCode,
      isCurrent: season.isCurrent,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formDataObj = new FormData()
    formDataObj.append("name", formData.name)
    formDataObj.append("start_date", formData.startDate)
    formDataObj.append("end_date", formData.endDate)
    formDataObj.append("access_code", formData.accessCode)
    formDataObj.append("is_current", String(formData.isCurrent))

    if (editingId !== null) {
      await updateSeasonAction(String(editingId), formDataObj)
      setEditingId(null)
    } else {
      await createSeasonAction(formDataObj)
      setIsAdding(false)
    }

    setFormData({ name: "", startDate: "", endDate: "", accessCode: "", isCurrent: false })
    router.refresh()
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ name: "", startDate: "", endDate: "", accessCode: "", isCurrent: false })
  }

  const handleDelete = async (id: number) => {
    if (confirm(t("confirmDeleteSeason"))) {
      await deleteSeasonAction(String(id))
      router.refresh()
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-bold text-gray-900">{t("seasons")}</h2>
          <p className="mt-2 text-gray-600">{t("manageSeasonsDesc")}</p>
        </div>
        <div className="flex gap-2 sm:flex-shrink-0">
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t("addSeason")}</span>
            <span className="sm:hidden">{t("add")}</span>
          </Button>
        </div>
      </div>

      {(isAdding || editingId !== null) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId !== null ? t("editSeason") : t("addNewSeason")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("seasonName")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Saison 2025/2026"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="access_code">{t("accessCode")}</Label>
                  <Input
                    id="access_code"
                    value={formData.accessCode}
                    onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                    placeholder="e.g., SEASON2025"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">{t("startDate")}</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">{t("endDate")}</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Checkbox
                  id="is_current"
                  checked={formData.isCurrent}
                  onCheckedChange={(checked) => setFormData({ ...formData, isCurrent: !!checked })}
                />
                <Label htmlFor="is_current" className="cursor-pointer">
                  {t("makeCurrent")}
                </Label>
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
        {initialSeasons.map((season) => (
          <Card key={season.id}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold truncate">{season.name}</h3>
                    {season.isCurrent && (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white shrink-0">
                        {t("current")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(season.startDate).toLocaleDateString()} -{" "}
                    {new Date(season.endDate).toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 truncate">
                    {t("accessCode")}:{" "}
                    <Link
                      href={"/ties/" + season.accessCode}
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {season.accessCode}
                    </Link>
                  </p>
                </div>
                <div className="flex gap-2 sm:flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(season)}>
                    <Edit className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">{t("edit")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(season.id)}
                    disabled={season.isCurrent}
                    title={season.isCurrent ? t("cannotDeleteCurrentSeason") : t("delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">{t("delete")}</span>
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

