# PunchPad — Phase 1 Handoff

**Date:** 2026-05-12
**Owner:** Jared Reid (Lexcom)
**Tag:** `v1.0.0-phase1`
**Repo:** `C:\Users\Jared.Reid\punchpad\` — git-only (no remote pushed yet)

---

## Executive summary

PunchPad's Phase 1 MVP — a self-hosted clock-in/out attendance system for Lexcom's internal team — is **feature-complete and verified locally**. All 67 implementation tasks from the approved design spec are merged on `main` (33 commits), with **50 unit tests + 35 integration tests + 14 end-to-end tests passing**. The app supports login, polished clock-in/out UX, calendar history, daily/weekly reports with CSV export, weekly digest email, and admin user/audit management. It is **not yet deployed**: the Docker Compose stack and runbook are written and locally smoke-tested, but no production VM is provisioned and no domain is pointed. **Recommend a soft launch to 2–3 internal users once a VM is up and DNS is pointed — estimated 1–2 hours of operational work, no code changes required.**

---

## Status at a glance

| Area | State | Notes |
|---|---|---|
| Code (Phase 1 scope) | Complete | All milestones 0–10 shipped |
| Unit tests | 50 / 50 passing | `pnpm test:unit` |
| Integration tests | 35 / 35 passing | Testcontainers Postgres, `pnpm test:int` |
| E2E tests (Playwright) | 14 / 14 passing | `pnpm test:e2e` (across 4 projects) |
| Lint / typecheck / format | Green | `pnpm lint && pnpm typecheck && pnpm format:check` |
| Local dev environment | Working | Postgres on port 54329, app on `localhost:3000` |
| Production deployment | Not started | Dockerfile, compose, Caddyfile, CI workflow authored |
| Domain / DNS | Not configured | Needs `${PUNCHPAD_DOMAIN}` in `.env` and DNS A record |
| Backups | Script written, not scheduled | Add to host crontab post-deploy |
| Off-site backup target | Not wired | Documented but left to existing rsync/restic infra |

---

## How to run and test locally

### Prerequisites

Already verified on this host:
- Node 24, pnpm 10.28, Docker 29.1, git 2.51.

### First-time setup

```bash
cd /c/Users/Jared.Reid/punchpad

# Start dev Postgres on host port 54329 (avoids conflict with native Postgres on 5432)
docker compose -f docker-compose.dev.yml up -d

# Install JS deps + generate Prisma client
pnpm install
pnpm exec prisma generate

# .env is already populated for local dev (see "Secrets and credentials" below)
# Run migrations + seed
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
```

### Run the app

```bash
pnpm dev
# → http://localhost:3000
```

Log in as `jared@lexcom.com` / `change-me-on-first-login` (from `.env`).  You'll be forced to set a new password on first login.

### Run the test suites

```bash
pnpm test:unit          # ~1 second
pnpm test:int           # ~20 seconds (spins up ephemeral Postgres per suite via Testcontainers)
pnpm test:e2e           # ~25 seconds (boots dev server + chromium)
```

Run all gates in one shot:

```bash
pnpm lint && pnpm typecheck && pnpm format:check && pnpm test:unit && pnpm test:int && pnpm test:e2e
```

### Smoke test (manual, 3 minutes)

Use this when handing off the running app to someone for a quick sanity check.

1. **Log in.** Visit `http://localhost:3000`. Enter `jared@lexcom.com` and the current password (initial password from `.env` if not yet changed). Confirm redirect to `/clock`.
2. **Clock in.** Click the large teal "Clock in" button. Confirm the hero flips to "On the clock" with a live counter ticking each second and the started-at time below it.
3. **Clock out.** Click "Clock out". Confirm the hero returns to "Off the clock" and the session appears in the Recent list at the bottom.
4. **Calendar.** Click "Calendar" in the nav. Confirm the current month renders with today highlighted in teal and a small bar on days with sessions.
5. **Day sheet.** Click any day with sessions. The side sheet opens listing sessions. Sessions younger than 7 days have an "Edit" button — edit one and confirm the change persists after reload.
6. **Reports + CSV.** Click "Reports". Confirm the KPI row (Today / This Week / Last Week / 7-day avg). Click "Pay period" preset — date range adapts to semi-monthly (1–15 or 16–end-of-month). Click "Download CSV" — confirm a file with header `user_email,user_name,date_local,session_id,...` downloads.
7. **Admin (as admin only).** Click "Users". Confirm the table. Click "New user" — dialog opens. Click "Audit" — audit log table renders with clickable rows that expand to before/after JSON.
8. **Theme toggle.** Click the theme button in the header. Confirm cycling dark → system → light. Reload — confirm the choice persists with no flash of wrong color on initial paint.
9. **Lockout.** Sign out. From `/login`, enter the right email with 5 wrong passwords in a row. On the 6th attempt with the correct password, confirm the error still surfaces ("Invalid email or password, or your account is locked.").
10. **Watchdog (developer-only check).** From a shell:
    ```bash
    curl -X POST -H "x-cron-secret: dev-cron-secret-32-chars-aaaaaaaa" http://localhost:3000/api/cron/watchdog
    ```
    Expected: `{"ok":true,"warned":0,"closed":0}` against a fresh DB.

