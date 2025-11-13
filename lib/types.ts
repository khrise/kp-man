export interface User {
  id: number
  username: string
  email: string
  role: "admin" | "user" | "team_captain" | "player"
  playerId: number | null
  createdAt: Date
  updatedAt: Date
}

export interface Season {
  id: number
  name: string
  startDate: Date
  endDate: Date
  accessCode: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Team {
  id: number
  seasonId: number
  name: string
  league: string | null
  teamSize: number
  playerIds: number[]
  createdAt: Date
  updatedAt: Date
}

export interface Player extends PlayerBase {
  createdAt: Date
  updatedAt: Date
}

export interface PlayerBase {
  id: number
  firstName: string
  lastName: string
}

export interface PlayerWithRank extends Player {
  playerRank: number
}

export type PlayerAdminListItem = Pick<Player, "id" | "firstName" | "lastName"> & {
  teams: { id: number; name: string; seasonName: string; rank: number }[]
}

export interface Tie {
  id: number
  teamId: number
  opponent: string
  tieDate: Date
  location: string | null
  isHome: boolean
  isReady: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Participation {
  id: number
  tieId: number
  playerId: number
  status: "confirmed" | "maybe" | "declined"
  comment: string | null // Added comment field for participation notes
  isInLineup: boolean // Whether this confirmed player is selected for the actual lineup
  respondedAt: Date
  createdAt: Date
  updatedAt: Date
}

// Extended types with relations
export interface TieWithDetails extends Tie {
  team: Team
  participations: (Participation & { player: PlayerWithRank })[]
  confirmedCount: number
  maybeCount: number
  declinedCount: number
}

export interface TeamWithPlayers extends Team {
  players: Player[]
}

export interface SeasonWithTeams extends Season {
  teams: TeamWithPlayers[]
}
