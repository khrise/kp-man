export type Locale = "de" | "en"

export const translations = {
  de: {
    // Common
    save: "Speichern",
    cancel: "Abbrechen",
    delete: "Löschen",
    edit: "Bearbeiten",
    add: "Hinzufügen",
    close: "Schließen",
    logout: "Abmelden",
    exit: "Beenden",

    // Auth
    login: "Anmelden",
    username: "Benutzername",
    password: "Passwort",
    adminLogin: "Admin Login",
    enterCredentials: "Geben Sie Ihre Anmeldedaten ein, um auf das Admin-Dashboard zuzugreifen",
    invalidCredentials: "Ungültiger Benutzername oder Passwort",
    loggingIn: "Anmelden...",

    // Public Access
    sportsClubPlanning: "Sportverein Planung",
    enterAccessCode: "Geben Sie Ihren Saison-Zugangscode ein, um bevorstehende Spiele anzuzeigen",
    seasonAccessCode: "Saison-Zugangscode",
    accessSeason: "Saison zugreifen",
    invalidAccessCode: "Ungültiger Zugangscode. Bitte versuchen Sie es erneut.",
    administrator: "Administrator?",
    loginHere: "Hier anmelden",
    demoAccessCode: "Demo-Zugangscode:",

    // Spieltage
    upcomingMatches: "Kommende Spieltage",
    impersonatePlayer: "Impersonate Player:",
    showFilters: "Filter anzeigen",
    hideFilters: "Filter ausblenden",
    showDetails: "Details anzeigen",
    confirm: "Bestätigen",
    maybe: "Vielleicht",
    decline: "Ablehnen",
    participants: "Teilnehmer",
    undecided: "unentschlossen",
    notOnTeam: "Sie sind kein Mitglied dieses Teams",

    // Participation Comments
    addComment: "Kommentar hinzufügen",
    participationComment: "Teilnahme-Kommentar",
    addOptionalComment: "Fügen Sie einen optionalen Kommentar zu Ihrer Teilnahme hinzu",
    commentLabel: "Kommentar (optional)",
    commentPlaceholder: "Geben Sie hier Ihren Kommentar ein...",
    comment: "Kommentar",

    // Tie Details
    notes: "Notizen",
    confirmed: "Bestätigt",
    declined: "Abgelehnt",
    noResponses: "Noch keine Rückmeldungen",

    // Admin Dashboard
    dashboard: "Dashboard",
    manageSportsClub: "Verwalten Sie Ihre Sportverein-Planungsanwendung",
    seasons: "Saisons",
    teams: "Teams",
    players: "Spieler",
    ties: "Spieltage",
    activeAndArchived: "Aktive und archivierte Saisons",
    teamsInSeason: "Teams in aktueller Saison",
    registeredPlayers: "Registrierte Spieler",
    upcomingTies: "Bevorstehende Spieltage",
    quickActions: "Schnellaktionen",
    commonTasks: "Häufige administrative Aufgaben",
    manageSeasons: "Saisons verwalten",
    manageTeams: "Teams verwalten",
    managePlayers: "Spieler verwalten",
    manageTies: "Spieltage verwalten",
    recentActivity: "Letzte Aktivität",
    latestUpdates: "Neueste Updates und Änderungen",

    // Seasons
    manageSeasonsDesc: "Verwalten Sie Ihre Sportsaisons",
    addSeason: "Saison hinzufügen",
    addNewSeason: "Neue Saison hinzufügen",
    seasonName: "Saisonname",
    accessCode: "Zugangscode",
    startDate: "Startdatum",
    endDate: "Enddatum",
    active: "Aktiv",
    confirmDeleteSeason: "Sind Sie sicher, dass Sie diese Saison löschen möchten?",

    // Teams
    manageTeamsDesc: "Verwalten Sie Ihre Teams",
    addTeam: "Team hinzufügen",
    addNewTeam: "Neues Team hinzufügen",
    teamName: "Teamname",
    league: "Liga",
    season: "Saison",
    confirmDeleteTeam: "Sind Sie sicher, dass Sie dieses Team löschen möchten?",

    // Players
    managePlayersDesc: "Verwalten Sie Ihre Spieler",
    addPlayer: "Spieler hinzufügen",
    batchAdd: "Batch hinzufügen",
    addNewPlayer: "Neuen Spieler hinzufügen",
    batchAddPlayers: "Spieler in Batch hinzufügen",
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail",
    phone: "Telefon",
    enterPlayerData: "Spielerdaten eingeben (eine pro Zeile: Vorname, Nachname, E-Mail, Telefon)",
    addPlayers: "Spieler hinzufügen",
    confirmDeletePlayer: "Sind Sie sicher, dass Sie diesen Spieler löschen möchten?",

    // Ties
    manageTiesDesc: "Verwalten Sie Ihre Spiele",
    addTie: "Spieltag hinzufügen",
    addNewTie: "Neuen Spieltag hinzufügen",
    team: "Team",
    opponent: "Gegner",
    date: "Datum",
    time: "Zeit",
    location: "Ort",
    homeAway: "Heim/Auswärts",
    home: "Heim",
    away: "Auswärts",
    vs: "gegen",
    manageMatches: "Spieltage verwalten",
    importTies: "Spieltage importieren",
    importUrl: "Import-URL",
    importUrlPlaceholder: "Geben Sie die URL der Seite mit den Spieltagen ein",
    importTableNotFound: "Keine passende Tabelle auf der Seite gefunden",
    imported: "importiert",
    importFailed: "Import fehlgeschlagen",
    importing: "Importiere...",
    parsing: "Analysiere...",
    fetch: "Abrufen",
    parsedTies: "Gefundene Spieltage",
    previewTies: "Vorschau der Spieltage",
    importSelected: "Ausgewählte importieren",
    clearPreview: "Vorschau löschen",
    corsError: "Fehler beim Laden der Seite. Bitte überprüfen Sie die URL.",
    confirmDeleteTie: "Sind Sie sicher, dass Sie diesen Spieltag löschen möchten?",
  },
  en: {
    // Common
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    close: "Close",
    logout: "Logout",
    exit: "Exit",

    // Auth
    login: "Login",
    username: "Username",
    password: "Password",
    adminLogin: "Admin Login",
    enterCredentials: "Enter your credentials to access the admin dashboard",
    invalidCredentials: "Invalid username or password",
    loggingIn: "Logging in...",

    // Public Access
    sportsClubPlanning: "Sports Club Planning",
    enterAccessCode: "Enter your season access code to view upcoming matches",
    seasonAccessCode: "Season Access Code",
    accessSeason: "Access Season",
    invalidAccessCode: "Invalid access code. Please try again.",
    administrator: "Administrator?",
    loginHere: "Login here",
    demoAccessCode: "Demo access code:",

    // Spieltage
    upcomingMatches: "Upcoming Matches",
    impersonatePlayer: "Impersonate Player:",
    showFilters: "Show Filters",
    hideFilters: "Hide Filters",
    showDetails: "Show Details",
    confirm: "Confirm",
    maybe: "Maybe",
    decline: "Decline",
    participants: "participants",
    undecided: "undecided",
    notOnTeam: "You are not a member of this team",

    // Participation Comments
    addComment: "Add Comment",
    participationComment: "Participation Comment",
    addOptionalComment: "Add an optional comment to your participation",
    commentLabel: "Comment (optional)",
    commentPlaceholder: "Enter your comment here...",
    comment: "Comment",

    // Tie Details
    notes: "Notes",
    confirmed: "Confirmed",
    declined: "Declined",
    noResponses: "No responses yet",

    // Admin Dashboard
    dashboard: "Dashboard",
    manageSportsClub: "Manage your sports club planning application",
    seasons: "Seasons",
    teams: "Teams",
    players: "Players",
    ties: "Ties",
    activeAndArchived: "Active and archived seasons",
    teamsInSeason: "Teams in current season",
    registeredPlayers: "Registered players",
    upcomingTies: "Scheduled matches",
    quickActions: "Quick Actions",
    commonTasks: "Common administrative tasks",
    manageSeasons: "Manage Seasons",
    manageTeams: "Manage Teams",
    managePlayers: "Manage Players",
    manageTies: "Manage Ties",
    recentActivity: "Recent Activity",
    latestUpdates: "Latest updates and changes",

    // Seasons
    manageSeasonsDesc: "Manage your sports seasons",
    addSeason: "Add Season",
    addNewSeason: "Add New Season",
    seasonName: "Season Name",
    accessCode: "Access Code",
    startDate: "Start Date",
    endDate: "End Date",
    active: "Active",
    confirmDeleteSeason: "Are you sure you want to delete this season?",

    // Teams
    manageTeamsDesc: "Manage your teams",
    addTeam: "Add Team",
    addNewTeam: "Add New Team",
    teamName: "Team Name",
    league: "League",
    season: "Season",
    confirmDeleteTeam: "Are you sure you want to delete this team?",

    // Players
    managePlayersDesc: "Manage your players",
    addPlayer: "Add Player",
    batchAdd: "Batch Add",
    addNewPlayer: "Add New Player",
    batchAddPlayers: "Batch Add Players",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    enterPlayerData: "Enter player data (one per line: FirstName, LastName, Email, Phone)",
    addPlayers: "Add Players",
    confirmDeletePlayer: "Are you sure you want to delete this player?",

    // Ties
    manageTiesDesc: "Manage your matches",
    addTie: "Add Tie",
    addNewTie: "Add New Tie",
    team: "Team",
    opponent: "Opponent",
    date: "Date",
    time: "Time",
    location: "Location",
    homeAway: "Home/Away",
    home: "Home",
    away: "Away",
    vs: "vs",
    manageMatches: "Manage your ties",
    importTies: "Import Ties",
    importUrl: "Import URL",
    importUrlPlaceholder: "Enter the page URL that contains the ties table",
    importTableNotFound: "No matching table found on the page",
    imported: "imported",
    importFailed: "Import failed",
    importing: "Importing...",
    parsing: "Parsing...",
    fetch: "Fetch",
    parsedTies: "Found ties",
    previewTies: "Preview ties",
    importSelected: "Import selected",
    clearPreview: "Clear preview",
    corsError: "Error loading page. Please check the URL.",
    confirmDeleteTie: "Are you sure you want to delete this tie?",
  },
}

export function getLocale(): Locale {
  if (typeof window === "undefined") return "de"
  return (localStorage.getItem("locale") as Locale) || "de"
}

export function setLocale(locale: Locale): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("locale", locale)
  }
}

export function t(key: keyof typeof translations.de, locale?: Locale): string {
  const currentLocale = locale || getLocale()
  return translations[currentLocale][key] || key
}

export function useTranslation() {
  const locale = getLocale()

  return {
    t: (key: keyof typeof translations.de) => t(key, locale),
    locale,
    setLocale,
  }
}