---

## Is it ready to launch?

**Short answer: yes, but only to internal users, behind VPN or LAN, after a VM is provisioned.**

The code, data model, audit trail, RBAC, and operational artifacts are production-ready for an internal Lexcom audience of 5–10 users. The spec explicitly scoped Phase 1 to **internal / non-internet-exposed deployment**, and we honored that.

### What needs to happen before first real production use

| # | Task | Owner | Est. effort |
|---|---|---|---|
| 1 | Provision VM (1 vCPU / 1 GB / Docker installed) | Infra | 15 min |
| 2 | Point internal DNS (`punchpad.lexcom.internal` or chosen domain) at the VM | Network | 5 min |
| 3 | Copy repo to `/opt/punchpad`, copy `.env.example` to `.env`, fill in real `NEXTAUTH_SECRET`, `CRON_SECRET`, `POSTGRES_PASSWORD`, `ADMIN_INITIAL_PASSWORD` (use `openssl rand -base64 32`) | Jared | 10 min |
| 4 | Decide email transport: stick with Resend (signed up, API key needed) or switch to M365 SMTP (use Lexcom mailbox) | Jared | 30 min |
| 5 | `docker compose up -d` — first boot runs migrations + seeds initial admin | Jared | 5 min |
| 6 | Log in as initial admin, change password, create employee accounts in `/admin/users` | Jared | 15 min |
| 7 | Add daily backup cron line on the host (snippet in `RUNBOOK.md`) | Jared | 5 min |
| 8 | Wire `./backups/` directory to existing Lexcom backup target (rsync/restic/rclone) | Jared | 30 min |

**Total: ~2 hours of ops work, zero new code required.**

### What we are deliberately not doing in Phase 1 (per spec §1)

ConnectWise push, PTO/holidays, mobile native, SMS, SSO, public password-reset email, CSV import, HA / multi-instance. All Phase 2 candidates.

---

## Architecture summary (for the next engineer)

**Stack:** Next.js 16.2.6 (App Router, TS) · Tailwind v4 + shadcn-canary (Base UI primitives) · Prisma 7 + Postgres 16 · NextAuth v5 (Credentials, JWT) · Argon2id (`@node-rs/argon2`) · Resend (default) / Nodemailer (alt) · pino · Zod · Vitest + Testcontainers · Playwright · Caddy 2 · supercronic.

**Key seams:**

- All business logic lives in plain functions in `src/features/<x>/service.ts` taking `{ prisma, clock }` deps. **Same code services HTTP requests and the cron container.** This is the Phase 2 seam — when ConnectWise push lands, it consumes `service.ts` functions, not HTTP endpoints.
- Auth is split: `src/lib/auth.config.ts` is Edge-Runtime-safe (used by middleware), `src/lib/auth.ts` is Node-only with DB-backed Credentials provider (used by API routes / server actions). This is required by Next.js 16 + Prisma 7.
- The cron container is just `supercronic` calling `curl -X POST` against `/api/cron/*` with a shared secret header. Easy to move to a hosted cron later without touching business logic.
- All timestamps stored UTC (`timestamptz`); user's stored `timezone` is applied only at display / aggregation time via `src/lib/time.ts`.
- One-open-session-per-user is enforced both at the app layer (`clockIn` catches Prisma `P2002`) and at the DB layer (partial unique index in `prisma/migrations/<ts>_one_open_session/migration.sql`).
- All audited mutations write `before` / `after` JSON snapshots on `AuditLog`. The `system` reserved user is the actor for auto-close.

**Key paths to know:**

