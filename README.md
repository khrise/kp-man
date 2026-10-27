This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

❗️ Disclaimer: This project was created using AI-assisted development (vibe coding). While the code has been reviewed and tested, please note:

- No warranties: This code is provided "as-is" without any guarantees of functionality, security, or fitness for a particular purpose.
- Review recommended: We strongly recommend reviewing and testing the code thoroughly before using it in production environments.
- Your responsibility: Users are responsible for understanding and validating the code for their specific use cases.
- Security considerations: Conduct your own security audit before deploying in sensitive contexts.

Contributions, bug reports, and improvements are welcome!

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Participation Audit

### Captain comments

Admins and assigned team captains can save a player-specific captain comment
directly in the lineup view, including for players who have not submitted an
RSVP. A single Save button stores status and comment edits atomically.
Changes from the same Save are recorded in one audit entry, including lineup
membership only when it actually changes. Creating an RSVP does not select the player.
Public RSVP writes and captain saves acquire the same tie lock before writing,
keeping concurrent responses and their audit history transactional.
Each player's Edit RSVP button opens a form above the lineup lists, with
icon-labelled radio choices and a single-line captain comment input. Cancel
discards the draft; unrelated page updates preserve it. Saved comments and
their attribution remain visible on the player cards.
Selecting No response resets an existing RSVP and removes any lineup selection,
while preserving the independent captain comment. The reset and comment edits
are audited together, including the removed player-authored comment.
For a player already without a response, saving only a captain comment does not
create an RSVP or select the player for the lineup.
Comments remain attached to the player and tie when
an RSVP is submitted later, and are shown separately from the player's own
comment, with the captain's linked player name or username. Comment edits are
audited and are not included in invitation emails.
Finalized ties lock RSVP status edits but still allow saving comment-only changes.
The tie captain comment is displayed beneath the lineup page's date/time and
on the admin ties overview, with author attribution. Its comment button opens
a single-line editor with Save and Cancel.

Apply migration [16-independent-player-captain-comments.sql](scripts/16-independent-player-captain-comments.sql)
before deploying. It preserves existing player-specific captain comments while
moving them out of participation rows so an RSVP is no longer required.

Run `npm run db:migrate` before starting or deploying updated application code.
The participation audit records subsequent changes only, not initial responses
or identical updates. Only changed status, comment, or lineup value pairs are
stored; unchanged pairs are both `NULL`. Clearing a comment remains a recorded
change. The lineup UI displays only changed fields.
The audit header's icon button switches between player groups (with change
counts) and a newest-first chronological view. Chronological entries include
the affected player, recorded editor, date/time and all changed fields.
Both views share loaded entries and the same load-more pagination.

Migration [14-participation-audit-changes-only.sql](scripts/14-participation-audit-changes-only.sql)
removes historical initial-response and no-op entries and clears unchanged
fields in retained entries. Back up the database before applying this cleanup
if the original snapshots must be retained.

## Management authorization and captain assignments

Both `admin` and `team_captain` can enter the management app. Captain access is
limited to explicitly assigned teams; player membership never grants management
access. Users with `player` or `user` roles retain the existing public access flow.

| Permission | Admin | Team captain | Player / user |
|---|:---:|:---:|:---:|
| Enter management app and view dashboard | Yes | Yes | No |
| View seasons, teams, players, matches and current comments | All | Assigned teams | No |
| Create/edit/delete seasons and change current season or access codes | Yes | No | No |
| Create/delete teams or move teams between seasons | Yes | No | No |
| Edit team details, rosters and player rankings | All | Assigned teams | No |
| Assign/remove team captains | Yes | No | No |
| Create players | Yes | In an assigned team | No |
| Edit player names | Yes | Only if **all** memberships are assigned | No |
| Delete players globally | Yes | No | No |
| Create/edit/delete matches and import schedules | All | Assigned source and target teams | No |
| Select lineups and mark them ready | All | Assigned teams | No |
| Reopen a finalized lineup | Yes | No | No |
| Read participation audit history, when available | All | Assigned teams | No |
| Manage accounts, roles and passwords | Yes | No | No |
| Read/change application settings | Yes | No | No |
| Use public season views and availability submissions | Yes | Yes | Yes |

### Relationship and rollout

Migration [`13-add-team-captains.sql`](./scripts/13-add-team-captains.sql) adds the
`team_captains(team_id, user_id)` join table. A team can have zero or multiple
captains; a captain can manage zero or multiple teams, including teams in different
seasons. The composite primary key prevents duplicates; deleting a team or user
cascades only to its assignments. Database triggers enforce the captain role and
remove assignments when a user's role changes away from `team_captain`.
Promoting that user back does not restore old assignments.

