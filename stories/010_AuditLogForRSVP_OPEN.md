# Audit log for RSVPs

## User Story

As an admin I want to see the audit trail of player feedbacks to their tie participation. All new feedbacks as well as changes should be recorded (player name, timestamp, feedback) and displayed in a new section at the bottom of the lineup view. The view should contain the list of players and all their feedbacks.

## Acceptance Criteria

- [ ] All new participation responses (create) are recorded in an audit table with at least: participationId, playerId, tieId, previousStatus, newStatus, comment (nullable), changedBy (userId or system), and timestamp.
- [ ] Updates to existing participation records (status/comment/isInLineup) create an audit row capturing old and new values and timestamp.
- [ ] The lineup view (admin) contains a new collapsible section at the bottom titled "RSVP audit log" (or localized string) that lists players and their chronological feedback entries.
- [ ] Each audit entry shows player name, timestamp (localized), the change (e.g. "maybe -> confirmed"), and comment text when present.
- [ ] The audit view is paginated or limited (e.g. latest 50 entries) and offers a link to view full history if needed.
- [ ] Only users with admin permissions can see the audit log in the admin lineup view.
- [ ] Tests: unit/integration tests cover writing audit records and the API that reads them.

## Technical Requirements

- DB: Add a new table `participation_audit` (or similar) with columns:
  - id (PK)
  - participation_id (FK)
  - player_id
  - tie_id
  - previous_status (nullable)
  - new_status
  - previous_comment (nullable)
  - new_comment (nullable)
  - changed_by (nullable) — user id/email or 'system'
  - created_at (timestamp with timezone)

- Server: Update participation write paths (upsertParticipation, updateParticipationLineup, any server actions that change participation) to also insert an audit row recording before/after values.

- API: Add a read API endpoint used by the lineup view to fetch recent audit entries for a tie (grouped by player).

- UI: In `app/admin/ties/[tieId]/lineup/lineup-client.tsx` add a new collapsible section at bottom with the audit entries. Use existing UI components (`Card`, `Accordion`, `Badge`) to present entries.

- Permissions: Reuse existing admin auth guard; ensure API endpoint requires admin session.

## Implementation Notes

1. DB migration: add SQL file under `scripts/` to create `participation_audit` table with appropriate indexes (index on tie_id, player_id, created_at).
2. Library: Add db helper functions in `lib/db.ts` to insert audit rows and to query recent audit entries for a tie.
3. Server actions: In `app/actions/public.ts` and server-side actions that upsert or update participations, call the new audit insertion helper. Ensure we capture previous values by reading the participation before update when needed.
4. API route: `app/api/admin/ties/[tieId]/audit/route.ts` (server-only) that returns audit rows grouped by player.
5. UI: Add a collapsed section at bottom of `lineup-client.tsx` showing latest X entries and a per-player expansion to see that player's history.

## Testing Notes

- Unit tests for `lib/db` audit helpers (in-memory or test DB) to ensure correct fields written.
- Integration tests for `toggleLineupAction` and `upsertParticipation` to assert audit rows are created.
- UI snapshot test for the audit section when populated.

## Migration and Backwards Compatibility

- New table does not change existing participation table schema; safe to deploy independently.
- If older participation changes exist, no retroactive audit rows will be created (only from migration onward).

## Follow-ups

- Consider adding an admin UI filter (player, date range, change type).
- Consider exposing audit via CSV export for compliance.

## Implementation estimate

- DB migration + helper: 1–2 hours
- Server wiring + tests: 2–3 hours
- UI + tests: 2–3 hours
- Total: ~5–8 hours
