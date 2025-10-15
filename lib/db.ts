import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export { sql }

// Database query functions
export async function getSeasons() {
  const seasons = await sql`SELECT * FROM seasons ORDER BY start_date DESC`
  return seasons
}

export async function getSeasonById(id: string) {
  const [season] = await sql`SELECT * FROM seasons WHERE id = ${id}`
  return season
}

export async function getSeasonByAccessCode(accessCode: string) {
  const [season] = await sql`SELECT * FROM seasons WHERE access_code = ${accessCode}`
  return season
}

export async function createSeason(data: { name: string; start_date: string; end_date: string; access_code: string }) {
  const [season] = await sql`
    INSERT INTO seasons (name, start_date, end_date, access_code)
    VALUES (${data.name}, ${data.start_date}, ${data.end_date}, ${data.access_code})
    RETURNING *
  `
  return season
}

export async function updateSeason(
  id: string,
  data: {
    name: string
    start_date: string
    end_date: string
    access_code: string
  },
) {
  const [season] = await sql`
    UPDATE seasons
    SET name = ${data.name}, start_date = ${data.start_date}, end_date = ${data.end_date}, access_code = ${data.access_code}
    WHERE id = ${id}
    RETURNING *
  `
  return season
}

export async function deleteSeason(id: string) {
  await sql`DELETE FROM seasons WHERE id = ${id}`
}

// Teams
export async function getTeams() {
  const teams = await sql`SELECT * FROM teams ORDER BY name`
  return teams
}

export async function getTeamById(id: string) {
  const [team] = await sql`SELECT * FROM teams WHERE id = ${id}`
  return team
}

export async function createTeam(data: { season_id: string; name: string; league: string }) {
  const [team] = await sql`
    INSERT INTO teams (season_id, name, league)
    VALUES (${data.season_id}, ${data.name}, ${data.league})
    RETURNING *
  `
  return team
}

export async function updateTeam(id: string, data: { season_id: string; name: string; league: string }) {
  const [team] = await sql`
    UPDATE teams
    SET season_id = ${data.season_id}, name = ${data.name}, league = ${data.league}
    WHERE id = ${id}
    RETURNING *
  `
  return team
}

export async function deleteTeam(id: string) {
  await sql`DELETE FROM teams WHERE id = ${id}`
}

// Team Players
export async function getTeamPlayers(teamId: string) {
  const players = await sql`
    SELECT p.id, p.first_name, p.last_name, p.email, p.created_at, tp.team_id, tp.player_id, tp.player_rank
    FROM players p
    JOIN team_players tp ON p.id = tp.player_id
    WHERE tp.team_id = ${teamId}
    ORDER BY tp.player_rank
  `
  return players
}

export async function setTeamPlayers(teamId: string, playerIds: string[]) {
  // Delete existing team players
  await sql`DELETE FROM team_players WHERE team_id = ${teamId}`

  // Insert new team players with ranks using individual inserts
  for (let i = 0; i < playerIds.length; i++) {
    const playerId = playerIds[i]
    const rank = i + 1
    await sql`
      INSERT INTO team_players (team_id, player_id, player_rank)
      VALUES (${teamId}, ${playerId}, ${rank})
    `
  }
}

// Players
export async function getPlayers() {
  const players = await sql`SELECT * FROM players ORDER BY last_name, first_name`
  return players
}

export async function getPlayerById(id: string) {
  const [player] = await sql`SELECT * FROM players WHERE id = ${id}`
  return player
}

export async function createPlayer(data: { first_name: string; last_name: string; email: string }) {
  const [player] = await sql`
    INSERT INTO players (first_name, last_name, email)
    VALUES (${data.first_name}, ${data.last_name}, ${data.email})
    RETURNING *
  `
  return player
}

export async function updatePlayer(id: string, data: { first_name: string; last_name: string; email: string }) {
  const [player] = await sql`
    UPDATE players
    SET first_name = ${data.first_name}, last_name = ${data.last_name}, email = ${data.email}
    WHERE id = ${id}
    RETURNING *
  `
  return player
}

export async function deletePlayer(id: string) {
  await sql`DELETE FROM players WHERE id = ${id}`
}

// Ties
export async function getTies() {
  const ties = await sql`
    SELECT t.*, tm.name as team_name, s.name as season_name
    FROM ties t
    JOIN teams tm ON t.team_id = tm.id
    JOIN seasons s ON tm.season_id = s.id
    ORDER BY t.tie_date DESC
  `
  return ties
}

export async function getTiesBySeasonId(seasonId: string) {
  const ties = await sql`
    SELECT t.id, t.team_id, t.opponent, t.tie_date as date_time, t.location, t.is_home, t.created_at, tm.name as team_name
    FROM ties t
    JOIN teams tm ON t.team_id = tm.id
    WHERE tm.season_id = ${seasonId}
    ORDER BY t.tie_date ASC
  `
  return ties
}

export async function getTieById(id: string) {
  const [tie] = await sql`SELECT * FROM ties WHERE id = ${id}`
  return tie
}

export async function createTie(data: {
  team_id: string
  opponent: string
  tie_date: string
  location: string
  is_home: boolean
}) {
  const [tie] = await sql`
    INSERT INTO ties (team_id, opponent, tie_date, location, is_home)
    VALUES (${data.team_id}, ${data.opponent}, ${data.tie_date}, ${data.location}, ${data.is_home})
    RETURNING *
  `
  return tie
}

export async function updateTie(
  id: string,
  data: {
    team_id: string
    opponent: string
    tie_date: string
    location: string
    is_home: boolean
  },
) {
  const [tie] = await sql`
    UPDATE ties
    SET team_id = ${data.team_id}, opponent = ${data.opponent}, 
        tie_date = ${data.tie_date}, location = ${data.location}, is_home = ${data.is_home}
    WHERE id = ${id}
    RETURNING *
  `
  return tie
}

export async function deleteTie(id: string) {
  await sql`DELETE FROM ties WHERE id = ${id}`
}

// Participations
export async function getParticipations(tieId: string) {
  const participations = await sql`
    SELECT p.*, pl.first_name, pl.last_name, tp.player_rank as player_rank
    FROM participations p
    JOIN players pl ON p.player_id = pl.id
    JOIN ties t ON p.tie_id = t.id
    JOIN teams tm ON t.team_id = tm.id
    JOIN team_players tp ON pl.id = tp.player_id AND tm.id = tp.team_id
    WHERE p.tie_id = ${tieId}
    ORDER BY p.status, pl.last_name, pl.first_name
  `
  return participations
}

export async function upsertParticipation(data: {
  tie_id: string
  player_id: string
  status: "confirmed" | "maybe" | "declined"
  comment?: string | null
}) {
  const [participation] = await sql`
    INSERT INTO participations (tie_id, player_id, status, comment)
    VALUES (${data.tie_id}, ${data.player_id}, ${data.status}, ${data.comment || null})
    ON CONFLICT (tie_id, player_id)
    DO UPDATE SET status = ${data.status}, comment = ${data.comment || null}, updated_at = NOW()
    RETURNING *
  `
  return participation
}

// Users (Admin)
export async function getUserByUsername(username: string) {
  const [user] = await sql`SELECT * FROM users WHERE username = ${username}`
  return user
}
