# Tabular participations view per week

As a player or team captain, I want to see a tabular overview of all participations in matches for a given week, so that I can easily see who is participating in which matches and when. Also, I can detect any conflicts or gaps in the lineups.

The public ties view should include a tabular overview of all participations in matches for a given week. A switch sould be placed in the separators separating the calender weeks. When the switch is turned on, the tabular overview should be displayed for the respective week. The table should have the playername as first column, and include one column per tie, where the tie header contains the date, the team name and the opponent team. Each row in the table should represent a player. The first column should contain the player name, and the subsequent columns should indicate whether the player is participating in the respective tie (e.g., with a checkmark or "Yes"/"No").
The table should be sortable by player name and by team rank. A feasible solution for the fact that a player can have different ranks in different teams is to display the highest rank of the player across all teams in the first column, and to include a tooltip or additional information that shows the player's rank in each team when hovering over the player name.
The weekly tabular overview should be displayed instead of the default view when the switch is turned on. When the tabular view is being switched on, the data should be re-fetched if it had been displayed before.

## Acceptance Criteria

- [x] The public ties view includes a tabular overview of all participations in matches for a given week.
- [x] A switch is placed in the separators separating the calendar weeks, allowing users to toggle the display of the tabular overview for the respective week.
- [x] The table has the player name as the first column and includes one column per tie, with the tie header containing the date, the team name, and the opponent team.
- [x] Each row in the table represents a player, with the first column containing the player name and subsequent columns indicating whether the player is participating in the respective tie (e.g., with a checkmark or "Yes"/"No").
- [x] a small indicator with a tooltip for each particular participation should provide the comment for that participation, if available.
- [x] The table is sortable by player name and by team rank.
- [x] The first column displays player name and includes a tooltip or additional information that shows the player's rank in each team when hovering over the player name.
- [x] The tabular overview allows users to easily see who is participating in which matches and when, and to detect any conflicts or gaps in the lineups.
- [x] A loading indicator is displayed while the data for the tabular overview is being fetched and rendered, ensuring a smooth user experience.
- [x] Each tie might be loaded separately to improve performance, especially for weeks with many ties. In this case, a loading indicator should be displayed in the respective column while the data for that tie is being fetched and rendered.
- [x] The weekly tabular overview should be displayed instead of the default view when the switch is turned on. Data should be re-fetched when the tabular view is being switched on.
