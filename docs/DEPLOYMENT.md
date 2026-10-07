# Coolify deployment plan

This plan creates **two separate services**: official self-hosted Supabase and the risoform Next.js app. Use your chosen HTTPS domains for the web app and Supabase API. `coolify.debricks.cloud` is the intended Coolify control plane, not automatically either public app domain.

## 1. Supabase service

Follow Supabase's [official Docker self-hosting guide](https://supabase.com/docs/guides/self-hosting/docker) with persistent database and Storage volumes. Keep its generated `.env` in Coolify's secret store and do not commit it. The API gateway must be reachable from browsers over HTTPS, while Postgres and internal services stay private. Set the official stack's `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, and `SITE_URL` to the final HTTPS API and app URLs. See Supabase's [reverse proxy and HTTPS guide](https://supabase.com/docs/guides/self-hosting/self-hosted-proxy-https).

Configure SMTP and sender identity before enabling production email confirmation or password recovery. Keep anonymous Auth sign-ins disabled. Keep the Studio dashboard behind its own authentication and restricted access. Size the database and Storage volumes for uploaded files, monitor free space, and back up both volumes on a schedule. Test restoring both to a separate environment.

After the stack is healthy, apply `supabase/migrations/20261007140006_initial_schema.sql` to its Postgres database with `psql` using a privileged database connection. Check that RLS is enabled for `workspaces`, `forms`, and `responses`, and that the `response-files` bucket is private. Apply future migrations in timestamp order and record each deployment.

## 2. Web app service

Create a Dockerfile-based application from this repository in Coolify, using `Dockerfile`. Expose container port `3000` through Coolify HTTPS. Set the following **build arguments** so the browser bundle gets the correct public values:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public HTTPS URL of the Supabase API gateway |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |

Set `SUPABASE_SECRET_KEY` as a **runtime secret** only. Never make it a `NEXT_PUBLIC_` value or a Docker build argument. Redeploy the web app when a browser-visible URL or publishable key changes.

To enable AI form drafting, set `OPENAI_API_KEY` as another **runtime secret**. Optionally set `OPENAI_MODEL` (the default is `gpt-4o-mini`). The key must never be a build argument or `NEXT_PUBLIC_` value. The app verifies the signed-in Supabase user before calling OpenAI, caps prompt length, and returns an editable draft. AI descriptions are sent to OpenAI with response storage disabled. Add shared rate limiting and spending controls before public launch.

## 3. Launch checks

1. Create two email accounts and separate workspaces. Confirm one cannot list, edit, or read the other's forms, responses, or files.
2. Publish a form and submit every answer type from a private browser session. Confirm an unpublished form returns 404.
3. Upload a supported file and verify that only its workspace owner can open a short-lived link. Check a file over 10 MB and an unsupported type are rejected.
4. Confirm email confirmation and password recovery reach a real inbox, and inspect Auth redirect URLs.
5. Add shared ingress rate limiting and bot protection. The app's current per-process limiter is only a first line of defense and does not coordinate replicas or survive restarts.
6. Test database and Storage backup restoration, then document the recovery owner and interval.

Google sign in is deferred. When added, configure the Google provider in the self-hosted Auth service and register its callback URL with Google; see [Supabase self-hosted Auth configuration](https://supabase.com/docs/guides/self-hosting/auth/config).
