"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Check, X, ArrowUpDown, Users } from "lucide-react"
import { createTieAction, updateTieAction, deleteTieAction } from "@/app/actions/ties"
import { useTranslation } from "@/lib/i18n"

type Tie = {
  id: number
  teamId: number
  opponent: string
  tieDate: Date
  location: string | null
  isHome: boolean
  notes: string | null
  seasonId: number
  teamName: string
  seasonName: string
  teamSize: number
  lineupCount: number
  lineupPlayers: { playerRank: number; firstName: string; lastName: string; status: string }[]
  problematicCount: number
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
  const { t } = useTranslation()
  const [isAdding, setIsAdding] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importUrl, setImportUrl] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  
  // Sorting and filtering state
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all')
  const [formData, setFormData] = useState({
    teamSeason: "",
    opponent: "",
    tieDate: "",
    tieTime: "",
    location: "",
    isHome: true,
    notes: "",
  })
  const [importTeamSeason, setImportTeamSeason] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [parsedTies, setParsedTies] = useState<Array<{
    id: string
    opponent: string
    dateText: string
    dateIso: string
    location: string
    isHome: boolean
    selected: boolean
  }>>([])
  const [importingSelected, setImportingSelected] = useState(false)

  // Extract unique team-season combinations for filtering
  const availableTeams = useMemo(() => {
    const teamSeasonSet = new Set<string>()
    initialTies.forEach(tie => {
      const teamSeasonCombo = `${tie.teamName}|${tie.seasonName}`
      teamSeasonSet.add(teamSeasonCombo)
    })
    return Array.from(teamSeasonSet)
      .map(combo => {
        const [teamName, seasonName] = combo.split('|')
        return {
          value: combo,
          label: `${teamName} (${seasonName})`,
          teamName
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [initialTies])

  // Set default import team-season when availableTeams changes
  useEffect(() => {
    if (availableTeams.length > 0 && !importTeamSeason) {
      setImportTeamSeason(availableTeams[0].value)
    }
  }, [availableTeams, importTeamSeason])

  // Set default form team-season when availableTeams changes
  useEffect(() => {
    if (availableTeams.length > 0 && !formData.teamSeason) {
      setFormData(prev => ({ ...prev, teamSeason: availableTeams[0].value }))
    }
  }, [availableTeams, formData.teamSeason])

  // Filter and sort ties
  const filteredAndSortedTies = useMemo(() => {
    let filtered = initialTies

    // Filter by team if a specific team is selected
    if (selectedTeamFilter !== 'all') {
      const [teamName, seasonName] = selectedTeamFilter.split('|')
      filtered = filtered.filter(tie => 
        tie.teamName === teamName && tie.seasonName === seasonName
      )
    }

    // Sort by tie date
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.tieDate).getTime()
      const dateB = new Date(b.tieDate).getTime()
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })

    return sorted
  }, [initialTies, selectedTeamFilter, sortOrder])

  const handleEdit = (tie: Tie) => {
    setEditingId(tie.id)
    const date = new Date(tie.tieDate)
    const dateStr = date.toISOString().split("T")[0]
    const timeStr = date.toTimeString().slice(0, 5)
    const teamSeasonValue = `${tie.teamName}|${tie.seasonName}`
    setFormData({
      teamSeason: teamSeasonValue,
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

    // Extract team and season from selected combination
    const [selectedTeamName, selectedSeasonName] = formData.teamSeason.split('|')
    const selectedTeam = teams.find(t => t.name === selectedTeamName)
    const selectedSeason = seasons.find(s => s.name === selectedSeasonName)
    
    if (!selectedTeam || !selectedSeason) {
      alert(t('selectValidTeamSeason'))
      return
    }

    const formDataToSend = new FormData()
    formDataToSend.append("season_id", String(selectedSeason.id))
    formDataToSend.append("team_id", String(selectedTeam.id))
    formDataToSend.append("opponent", formData.opponent)
    formDataToSend.append("date_time", `${formData.tieDate}T${formData.tieTime}`)
    formDataToSend.append("location", formData.location)
    formDataToSend.append("is_home", formData.isHome.toString())

    if (editingId !== null) {
      formDataToSend.append("id", String(editingId))
      await updateTieAction(String(editingId), formDataToSend)
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
      teamSeason: availableTeams.length > 0 ? availableTeams[0].value : "",
      opponent: "",
      tieDate: "",
      tieTime: "",
      location: "",
      isHome: true,
      notes: "",
    })
  }

  const handleDelete = async (id: number) => {
    if (confirm(t('confirmDeleteTie'))) {
      await deleteTieAction(String(id))
      router.refresh()
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-bold text-gray-900">{t('ties')}</h2>
          <p className="mt-2 text-gray-600">{t('manageMatches')}</p>
        </div>
        <div className="flex gap-2 sm:flex-shrink-0">
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('addTie')}</span>
            <span className="sm:hidden">{t('add')}</span>
          </Button>
          <Button variant="outline" onClick={() => setIsImporting(true)}>
            <span className="hidden sm:inline">{t('importTies')}</span>
            <span className="sm:hidden">{t('import')}</span>
          </Button>
        </div>
      </div>

      {(isAdding || editingId !== null) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId !== null ? t('editTie') : t('addNewTie')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="teamSeason">{t('teamAndSeason')}</Label>
                  <Select
                    value={formData.teamSeason}
                    onValueChange={(value) => setFormData({ ...formData, teamSeason: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeams.map((team) => (
                        <SelectItem key={team.value} value={team.value}>
                          {team.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opponent">{t('opponent')}</Label>
                  <Input
                    id="opponent"
                    value={formData.opponent}
                    onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                    placeholder="e.g., 1. TC Neustadt"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tieDate">{t('date')}</Label>
                  <Input
                    id="tieDate"
                    type="date"
                    value={formData.tieDate}
                    onChange={(e) => setFormData({ ...formData, tieDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tieTime">{t('time')}</Label>
                  <Input
                    id="tieTime"
                    type="time"
                    value={formData.tieTime}
                    onChange={(e) => setFormData({ ...formData, tieTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">{t('location')}</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Rammenau"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isHome">{t('homeAway')}</Label>
                  <Select
                    value={formData.isHome.toString()}
                    onValueChange={(value) => setFormData({ ...formData, isHome: value === "true" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t('home')}</SelectItem>
                      <SelectItem value="false">{t('away')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button type="submit">
                  <Check className="mr-2 h-4 w-4" />
                  {t('save')}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  {t('cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isImporting && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('importTies')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="importUrl">{t('importUrl')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="importUrl"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder={t('importUrlPlaceholder')}
                  />
                  <Button
                    onClick={async () => {
                      setImporting(true)
                      setImportResult(null)
                      setParsedTies([])
                      try {
                        // Fetch the remote page via our proxy to avoid CORS
                        const res = await fetch('/api/proxy-fetch', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ url: importUrl }),
                        })
                        if (!res.ok) {
                          const errorData = await res.json().catch(() => ({}))
                          throw new Error(errorData.error || `${res.status} ${res.statusText}`)
                        }
                        const { html: text } = await res.json()
                        // Parse HTML in the client
                        const parser = new DOMParser()
                        const doc = parser.parseFromString(text, 'text/html')
                        // Select all tables with class 'result-set'
                        const tables = Array.from(doc.querySelectorAll('table.result-set'))
                        console.log('Debug: Found tables with class "result-set":', tables.length)
                        tables.forEach((t, i) => console.log(`Table ${i}:`, t.outerHTML.substring(0, 200) + '...'))
                        
                        if (tables.length < 2) throw new Error(t('importTableNotFound'))
                        const table = tables[1] as HTMLTableElement
                        const rows = Array.from(table.querySelectorAll('tbody tr'))
                        console.log('Debug: Found tbody rows:', rows.length)
                        
                        // Also try without tbody as fallback
                        if (rows.length === 0) {
                          const allRows = Array.from(table.querySelectorAll('tr'))
                          console.log('Debug: Found all tr rows (fallback):', allRows.length)
                          rows.push(...allRows.slice(1)) // Skip header row
                        }
                        const parsed: Array<{
                          id: string
                          opponent: string
                          dateText: string
                          dateIso: string
                          location: string
                          isHome: boolean
                          selected: boolean
                        }> = []
                        
                        for (let i = 0; i < rows.length; i++) {
                          const row = rows[i]
                          const cells = Array.from(row.querySelectorAll('td'))
                          console.log(`Debug Row ${i}: Found ${cells.length} cells`, cells.map(c => c.textContent?.trim()))
                          // Adjusted for colspan: Skip [0], Date+Time [1], Skip [2], Location [3], Home [4], Guest [5]
                          if (cells.length < 6) {
                            console.log(`Debug: Skipping row ${i} - only ${cells.length} cells (need at least 6)`)
                            continue
                          }
                          const dateTimeText = cells[1].textContent?.trim() || '' // Date and time in format "22.11.2025 10:00"
                          const locationText = cells[3].textContent?.trim() || ''
                          const homeCell = cells[4]
                          const guestCell = cells[5]

                          let teamIsHome = true
                          let opponent = ''

                          // If homeCell contains a link, then opponent is home and our team is away
                          const homeLink = homeCell.querySelector('a')
                          if (homeLink) {
                            teamIsHome = false
                            opponent = homeCell.textContent?.trim() || ''
                          } else {
                            teamIsHome = true
                            opponent = guestCell.textContent?.trim() || ''
                          }

                          // Parse date and time. Format: "22.11.2025 10:00"
                          let dateIso = ''
                          const d = dateTimeText
                          const dateTimeMatch = d.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})\s+(\d{1,2}):(\d{2})/) // "22.11.2025 10:00"
                          if (dateTimeMatch) {
                            const day = dateTimeMatch[1].padStart(2, '0')
                            const month = dateTimeMatch[2].padStart(2, '0')
                            const year = dateTimeMatch[3]
                            const hour = dateTimeMatch[4].padStart(2, '0')
                            const minute = dateTimeMatch[5]
                            const fullYear = year.length === 2 ? '20' + year : year
                            dateIso = `${fullYear}-${month}-${day}T${hour}:${minute}:00`
                          } else {
                            // Fallback: try just date part if time is missing
                            const dotMatch = d.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/) // Just "22.11.2025"
                            if (dotMatch) {
                              const day = dotMatch[1].padStart(2, '0')
                              const month = dotMatch[2].padStart(2, '0')
                              const year = dotMatch[3]
                              const fullYear = year.length === 2 ? '20' + year : year
                              dateIso = `${fullYear}-${month}-${day}T00:00:00`
                            } else {
                              // Last fallback: try Date.parse
                              const parsed = new Date(d)
                              if (!isNaN(parsed.getTime())) {
                                dateIso = parsed.toISOString()
                              } else {
                                // Skip unparseable rows
                                console.log(`Debug: Skipping row ${i} - unparseable date: "${d}"`)
                                continue
                              }
                            }
                          }

                          parsed.push({
                            id: `tie-${i}`,
                            opponent,
                            dateText: dateTimeText, // Show the original date+time text
                            dateIso,
                            location: locationText,
                            isHome: teamIsHome,
                            selected: true // Default to selected
                          })
                        }

                        setParsedTies(parsed)
                        setImportResult(`${t('parsedTies')}: ${parsed.length}`)
                      } catch (err) {
                        console.error('Import failed', err)
                        const msg = err instanceof Error ? err.message : String(err)
                        setImportResult(`${t('importFailed')}: ${msg}`)
                      } finally {
                        setImporting(false)
                      }
                    }}
                    disabled={!importUrl || importing}
                  >
                    {importing ? t('parsing') : t('fetch')}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="importTeam">{t('teamAndSeason')}</Label>
                <Select value={importTeamSeason} onValueChange={setImportTeamSeason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeams.map((team) => (
                      <SelectItem key={team.value} value={team.value}>
                        {team.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {importResult && (
                <div className="md:col-span-2 mt-2">
                  <p className="text-sm text-gray-700">{importResult}</p>
                </div>
              )}

              {parsedTies.length > 0 && (
                <div className="md:col-span-2 mt-4">
                  <h3 className="text-lg font-semibold mb-3">{t('previewTies')}</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={parsedTies.every(t => t.selected)}
                              onChange={(e) => {
                                const allSelected = e.target.checked
                                setParsedTies(parsedTies.map(t => ({ ...t, selected: allSelected })))
                              }}
                              className="rounded"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('date')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('opponent')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('location')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('homeAway')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {parsedTies.map((tie, index) => (
                          <tr key={tie.id} className={tie.selected ? 'bg-blue-50' : ''}>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={tie.selected}
                                onChange={(e) => {
                                  const newParsedTies = [...parsedTies]
                                  newParsedTies[index].selected = e.target.checked
                                  setParsedTies(newParsedTies)
                                }}
                                className="rounded"
                              />
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {tie.dateText}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {tie.opponent}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {tie.location}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                tie.isHome ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {tie.isHome ? t('home') : t('away')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={async () => {
                        const selectedTies = parsedTies.filter(t => t.selected)
                        if (selectedTies.length === 0) return
                        
                        setImportingSelected(true)
                        let imported = 0
                        
                        try {
                          // Extract team and season from selected combination
                          const [selectedTeamName, selectedSeasonName] = importTeamSeason.split('|')
                          const selectedTeam = teams.find(t => t.name === selectedTeamName)
                          const selectedSeason = seasons.find(s => s.name === selectedSeasonName)
                          
                          if (!selectedTeam || !selectedSeason) {
                            throw new Error(t('teamSeasonNotFound'))
                          }

                          for (const tie of selectedTies) {
                            const fd = new FormData()
                            fd.append('season_id', String(selectedSeason.id))
                            fd.append('team_id', String(selectedTeam.id))
                            fd.append('opponent', tie.opponent)
                            fd.append('date_time', tie.dateIso)
                            fd.append('location', tie.location)
                            fd.append('is_home', String(tie.isHome))

                            try {
                              await createTieAction(fd)
                              imported++
                            } catch (err) {
                              console.error('Import error for tie:', tie, err)
                            }
                          }

                          setImportResult(`${imported}/${selectedTies.length} ${t('imported')}`)
                          setParsedTies([]) // Clear the preview
                          router.refresh()
                        } catch (err) {
                        console.error('Batch import failed', err)
                        const msg = err instanceof Error ? err.message : String(err)
                        setImportResult(`${t('importFailed')}: ${msg}`)
                        } finally {
                          setImportingSelected(false)
                        }
                      }}
                      disabled={importingSelected || parsedTies.filter(t => t.selected).length === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {importingSelected ? 
                        t('importing') : 
                        `${t('importSelected')} (${parsedTies.filter(t => t.selected).length})`
                      }
                    </Button>
                    <Button
                      onClick={() => setParsedTies([])}
                      variant="outline"
                    >
                      {t('clearPreview')}
                    </Button>
                  </div>
                </div>
              )}

              <div className="md:col-span-2 mt-4 flex gap-2">
                <Button onClick={() => setIsImporting(false)} variant="outline">
                  {t('close')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sorting and Filtering Controls */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="teamFilter">{t('filterByTeam')}</Label>
              <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTeams')}</SelectItem>
                  {availableTeams.map((team) => (
                    <SelectItem key={team.value} value={team.value}>
                      {team.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="sortOrder">{t('sortByDate')}</Label>
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full justify-start"
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                {sortOrder === 'asc' ? t('ascending') : t('descending')}
              </Button>
            </div>
            <div className="sm:self-end">
              <p className="text-sm text-gray-600">
                {filteredAndSortedTies.length} {t('of')} {initialTies.length} {t('tiesCount')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredAndSortedTies.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-gray-500">
                  {selectedTeamFilter === 'all' 
                    ? `${t('noTiesFound')}.` 
                    : `${t('noTiesFoundFor')} ${availableTeams.find(t => t.value === selectedTeamFilter)?.label || selectedTeamFilter}.`}
                </p>
                {selectedTeamFilter !== 'all' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTeamFilter('all')}
                    className="mt-2"
                  >
                    {t('showAllTeams')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedTies.map((tie) => {
            console.log("Rendering tie with date:", tie.tieDate)
            return (
              <Card key={tie.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold truncate">
                        {tie.teamName} {t('vs')} {tie.opponent}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {tie.tieDate.toLocaleDateString()} {tie.tieDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-sm text-gray-600 truncate">{tie.location}</p>
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          tie.isHome ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {tie.isHome ? t('home') : t('away')}
                      </span>
                      
                      {/* Lineup Teaser */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                              {t('lineup')}: {tie.lineupCount}/{tie.teamSize}
                            </span>
                            {/* Status indicator */}
                            {tie.lineupCount === 0 ? (
                              <span className="h-2 w-2 rounded-full bg-gray-400" title={t('noLineup')}></span>
                            ) : tie.problematicCount > 0 ? (
                              <span className="h-2 w-2 rounded-full bg-red-500" title={t('lineupIssues')}></span>
                            ) : tie.lineupCount < tie.teamSize ? (
                              <span className="h-2 w-2 rounded-full bg-yellow-500" title={t('lineupIncomplete')}></span>
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-green-500" title={t('lineupComplete')}></span>
                            )}
                          </div>
                        </div>
                        
                        {/* Player preview */}
                        {tie.lineupPlayers.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs text-gray-500 truncate">
                              {tie.lineupPlayers.slice(0, 3).map(p => `#${p.playerRank} ${p.firstName} ${p.lastName.charAt(0)}.`).join(', ')}
                              {tie.lineupPlayers.length > 3 && '...'}
                            </p>
                          </div>
                        )}
                        
                        {/* Problem alert */}
                        {tie.problematicCount > 0 && (
                          <div className="mt-1">
                            <p className="text-xs text-red-600 font-medium">
                              ⚠️ {tie.problematicCount} {tie.problematicCount === 1 ? t('playerNeedsAttention') : t('playersNeedAttention')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 sm:flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => router.push(`/admin/ties/${tie.id}/lineup`)}
                      >
                        <Users className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">{t('manageLineup')}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(tie)}>
                        <Edit className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">{t('edit')}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(tie.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">{t('delete')}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </main>
  )
}
