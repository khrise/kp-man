# Weekly Tie Grouping

## User Story

As a **player or fan viewing the public schedule**
I want **ties to be grouped by calendar week in the public ties view**
So that **I can immediately spot when multiple matches land on the same weekend and plan accordingly**

## Acceptance Criteria

- [x] The public ties page renders matches grouped under clearly labeled calendar-week sections showing week number and date range.
- [x] Matches that fall on the same weekend appear in the same weekly section with each day still individually labeled.
- [x] Existing filters (player, team, time range, sorting) continue to work and the weekly groupings update to reflect the filtered result set.
- [x] Week headers and group spacing remain readable on mobile and desktop layouts.
- [x] Empty weeks (no resulting ties) do not render placeholder headers.

## Technical Requirements

- Implement week-based grouping after all filtering/sorting logic inside `app/ties/spieltage-client.tsx` or a dedicated helper.
- Derive ISO week number and start/end date using existing utilities or a new helper in `lib/utils.ts` (ensure both locales can format the header text via `lib/i18n.ts`).
- Introduce new i18n strings for week labels in both `de` and `en` translations.
- Use existing Tailwind/shadcn primitives to style week sections (e.g., card or divider with spacing consistent with the rest of the page).
- Preserve current performance considerations; avoid refetching data just for grouping.

## Implementation Notes

- Compose a reusable function that accepts the filtered tie list and returns an ordered array grouped by week key (e.g., `YYYY-Www`).
- Reuse existing date formatting helpers or `date-fns` utilities already in the project; avoid introducing new date libraries.
- Ensure week headers display both the ISO week number and the calendar date range (e.g., "Week 18 · 02–04 May 2026").
- Audit the mobile layout to confirm headers and tie cards stack cleanly without overcrowding.

## Testing Notes

- Manually verify grouping with sample data where multiple ties occur on the same weekend and across consecutive weeks.
- Confirm filters (player toggle, team filter, time filter, sorting) still behave as expected while week sections update accordingly.
- Check both locales (de/en) to verify translation keys render correctly.
- Validate responsive behavior on narrow viewports (≤ 375px) and wider screens.
- Attempted `npm run test` but the repository has no `test` script; unable to execute automated suite.
