# Open Research Tunisia — Operations Guide

The practical manual for running the live platform. Written for the admins who
keep it going. If you only read one thing: **you deploy by pushing to `main`,
and admins are managed from `/admin`.**

---

## What's running where

| Layer | Service | Notes |
|---|---|---|
| App | **Vercel** | Next.js 15. Auto-deploys from GitHub `main`. |
| Database | **Supabase** Postgres | Pooled connection (port 6543) for the app, direct (5432) for migrations. |
| File storage | **Supabase** Storage | Private bucket `resources`; downloads go through permission-checked routes. |
| Email | **Resend** | Domain `openresearchtunisia.org` verified (DKIM/SPF/DMARC). Sends welcome, password-reset, and application-decision mail. |
| Code | **GitHub** | `waelbenamara/Open-Research-Tunisia` |

The app is **fully cloud-hosted** — no home server in the live path. Local
development runs entirely offline (local Postgres + local disk); production uses
the services above. Same code, environment picks the backend.

---

## Admin accounts

These are the real people who can reach `/admin`. There is **no** `password123`
account in production — those are local-development seeds only.

| Email | Role | How they sign in |
|---|---|---|
| `benamara@umich.edu` | Admin (owner) | Password |
| `mootez@dal.ca` | Admin | Password |
| `researchtunisia5@gmail.com` | Admin | No password yet — use **Forgot password** or **Continue with Google** |

> An account with no password isn't locked out: **"Forgot password?"** on the
> sign-in page emails a reset link (real email, via Resend), which also sets the
> password. Signing in with Google on the same address links automatically.

---

## Running the platform (all from `/admin`)

The admin console has these tabs:

- **Applications** — every project application; admins can decide when a lead is unresponsive.
- **Posting requests** — approve who may post projects. Approving grants posting rights + the `LEAD` role.
- **Projects** — **approve or reject submitted projects.** A new non-admin project is invisible to the public until approved. Rejecting it (with a note) returns it to its lead, who edits and resubmits.
- **Workshops** — oversee every workshop.
- **Members** — change roles, suspend/reinstate accounts, and open each person's **Activity** page (`/admin/users/<id>`): sign-in history, full action trail, contributions, applications, enrolments.
- **Audit log** — every meaningful action on the platform, newest first.

**To make someone an admin:** Members tab → their card → set role to *Admin*.
**To suspend someone:** Members tab → *Suspend* (this also kills their live sessions instantly).

---

## Deploying changes

```
git push origin main      # that's it
```

Vercel watches `main` and rebuilds automatically. The build runs
`prisma migrate deploy`, so **any new database migrations apply themselves on
deploy** — no manual database step. Watch the deployment in the Vercel
dashboard; a green check means it's live.

**Never commit secrets.** `.env` and `env copy` are gitignored, and GitHub push
protection will block a push that contains a key. Production secrets live only
in **Vercel → Settings → Environment Variables**.

### Environment variables (names only — values live in Vercel)

`DATABASE_URL` · `DIRECT_URL` · `AUTH_SECRET` · `RESEND_API_KEY` · `EMAIL_FROM`
· `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `SUPABASE_STORAGE_BUCKET`
· `CRON_SECRET`

> **`CRON_SECRET`** secures the daily digest endpoint (`/api/cron/digest`). Set
> it in Vercel; Vercel Cron sends it automatically as a Bearer token. Its value
> is in `env copy`. Without it the endpoint is open — fine locally, not in prod.

### Activity emails & the digest

Beyond transactional mail, the platform sends **activity emails**, which every
member can turn off from their profile ("Email me about activity"):

- **First message** — when someone new messages you, you get one email. Replies are in-app only.
- **Digest** — a Vercel Cron job (`vercel.json`, daily at 08:00 UTC) runs `/api/cron/digest`, which emails each person **at most once every ~2 days**, and only if they have unread activity worth surfacing. An engaged user who reads everything gets nothing.

---

## Pointing openresearchtunisia.org at the site

Currently the site answers on its `*.vercel.app` URL. To put it on the real
domain:

1. **Vercel** → Project → Settings → **Domains** → add `openresearchtunisia.org` and `www.openresearchtunisia.org`.
2. **Namecheap** → Advanced DNS: remove the parking CNAME and any URL-redirect record, then add exactly what Vercel shows — typically an **A record `@` → `76.76.21.21`** and a **CNAME `www` → `cname.vercel-dns.com`**.
3. **Leave the Resend email records untouched** (`resend._domainkey`, `send` TXT+MX, `_dmarc`). HTTPS is issued automatically.

No Cloudflare account is needed for this path.

---

## Known limits — read before launch

- **Uploads over ~4.5 MB fail on Vercel.** This is a hard platform cap on request size. Existing large files (e.g. the intro presentation) serve fine; it only affects *new* uploads above the limit. If large uploads become essential, the fix is direct browser-to-Supabase uploads (a code change).
- **Supabase free tier pauses after ~1 week of inactivity** — the database sleeps and the site errors until manually resumed. Upgrade to **Pro ($25/mo)** before public launch, both to avoid pausing and to get daily backups.
- **HTML presentations must be self-contained** (all assets embedded, as Manim Slides exports by default). They're served in a security sandbox.
- **No rate limiting yet** on login or application submission.

---

## Emergencies

- **Someone can't sign in** → have them use *Forgot password* on the login page.
- **Abusive account** → Members tab → *Suspend* (revokes their sessions immediately).
- **Bad deploy** → Vercel → Deployments → open the last good one → *Promote to Production* (instant rollback).
- **Check what happened** → `/admin` → Audit log, or a specific person's Activity page.

---

*Keep this file current — it's the map when something breaks at an inconvenient hour.*