```
prisma/
  schema.prisma                                  # Data model (5 models, 3 enums)
  migrations/                                    # 2 migrations (init + partial unique index)
  seed.ts                                        # System user + initial admin
src/
  lib/
    auth.config.ts / auth.ts                     # Split NextAuth config (edge-safe + DB-backed)
    db.ts                                        # Prisma client singleton (PG adapter)
    env.ts                                       # Zod-validated env at boot
    time.ts                                      # TZ-aware helpers + injectable Clock
    csv.ts / errors.ts / password.ts / cron.ts   # Small utility libs
    logger.ts / email.ts                         # pino + Resend/SMTP wrapper
  features/
    attendance/service.ts                        # clockIn, clockOut, edit, admin mutations
    attendance/actions.ts                        # Server actions wrapping service
    attendance/queries.ts / calendar-queries.ts  # Read-side aggregations
    auth/lockout.ts                              # Login attempt tracking
    cron/watchdog-service.ts                     # 12h warn / 18h auto-close
    cron/digest-service.ts                       # Monday 7am local digest
    cron/notify.ts                               # Email dispatch fanout
    reports/service.ts / ranges.ts               # KPI + range aggregation
    users/admin-service.ts / admin-actions.ts    # User lifecycle
    users/service.ts                             # changeOwnPassword
  app/
    (auth)/login/                                # /login
    (app)/clock/                                 # /clock (Layout A hero)
    (app)/calendar/                              # /calendar (month grid + day sheet)
    (app)/reports/                               # /reports (KPI + table + CSV link)
    (app)/admin/users/ + admin/audit/            # Admin pages
    (app)/account/change-password/               # mustChangePassword interstitial
    api/auth/[...nextauth]/                      # NextAuth routes
    api/me/open-session/ + me/sessions/          # Client-facing JSON
    api/reports/csv/                             # Streaming CSV
    api/cron/watchdog/ + cron/weekly-digest/     # Cron endpoints
    api/health/                                  # Health check
  middleware.ts                                  # Edge: auth + mustChangePassword gate
docker-compose.yml + Dockerfile + Caddyfile      # Production stack
docker-compose.dev.yml                           # Local Postgres only
cron/Dockerfile + crontab                        # Cron container (supercronic)
.github/workflows/ci.yml                         # PR + main CI
RUNBOOK.md                                       # Deploy / update / rollback / restore
```

---

## Decisions made during implementation (so you're not surprised)

These deviate from the original plan text because the 2026 versions of our tools differ from what the plan assumed:

1. **shadcn-canary (`base-nova` style, Base UI primitives) instead of stable shadcn (Radix).** The stable shadcn CLI doesn't support Tailwind v4 at the time of writing. Base UI is the same maintainers as Radix and has equivalent API surface, but some props differ — notably `<Button asChild>` is not supported in `base-nova`. We use plain styled `<Link>` and `<button>` for compositions that would have used `asChild`. If the stable CLI lands Tailwind v4 support, you may want to re-init.
2. **Prisma 7 requires a driver adapter.** We use `@prisma/adapter-pg`. The generated client lives at `src/generated/prisma/` (configured in `prisma.config.ts`, not `node_modules`). Imports look like `import { PrismaClient } from "@/generated/prisma/client"`.
3. **NextAuth v5 split-config.** Next.js 16 + Prisma 7 + Edge Runtime cannot coexist in middleware. We split auth: `auth.config.ts` (Edge-safe, no DB) is what middleware imports; `auth.ts` (Node-only, with Credentials provider + Prisma) is what API routes and server actions import.
4. **`next lint` removed in Next 16.** `pnpm lint` now runs `eslint src/` directly. Reference if you adopt newer Next config conventions.
5. **`middleware.ts` deprecation warning.** Next 16 surfaces a console warning recommending `proxy.ts` as the new name for middleware. Functionally identical for now. Rename when stable.
6. **JWT staleness fix.** When an admin resets a password (or the initial admin completes their forced first change), the JWT in the cookie still carries `mustChangePassword: true` until refreshed. We force a fresh `signIn()` on the client after password change so the new JWT picks up the updated flag. Don't unwind this without re-testing the change-password loop.
7. **Dev Postgres on port 54329.** This host has a native Postgres listening on 5432; the dev container binds to 54329 to avoid the conflict. Production compose uses internal Docker networking, so this is dev-only.
8. **`AGENTS.md` / `CLAUDE.md` at repo root.** Auto-generated by `create-next-app@16`. They tell AI agents that Next 16 has breaking changes. Harmless; consider customizing or removing if you don't want them in the repo.
9. **No remote git origin yet.** All 33 commits are local. Push to wherever the team hosts code (GitLab, GitHub, Azure DevOps) before sharing.

---

## Open questions / decisions deferred

These are non-blocking but should be answered before going wide:

