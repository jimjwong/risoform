# risoform

A small, responsive form builder with isolated workspaces, conversational public forms, private file uploads, and Supabase Auth/Postgres/Storage. The management app stays quiet and simple; each public form can use its own visual style.

## Current scope

- Email and password sign up/sign in through Supabase Auth. Google OAuth is planned and is not shown as an active login method.
- Instant **Try demo** workspace. Demo forms persist in this browser's local storage. Demo forms cannot publish or collect live responses.
- Multiple owner-isolated workspaces per account. Each account owns its own workspaces; inviting collaborators is a later feature.
- Form builder with 18 answer types: short and long text, name, email, phone, website, number, date, time, dropdown, single and multiple choice, yes/no, rating, opinion scale, file, address, and consent.
- Five style presets, colors, required questions, reordering, preview, publish/unpublish, share link, responses, and CSV export.
- Published forms accept anonymous submissions. Files are stored in a private Supabase Storage bucket, and only the workspace owner can create short-lived download links.

## Local start

Requires Node.js 24+, Docker, and the Supabase CLI. Start the local Supabase stack from this folder:

```powershell
npx supabase start
npx supabase status
```

Copy `.env.example` to `.env.local` and paste the **API URL**, **publishable key**, and **secret key** reported by `supabase status`. Keep the secret key only in `.env.local` or a server-side secret store. Then:

```powershell
npm ci
npm run dev -- -p 3101 --hostname 127.0.0.1
```

Open <http://localhost:3101>. The initial migration is in `supabase/migrations/`. The CLI applies it when the local stack starts. If the local stack was already running before the migration was added, run `npx supabase db reset` (this deletes local Supabase data).

For UI exploration without a database, run `npm run dev -- -p 3101 --hostname 127.0.0.1` and choose **Try the demo workspace**.

## Production direction

The [tailnet demo preview](docs/TAILNET_PREVIEW.md) is a browser-only preview.
It does not provide account sign in, publishing, or response collection.

The planned home is **Coolify at `coolify.debricks.cloud`**, with a separate web app service and a self-hosted Supabase stack. No production services or domains have been provisioned by this repository. [Deployment steps](docs/DEPLOYMENT.md) cover the Docker build, environment variables, database migration, HTTPS, auth email, backups, and launch checks.

## Data boundaries and current limits

Database row-level security isolates each owner's workspaces and responses. Public visitors can read only published forms. The upload bucket is private. The server validates answers and file size/type before writing a response.

This is an initial product build. Before public launch, add shared rate limiting and bot protection at the ingress, verify email delivery, add storage cleanup when forms are deleted, and run a full backup/restore drill. Payment, signature, calculation, conditional branching, team roles, and Google sign in are not implemented. Published forms can be edited; each response stores a snapshot of its question labels so historical exports remain understandable.

## Checks

```powershell
npm run build
npm run lint
npx supabase db reset
node --env-file=.env.local scripts/smoke.mjs
```

Run the smoke check while the local app and Supabase are running. It creates two disposable local accounts, checks tenant isolation and uploads, then removes its test data.

Supabase design follows its [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control guide](https://supabase.com/docs/guides/storage/security/access-control), and [self-hosting guide](https://supabase.com/docs/guides/self-hosting/docker).