Apply migrations before using these changes (automatic startup migrations, or
`npm run db:migrate`). Existing teams start with **no assignments**. An admin must
assign eligible users using **Manage captains** on the team screen. Removing an
assignment does not remove the user, team, or player membership.

Captains with no assigned teams can enter the app but see empty operational lists.
Their selectors, dashboard counts and player membership displays are also scoped.
Captains can add existing players from their assigned teams to another assigned
team; only admins can select players outside that scope. New players created by a
captain are attached to the selected assigned team transactionally. Shared player
names cannot be edited by a captain if any membership is outside their scope,
including historical seasons.

### Enforcement

The permission matrix lives in [`lib/permissions.ts`](./lib/permissions.ts).
Use its `Permission` string enum at call sites rather than raw permission strings:

```typescript
import { Permission } from "@/lib/permissions"
import { requireTeamPermission } from "@/lib/server/auth"

await requireTeamPermission(teamId, Permission.LineupManage)
```

The role mapping must cover every enum member, checked by TypeScript.
Server-only helpers in [`lib/server/auth.ts`](./lib/server/auth.ts) load the
session's current database user, verify the permission, and check team assignments
where necessary. Roles and assignments are not cached in the JWT, so deletion,
demotion or assignment removal takes effect on subsequent requests.

- Guard every server action independently of its calling page. Use
  `requirePermission()` for role permissions, `requireTeamPermission()` for
  team-bound resources and `requirePlayerPermission()` for shared player edits.
- Guard server pages before loading data using `requireAdminPage(permission)`.
  Anonymous visitors redirect to `/admin/login`; unauthorized page access returns
  404. Client screens receive role-aware controls, but these are not enforcement.
- Match imports use `/api/proxy-fetch`: 401 without a session, 403 without
  permission/assignment. Captains must supply a valid `teamId` (400 if missing).
  Imported match creation checks the destination team again.
- `audit.read` permits admins and assigned captains. This branch does not add an
  audit-history storage or UI feature; any audit loader must authorize the match's
  actual team before querying entries.
- Middleware and `AuthGuard` provide navigation checks, not role enforcement.
  Login still accepts valid credentials for all roles and remains accessible to
  signed-in users so they can switch accounts.
- Public season access, match views, club-name configuration and availability
  submissions remain unchanged.

Run unit tests with `npm test -- --runInBand`. Database-backed assignment, RBAC and
migration tests run with `npm run test:integration` and require a Docker-compatible
container runtime.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Docker Deployment

This application includes Docker support for containerized deployment with PostgreSQL database.

### Quick Test Setup

1. **Test the complete Docker setup:**

   ```bash
   ./test-docker.sh
   ```

   This will:

   - Start PostgreSQL on port 5433 (non-standard port)
   - Build and start the Next.js application on port 3000
   - Run database initialization scripts from `./scripts/`
   - Show service status and connection details

2. **Manual Docker Compose setup:**
   ```bash
   docker-compose up --build
   ```

### Individual Docker Commands

1. **Build the Docker image:**

   ```bash
   ./build-docker.sh
   ```

   Or manually:

   ```bash
   docker build -t kp-man-app .
   ```

2. **Run the container (standalone):**
   ```bash
   docker run -p 3000:3000 kp-man-app
   ```

### Environment Configuration

The docker-compose setup includes:

- **PostgreSQL Database**: localhost:5433
  - Database: `kp_man`
  - Username: `kp_user`
  - Password: `kp_password`
- **Next.js Application**: localhost:3000

For custom configuration, copy `.env.example` to `.env.local` and modify as needed.

## Environment Variables

The application supports the following environment variables:

- **`DATABASE_URL`** (required): PostgreSQL connection string
- **`SPORTS_CLUB_NAME`** (optional): Name of your sports club (defaults to "Sports Club")
  - Used in page titles and descriptions
  - Example: `SPORTS_CLUB_NAME="Tennis Club Riverside"`
- **`SUPPORT_EMAIL`** (optional): Support contact email (defaults to "support@example.com")
- **`NEXT_PUBLIC_APP_URL`**: Application URL for public access
- **`NODE_ENV`**: Environment mode (development/production)

### Useful Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove all data
docker-compose down --volumes

# Connect to database
psql -h localhost -p 5433 -U kp_user -d kp_man
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
