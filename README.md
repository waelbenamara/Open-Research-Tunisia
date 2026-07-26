# Open Research Tunisia

An LMS + research-collaboration platform for an open research initiative. Researchers post real
projects with real open roles, anyone can apply, workshops teach the skills those projects need, and
every contribution is logged publicly against the CRediT taxonomy so credit is a matter of record.

Built with Next.js 15 (App Router, Server Actions), TypeScript, Tailwind v4, Prisma + PostgreSQL.

## Run it

Needs a PostgreSQL 14+ database. Locally that's `brew install postgresql@17 && brew services start postgresql@17`.

```bash
cp .env.example .env      # then set DATABASE_URL / DIRECT_URL
createdb ort_dev
npm install
npm run setup             # generate + migrate + seed
npm run dev               # http://localhost:3000
```

`npm run db:reset` wipes and reseeds. `npm run db:studio` opens a data browser.

### Seeded accounts — **local development only**

> ⚠️ These accounts exist **only** in a locally seeded database (`npm run setup`).
> They are **never** created in production — the live site is populated with real
> data, and the login page's demo-account helper is gated to `NODE_ENV !== production`.
> Do not treat `password123` as a live credential; it isn't one.

Password for all seeded accounts: `password123`

| Email | Who | What to look at |
|---|---|---|
| `admin@ort.tn` | Fares Haddad, admin | `/admin` — 3 pending applications, 2 posting-rights requests, audit log |
| `amine@ort.tn` | Dr. Amine Ncib, project lead | Medjerda project → Applications tab, Team & credit, Tasks |
| `rim@ort.tn` | Rim Toumi, lead + facilitator | Python workshop → Roster tab: attendance, grading, issue certificates |
| `yasmine@ort.tn` | Yasmine Gharsalli, contributor | `/profile` — contribution ledger, CRediT roles, verifiable certificate |
| `oumaima@ort.tn` | Oumaima Nasri | An applicant waiting on a decision |

## The model

Beyond the brief (projects, workshops, applications, resources, admin approval), the product
includes the pieces that make those actually work:

**Task boards.** "You're accepted" has to lead somewhere. Every project has a board with
`good first task` flags — the low-barrier entry point for someone who has never done research.

