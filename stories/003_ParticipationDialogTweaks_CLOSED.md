# Participation Dialog Tweaks

## User Story

As a **Visitor viewing upcoming ties**
I want **the participation dialog to show players sorted by their team rank and buttons that reflect the current participation state**
So that **I can quickly understand player status and respond with clearer actions**

## Acceptance Criteria

- [x] In the public ties participation dialog, players listed under each status (confirmed, maybe, declined) are sorted by their `playerRank` within the team.
- [x] The confirm/decline buttons change their label based on the player’s current participation status:
  - When a player’s status is already "confirmed", the confirm button label reads "confirmed" (DE: "zugesagt").
  - When a player’s status is already "declined", the decline button label reads "declined" (DE: "abgesagt").
  - Otherwise, the buttons use the existing action verbs (e.g. "Confirm"/"Bestätigen" and "Decline"/"Ablehnen").
  - The intermediate "maybe" button keeps its current label.
- [x] Button label logic is applied consistently for both the public participation dialog and any shared components reusing the same controls.
- [x] No regression to selecting participation statuses across locales.

## Technical Requirements

- Update participation dialog logic in the public ties UI (`app/ties/...` components) to sort players by `playerRank`.
- Adjust button rendering to derive the correct label per participation state, reusing existing i18n keys or adding new ones as needed in `lib/i18n.ts`.
- Ensure the logic handles players without a defined `playerRank` gracefully (fallback to alphabetical order or end of list).

## Implementation Notes

- Review existing participation dialog component to identify where player lists and buttons are rendered.
- Reuse utilities or create helpers to format button labels so the logic stays concise.
- Confirm both German and English labels reflect the new wording.

## Testing Notes

- Manually verify the participation dialog for ties with varying player statuses in both locales.
- Test transitions between statuses (confirm → decline → maybe, etc.) to ensure the button labels update immediately.
- Run `npm run build` after completing the changes.