1. **Brand mark** — wordmark only (current), or wordmark + icon. Affects the header `<Link href="/clock">PunchPad</Link>` and (eventually) a favicon.
2. **Initial admin users beyond Jared** — who gets ADMIN role? Create them via `/admin/users` after first deploy.
3. **Notification channel preference** — Phase 1 sends emails only (Resend by default). In-app banner notifications are not implemented. Spec §12 left this open.
4. **Email transport** — currently pinned as Resend in the plan. If we'd rather use M365 SMTP, flip `EMAIL_TRANSPORT=smtp` in `.env` and fill in `SMTP_HOST/PORT/USER/PASS`. Both paths are wired and tested.

---

## Phase 2 candidates (priority order, suggested)

Each of these is a natural extension built on Phase 1's seams:

| Priority | Feature | Why now | Why it's easy |
|---|---|---|---|
| P1 | **ConnectWise push** of overlapping ticket entries | The whole point of decoupling payroll from billable time; CW revenue capture | `service.ts` functions are HTTP-agnostic; new `features/connectwise/` module calls them |
| P2 | **Entra SSO** (Microsoft 365) | Removes password management toil; aligns with Lexcom M365 | NextAuth v5 providers is an array — single-file addition; existing Credentials path remains for break-glass |
| P3 | **Public password-reset email** | Removes admin from the loop | Email transport + token store; UI pattern matches `/account/change-password` |
| P4 | **PTO / holiday tracking** | Payroll completeness | Audit log `before`/`after` JSON is already flexible enough for new session shapes |
| P5 | **In-app banner notifications** | Spec deferred this; users may want it alongside email | Pair with the existing live-indicator pattern |
| P6 | **Mobile shell** (Tauri) | Better phone UX than mobile web | Web is already responsive; Tauri wraps it |
| P7 | **HA / multi-instance deployment** | Only if uptime SLA tightens | Postgres can move to managed; web is stateless; cron moves to hosted scheduler |
| P8 | **Log aggregation** (Loki / CloudWatch) | When debugging gets harder than tailing one VM | pino already emits structured JSON; it's a Docker logging driver change |

---

## Operational artifacts

All production deployment files are written and committed:

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build, Next.js standalone output, ~150–200 MB image |
| `docker-compose.yml` | `web` + `postgres` + `cron` + `caddy` with health checks |
| `Caddyfile` | Automatic Let's Encrypt TLS, reverse proxy with health checks |
| `cron/Dockerfile` + `cron/crontab` | supercronic container hitting `/api/cron/*` every 15 min |
| `docker/entrypoint.sh` | Runs `prisma migrate deploy` + `prisma db seed` before booting web |
| `scripts/backup.sh` | `pg_dump | gzip` with 14-day local retention |
| `.github/workflows/ci.yml` | Lint, typecheck, unit, integration, E2E against ephemeral Postgres service |
| `RUNBOOK.md` | Deploy, update, rollback, backup, restore steps |

See `RUNBOOK.md` for the exact deploy / update / restore sequences.

---

## Secrets and credentials (current state)

- **`.env`** (gitignored, in repo root for local dev) contains:
  - `DATABASE_URL` pointing at dev Postgres on `localhost:54329`
  - `NEXTAUTH_SECRET`, `CRON_SECRET` — **dev placeholders only**, regenerate before any non-dev use
  - `ADMIN_EMAIL=jared@lexcom.com` / `ADMIN_INITIAL_PASSWORD=change-me-on-first-login`
  - `EMAIL_TRANSPORT=resend` with `RESEND_API_KEY=re_dev_dummy` — **not a real key**, swap before email actually needs to send
- **`.env.example`** (committed) — template documenting every required variable, with placeholder values.
- **No secrets in code.** All sensitive values come from env at module load, validated by Zod in `src/lib/env.ts`.

For production, generate fresh values:

```bash
openssl rand -base64 32   # NEXTAUTH_SECRET
openssl rand -base64 32   # CRON_SECRET
openssl rand -base64 24   # POSTGRES_PASSWORD
```

---

## Recommended next session checklist

If you (or whoever picks this up) wants to get to a live demo for one or two internal users:

- [ ] Decide where to host (internal VM, Azure / AWS small instance, local lab box)
- [ ] Choose email transport (Resend signup or M365 SMTP app password)
- [ ] Push the repo to a remote (GitLab / GitHub) so other engineers can pull
- [ ] Provision the VM, install Docker
- [ ] Copy `.env.example` to `.env` on the VM, fill in real secrets
- [ ] Point DNS at the VM
- [ ] `docker compose up -d` and verify `https://${PUNCHPAD_DOMAIN}/api/health` returns 200
- [ ] Log in as initial admin, change password, create 2 employee accounts
- [ ] Have 2 employees clock in/out for a day, then export their CSV
- [ ] Hand off to Phase 2 planning once you have real usage feedback

---

*End of handoff.*
