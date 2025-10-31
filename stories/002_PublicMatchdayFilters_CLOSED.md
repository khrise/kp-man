# Public Matchday Filters Refresh

## User Story

As a **Visitor**
I want **a cleaner filter section on the public matchday view, especially on mobile**
So that **I can quickly understand the filter options without the UI feeling cluttered**

## Acceptance Criteria

- [x] The public matchday filter section on `app/ties/spieltage-client.tsx` is restyled with a clearer visual hierarchy (spacing, typography, background treatment).
- [x] On mobile (≤ 640px) the filters collapse behind a floating toggle button or similarly unobtrusive control that remains accessible while scrolling.
- [x] Expanding the filter UI on mobile presents the same options as the desktop view without overlapping primary content.
- [x] The layout adapts gracefully back to the existing desktop/tablet presentation when the viewport is wider than 640px.
- [x] No regression in existing filtering functionality (season/team/player selection continues to work as before).

## Technical Requirements

- Update the filter section components within `app/ties/spieltage-client.tsx` (and related UI helpers if needed).
- Leverage existing Tailwind design tokens/utility classes to align with current design system.
- Implement a floating toggle control for filters on mobile that is keyboard accessible and supports screen readers.
- Preserve localization by reusing existing translation keys or adding new ones in `lib/i18n.ts` when necessary.

## Implementation Notes

- Reference the provided screenshot to understand the current layout issues (crowded greeting card and filter controls).
- Consider using shadcn/ui primitives already in the project (e.g., `Sheet`, `Dialog`, or `Popover`) if they help keep the mobile experience tidy.
- Ensure filter state persists correctly when toggling the mobile drawer or floating control.

## Testing Notes

- Manually verify the filter section at common breakpoints (≤640px, 768px, and ≥1024px).
- Confirm all filter interactions (team toggles, show future matches, etc.) still update the match list as expected.
- Run `npm run build` and any relevant component tests once UI changes are complete.
