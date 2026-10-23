# Invitation Email text for Team Members

## User Story

As an **admin or team captain**, after finalizing the team lineup, I want **to send an invitation email to all team members with the details of the upcoming match, so I have a convenient way to inform everyone** about the match specifics and their participation.
The email should be in german language and include the following information. A text field should open in a dialog containing the email content when I click on "Send Invitations".
The email content should be as follows:

```
<teamName> vs. <opponentTeam>
(home|away)
<date> · <time> · <location> (Treff <meetingTime> Uhr vor Ort)
Aufstellung: <nominatedPlayers>
```

Meeting time is 15 minutes before the match time. Nominated players should be listed by their sorted by their rank in the team, separated by commas.

So, for example:

```
H40 vs. BW DD Blasewitz II
Auswärtsspiel
So, 4.1.2026 · 10:00 Uhr · Weinböhla (Treff 9:45 Uhr vor Ort)
Aufstellung: Frank, Christof, Micha Schröter, Wolfgang
```

## Acceptance Criteria

- [ ] When I click on "Send Invitations" after finalizing the team lineup, a dialog opens containing the email content as specified above.
- [ ] The email content dynamically includes the correct team name, opponent team, match location (home/away), date, time, location, meeting time (15 minutes before match time), and the list of nominated players sorted by their rank in the team.
- [ ] The email content is presented in German language.
- [ ] The nominated players are listed in a single line, separated by commas.
- [ ] The dialog allows me to copy the email content easily for sending.