**A contribution ledger with CRediT roles.** Completing a task writes to a public, per-person
ledger tagged with the [CRediT taxonomy](https://credit.niso.org/) that journals use. A project's
author line is *generated* from that ledger, in author order, visible to the whole team before
anything is submitted. This is the single biggest lever against the thing that pushes juniors out of
research: opaque authorship.

**Verifiable certificates.** Workshop completion issues a certificate with a code that resolves at a
public `/verify/<code>` URL. No login needed — an employer can check it. Issuance is threshold-based
(default 75% attendance) and facilitator-triggered, not automatic.

**Real LMS mechanics.** Sessions with recordings and live links, per-session attendance, assignments
with submissions + grades + feedback, progress tracking, waitlists that auto-promote when someone
drops, prerequisites.

**Governance.** Ethics review status on every project (with a badge, because the diabetes project
touches health data), per-output licences, data statements, three-tier resource visibility
(public / members / team), a code of conduct accepted at signup, and an admin audit log of every
privileged action.

**Outputs, not just papers.** Datasets, code, policy briefs and preprints are first-class outputs
with DOIs and licences, aggregated at `/publications` — the initiative's public evidence that it
works.

**Discovery that matches how people search.** Search across projects and workshops, filter by
type/stage/area/recruiting, and a `/people` directory filterable by skill so leads can find
contributors instead of only waiting for applications.

**Onboarding.** New members land on a three-step path (skills → recruiting project → workshop) and
are shown good-first tasks, because "browse 4 projects" is not an onboarding.

## Permissions

Who can do what, in one place. Enforcement lives in the server actions
(`src/actions/*`) and `src/lib/permissions.ts` — the UI only mirrors it.

| Action | Visitor | Member | Project contributor | Maintainer / Lead | Admin |
|---|---|---|---|---|---|
| Browse approved public projects, verify certificates | ✓ | ✓ | ✓ | ✓ | ✓ |
| Apply, enrol, bookmark, edit own profile | — | ✓ | ✓ | ✓ | ✓ |
| See team-only resources, discussion, board | — | — | ✓ | ✓ | ✓ |
| Add a task (no credit role, assign self only), delete/move own tasks | — | — | ✓ | ✓ | ✓ |
| Claim unassigned OPEN tasks; release own | — | — | ✓ | ✓ | ✓ |
| Move a task to DONE (writes the credit ledger) | — | — | — | ✓ | ✓ |
| Create credit-bearing / good-first tasks, assign others | — | — | — | ✓ | ✓ |
| Edit project, decide applications, manage team & credit, outputs | — | — | — | ✓ | ✓ |
| Post a project / workshop (needs posting rights) | — | — | — | ✓ | ✓ |
| Approve or reject submitted projects | — | — | — | — | ✓ |
| Roles, suspensions, archives, global announcements, audit log | — | — | — | — | ✓ |

Structural rules: a new project is `PENDING` until an admin approves it — until
then it 404s for everyone but its managers and admins, appears nowhere public,
and takes no applications; rejected projects auto-resubmit when edited. Deleting
a resource requires being its uploader (or lead/facilitator/admin). Contributors
hand work over via *In review* — only managers confirm *Done*, because Done
writes the contribution ledger. Contributions can only be logged for actual
project members. All enum-shaped form inputs are validated server-side against
`src/lib/enums.ts`.

## Layout

```
prisma/schema.prisma      full domain model
prisma/migrations/        versioned SQL migrations
prisma/seed.ts            the scenario from the design, expanded
src/lib/                  db, auth (DB-backed sessions), permissions, storage, theme tokens
src/actions/              server actions: auth, projects, workshops, admin
src/components/           design-system primitives + shared views
src/app/                  routes
scripts/mksession.ts      dev helper: mint a session cookie for smoke testing
```

Design tokens live in `src/app/globals.css` under `@theme` and mirror the Claude Design source
(warm paper `#faf8f3`, brick `#8a3325`, olive `#4d6b3c`, Newsreader + Public Sans, square corners).
Categorical colour maps are in `src/lib/theme.ts`.

Status/kind columns are `String` rather than native Postgres enums on purpose — they're validated in
`src/lib/enums.ts`, so adding a resource kind or CRediT role is a code change instead of a migration.

## Files

All uploads go through `src/lib/storage.ts`, which picks a driver from the environment:

| Driver | When | Notes |
|---|---|---|
| `local` | default | writes to `./storage/uploads` — fine for dev and for a VPS with a persistent disk |
| `supabase` | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set | private bucket + short-lived signed URLs |

**Do not use the `local` driver on Vercel or Netlify** — their filesystems are wiped on every deploy,
so uploads silently disappear.

Two deliberate choices here. Local files live *outside* `public/`, because anything under `public/`
is served statically with no auth check — a `TEAM`-visibility dataset would be readable by anyone who
learned the URL. And storage keys are driver-prefixed (`local:…`, `supabase:…`), so files uploaded
under one driver keep resolving after you switch.

Every download goes through `GET /api/resources/[id]/download`, which checks permission first and
returns 404 (not 403) on denial, so a team-only file's existence isn't confirmed to outsiders.

## Deploying to Supabase

1. Create a project. **Don't enable Supabase Auth** — this app has its own auth wired into the `User`
   model (roles, `canPostProjects`, DB-backed sessions). Supabase Auth lives in a separate
   `auth.users` table and adopting it would mean syncing two user tables forever.
2. Project Settings → Database → copy both connection strings into `.env`. They use different ports:
   `6543` is the transaction pooler (for `DATABASE_URL`), `5432` is direct (for `DIRECT_URL`).
   The app needs the pooler or it will exhaust connections; migrations need the direct URL or they
   fail. Append `?pgbouncer=true&connection_limit=1` to the pooled URL.
3. Storage → create a **private** bucket named `resources`, then set `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_STORAGE_BUCKET`. The service-role key is server-only —
   `src/lib/storage.ts` is `server-only` and never ships it to the browser.
4. `npm run db:deploy && npm run db:seed`

## Social login (Google & GitHub)

Email/password works out of the box. Google and GitHub sign-in are built in but dormant until you
add credentials — each provider's button only appears once its two env vars are set, so the app
looks clean with none configured.

It layers on the existing auth rather than replacing it (no Auth.js, no second user table). arctic
does the OAuth2 handshake; a verified profile is then found-or-created-or-linked to a `User` and
handed to the same `createSession()` the password flow uses, so roles and permissions are identical
however someone signed in.

- **Account linking** is automatic on a *verified* provider email — sign up with a password, later
  click "Continue with Google" on the same address, and it links rather than duplicating. Linking is
  refused on unverified/absent emails to prevent takeover (Google and GitHub both verify, so this is
  seamless in practice).
- **Code of conduct**: OAuth signups skip the registration form, so a new OAuth user lands on
  `/accept-terms` and accepts once before doing anything.
- **GitHub private emails** are handled — the callback reads the primary *verified* address via the
  `user:email` scope.

To enable: register an OAuth app in each provider's console (callback
`…/api/auth/<provider>/callback`), then set `GOOGLE_CLIENT_ID/SECRET` and/or
`GITHUB_CLIENT_ID/SECRET` in `.env`. Exact steps are in `.env.example`.

## Before production

- Set a real `AUTH_SECRET` (`openssl rand -base64 32`) and serve over HTTPS.
- Transactional email goes through Resend (`RESEND_API_KEY` + `EMAIL_FROM`; unset = logged to the
  console). Welcome and password-reset emails are wired (`src/lib/email.ts`, `emailTemplates.ts`);
  application-decision emails are the next thing to send — a lead accepting someone who never comes
  back because they didn't see it is the main failure mode.
- No rate limiting on login or application submission yet (forgot-password is throttled per-account).
- `scripts/mksession.ts` mints sessions without a password. It's a dev helper — delete it or guard it
  behind `NODE_ENV !== "production"` before deploying.
