# Captain Notifications on Participation Changes

## User Story

As a **team captain**
I want **to be notified when a player's participation for a tie of my team changes**
So that **I can react early (adjust the lineup, find replacements) without checking the app constantly**

## Acceptance Criteria

- [ ] When a participation (status or comment) for a tie changes, the captain(s) of the tie's team(s) are notified.
- [x] No notification is sent if nothing effectively changed (same status and comment).
- [x] The player who changed their own participation is not notified about it if they are the captain.
- [x] One or more captains can be assigned to a team by an admin.
- [x] Each captain can choose their notification channel(s), enable/disable notifications and pick a time window preset in their own profile.
- [x] Pushover is the only channel implemented in this story. Channels sit behind a common provider interface and a provider registry, so adding Email (or others) later requires only a new provider plus a UI option, with no schema or dispatcher changes.
- [x] Notification text is German and contains: player, team, opponent, date/time, old status -> new status, and comment if present.
- [x] A failing channel never makes the participation update fail; errors are logged.
- [x] The preferences page has a "Send test notification" button per channel that sends a German test message and shows success or the error to the captain.
- [ ] Participation changes made by admins or via lineup screens also trigger notifications (hook at DB layer); the acting user is identified so a captain is not notified of their own change.
- [x] Removing the `team_captain` role from a user, or deleting the user or team, removes the related captain assignments.
- [x] Existing `team_captain` users without a team are flagged to the admin so they can be assigned.
- [x] Pushover app token comes from env only, is never sent to the client, and secrets are never logged.
- [x] Env vars are documented (README/docker-compose) and notification texts live in `lib/notifications/messages.ts` (German only, not part of the UI i18n).
- [x] Notifications for participation changes are sent only on production deployments; on all other environments (dev, test, staging) they are suppressed and a log line notes the skip.
- [x] The "Send test notification" button is exempt from the production guard and works on every environment.
- [x] Notifications respect the captain's window preset (unit tests cover each preset, including boundaries and past ties).
- [ ] No in-app notifications (out of scope).

## Technical Requirements

- Hook into `updateParticipationAction` (`app/actions/participations.ts`) / `db.upsertParticipation`; load the previous participation to detect the change.
- New migration (`lib/migrations.ts`, `scripts/`): per-user notification settings (`userId`, `channel`, `enabled`, `target` e.g. Pushover user key; later an email address); `channel` is a free-form text value, not a DB enum, so new channels need no migration.
- `lib/notifications/` with `NotificationProvider` interface, `PushoverProvider` (HTTPS POST to `https://api.pushover.net/1/messages.json`, app token from env `PUSHOVER_APP_TOKEN`). Email is postponed; no `EmailProvider` in this story.
- Captain resolution via the new `team_captains` table (see above).
- Notification settings also include `windowMode` (text, not enum): `next_tie`, `days_7`, `days_14` (default), `days_30`, `all`.
- Settings UI + API route for captains to manage their channels; use centralized API client in `@/lib/api`.
- Integration tests (testcontainers) for change detection, captain resolution and settings endpoint; unit tests for the Pushover provider with mocked fetch, and for the dispatcher with a fake second provider to prove extensibility.

## Decisions

- Notifications are sent immediately (no batching) for now.
- Each captain picks a time window preset (dropdown): next tie only, within 7 / 14 / 30 days, or all upcoming ties; default is 14 days.
- The window is measured from the time of the change to the tie date; past ties never notify. `next_tie` means the team's next upcoming tie only.
- Presets are stored as text so more can be added later without a migration.
- All status changes (confirmed/maybe/declined) and comment changes trigger a notification. Per-status configuration may follow later.
- Admins receive no notifications (unless they are also a captain of the team).
- Email is postponed to a follow-up story (SMTP provider still to be defined). This story only prepares for it via the provider interface.

## Team Captain Assignment (part of this story)

- A team can have one or more captains (many-to-many `team_captains`: `teamId`, `userId`).
- Admins assign/remove captains per team in the admin teams area (users with role `team_captain`).
- A captain-resolution query returns the captains of the tie's teams; this replaces the player-team assumption above.
- A user with role `team_captain` can edit only their own notification preferences (channels, targets, enabled, time window) on a profile/settings page. Admins cannot edit others' preferences.

## Additional Considerations

- Hook at the DB layer (`db.upsertParticipation`, plus any delete/reset path), not only the server action, so changes made via admin or lineup screens also notify.
- Backfill: existing users with role `team_captain` have no team assignment; provide an admin hint or migration so they are not silently notification-less.
- Changing a user's role away from `team_captain`, or deleting the user or team, must remove their `team_captains` rows (FK `ON DELETE CASCADE` plus role-change cleanup).
- Only the captain's own team matters for a tie; ties are matched via the team participating in the tie.
- Captain who is also the changing player is not notified (already a criterion); the actor must be identified, including admin edits on behalf of players.
- Pushover user keys and the app token are secrets: the token comes from env only, is never exposed to the client, and keys are not logged.
- "Send test notification" button on the preferences page to verify a channel.
- Env vars documented in README/docker-compose (`PUSHOVER_APP_TOKEN`).
- Notification text strings go through `lib/i18n.ts` (German).
- Sending must not block the request or break the update (fire-and-forget with logging).

## Production Guard

- On Vercel, notifications are enabled only if `VERCEL_ENV === "production"` (set automatically by Vercel; preview and development deployments are suppressed). `NODE_ENV` is not usable since preview builds also run with `NODE_ENV=production`.
- Optional override `NOTIFICATIONS_ENABLED=true|false` for non-Vercel setups (e.g. Docker); if set, it takes precedence. Default without either: off.
- The guard lives in one place (the notification dispatcher), so no code path can bypass it. Test sends call the provider with an explicit `force` option.
- Test messages are prefixed with the environment (e.g. "[TEST]") so they are not mistaken for real notifications.
- Document the flag in README/docker-compose.

### Enabling notifications on a preview (feature) deployment

- Dashboard: Project -> Settings -> Environment Variables -> add `NOTIFICATIONS_ENABLED=true` for **Preview**, restricted to the feature branch (e.g. `feature/captain-notifications`); also set `PUSHOVER_APP_TOKEN` there. Redeploy, since env vars only apply to new deployments.
- CLI: `vercel env add NOTIFICATIONS_ENABLED preview feature/captain-notifications`
- One-off: `vercel deploy --env NOTIFICATIONS_ENABLED=true`
- Keep it branch-scoped: enabling it for all previews would send real notifications from every branch.
- Check which database the preview uses (may be shared with prod); use a test captain with your own Pushover key.
- Add this section to the README as well.

## Testing Notes

Change a participation as a player in `/spieltage` and verify that the captain receives a Pushover message; verify no message for unchanged saves and that failures are only logged.

## Implementation Notes

- Both participation write paths (admin action and public action) go through `upsertParticipationAndNotify` in `lib/notifications/dispatcher.ts`; there is currently no admin screen that edits other players' participation status. The acting player is known via `playerId`, so a captain is not notified about their own change.
- Open: the criterion "When a participation ... change, the captain(s) ... are notified" and the DB-layer hook are only verified with mocked providers; a real Pushover delivery has not been tested yet (needs `PUSHOVER_APP_TOKEN` and a user key).
- Pre-existing failing integration tests (`dashboard`, `players`) are unrelated to this story.
