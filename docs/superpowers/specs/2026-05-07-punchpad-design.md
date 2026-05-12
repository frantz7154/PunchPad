# PunchPad — Design Specification

**Status:** ⏸ Paused 2026-05-07 — resume by reading the **▶ Resume here** section below
**Date:** 2026-05-07
**Owner:** Jared Reid (Lexcom)
**Phase:** 1 (Attendance MVP)

---

## ▶ Resume here — where we are in the workflow

We're using the `superpowers` brainstorming → planning → implementation flow. Three stages, gated:

1. **Brainstorming → spec** ✅ *complete (this document)*
2. **Writing the implementation plan** ⬅ *next step* — invoke the `superpowers:writing-plans` skill with this spec as input. Output is a separate plan doc that breaks Phase 1 into ordered, testable steps.
3. **Executing the plan** — happens in a fresh session; the plan doc drives it.

### When you come back, paste this prompt to continue:

> Continuing the PunchPad project. The design spec is at `C:\Users\Jared.Reid\punchpad\docs\superpowers\specs\2026-05-07-punchpad-design.md` and has been approved. Please review the spec briefly, then invoke the `superpowers:writing-plans` skill to build the Phase 1 implementation plan. Do not start writing code — plan first.

### Open decisions before / during implementation

These are deliberately deferred (also captured in Section 12). None block plan-writing:

- Initialize git in `C:\Users\Jared.Reid\punchpad\` (yes recommended before plan-writing) and commit the spec as the first commit.
- Pick the brand accent color (saturated teal vs amber vs other).
- Brand mark — wordmark only or wordmark + icon.
- Pay-period definition (weekly / bi-weekly / custom) — affects the "pay period" preset on `/reports`.
- Initial admin users beyond `jared@lexcom.com`.
- Choose default email transport (Resend or M365 SMTP).

### Scope guardrails (Phase 1)

If a scope question comes up later, the answer is in **Section 1 — Phase 1 non-goals**. CW push, PTO, mobile native, SMS, SSO, password-reset email, CSV import, HA — all are explicitly Phase 2.

---

## 1. Overview

PunchPad is a self-hosted clock-in / clock-out system for Lexcom's internal team. It exists alongside ConnectWise (CW), which continues to handle ticket-level time tracking. PunchPad covers a different domain: **attendance / payroll time** — when a person was on the clock — independent of which ticket(s) they were touching.

### The problem this solves

CW tracks billable time in serial 15-minute blocks tied to a single active ticket. Real MSP work is often parallel (waiting on a vendor for ticket A while debugging ticket B). The serial constraint means parallel time goes uncaptured, and billable revenue is lost. By **decoupling payroll time from billable time**, PunchPad establishes an authoritative record of "you were at work" so the team can bill freely on tickets in CW without worrying that gaps in the ticket timeline imply gaps in pay.

### Phase 1 goals

1. Authoritative attendance record per user (multiple sessions per day).
2. Polished, "wow factor" clock-in/out UX as the daily driver.
3. Calendar view of clock-in/out history.
4. Daily and weekly reports with CSV export.
5. Scheduled weekly email digest to employees and admins.
6. Architected so Phase 2 (CW push of overlapping ticket entries) is a clean addition, not a rewrite.

### Phase 1 non-goals (out of scope)

- ConnectWise integration / ticket time entries / sync.
- PTO, holiday, or break tracking.
- Mobile native app (web is mobile-responsive).
- SMS notifications.
- SSO (NextAuth credentials only; SSO is a single-file change later).
- Public password-reset email flow (admin resets manually).
- CSV import.
- High-availability / multi-instance deployment.
- Public-internet exposure beyond internal network or VPN.

---

## 2. Architecture

### Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| UI | shadcn/ui + Tailwind CSS v4 |
| ORM / DB | Prisma + PostgreSQL 16 |
| Auth | NextAuth (Credentials provider, JWT session strategy) |
| Password hashing | Argon2id (`@node-rs/argon2`) |
| Email | Resend by default; Nodemailer + SMTP as alternative |
| Scheduling | Separate `cron` container (supercronic) hitting `/api/cron/*` endpoints with shared secret |
| Reverse proxy / TLS | Caddy (automatic Let's Encrypt) |
| Logging | pino, structured JSON to stdout |
| Validation | Zod for env, server-action inputs, request bodies |
| Testing | Vitest (unit + integration via Testcontainers Postgres), Playwright (E2E) |
| Hosting | Single small VM (1 vCPU / 1 GB RAM is sufficient) running Docker Compose |

### Project shape

```
punchpad/
├── docker-compose.yml         # web + postgres + cron + caddy
├── Dockerfile                 # multi-stage, Next.js standalone build (~150 MB image)
├── .env.example               # documents every env var
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                # seeds system user + initial admin from env
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # login route group
│   │   ├── (app)/             # authenticated app
│   │   │   ├── clock/
│   │   │   ├── calendar/
│   │   │   ├── reports/
│   │   │   └── admin/         # admin-only
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── reports/csv/   # streaming CSV export
│   │   │   ├── cron/watchdog/
│   │   │   ├── cron/weekly-digest/
│   │   │   └── health/
│   │   └── layout.tsx
│   ├── features/              # feature-bounded modules
│   │   ├── attendance/
│   │   │   ├── service.ts     # business logic — used by actions and cron
│   │   │   ├── actions.ts     # server actions
│   │   │   └── components/
│   │   ├── reports/
│   │   ├── users/
│   │   └── audit/
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── auth.ts            # NextAuth config + requireUser/requireAdmin helpers
│   │   ├── email.ts           # Resend / SMTP wrapper
│   │   ├── env.ts             # Zod-validated env
│   │   ├── time.ts            # TZ-aware helpers + clock abstraction
│   │   ├── errors.ts          # AppError hierarchy
│   │   └── csv.ts             # row builder
│   └── styles/                # Tailwind config + theme tokens (dark/light/system)
└── tests/
    ├── unit/                  # Vitest pure-function tests
    ├── integration/           # Vitest + Testcontainers
    ├── e2e/                   # Playwright
    ├── fixtures/seed.ts
    └── factories/
```

### Two execution paths sharing the same business logic

1. **Web request:** server action → `features/<x>/service.ts` → Prisma → response.
2. **Scheduled job:** cron container → `POST /api/cron/<job>` (shared secret) → same `service.ts` functions → DB / email.

Putting business logic in plain functions in `service.ts` means it is testable in milliseconds without HTTP, and it is the seam where Phase 2 CW push will plug in.

---

## 3. Data model

All times stored UTC (`timestamptz`). User timezone is applied at display and aggregation time only.

### `User`

```prisma
model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  name                String
  passwordHash        String
  role                Role      @default(EMPLOYEE)
  timezone            String    @default("America/Chicago")  // IANA TZ
  mustChangePassword  Boolean   @default(false)
  deactivatedAt       DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  sessions            TimeSession[]
  auditLogs           AuditLog[] @relation("ActorAuditLogs")
}

enum Role { EMPLOYEE  ADMIN }
```

A reserved row with `id = "system"` is seeded at deploy time and used as `actorUserId` for auto-close events. Deleting it is prevented by application code.

### `TimeSession`

```prisma
model TimeSession {
  id           String    @id @default(cuid())
  userId       String
  clockInAt    DateTime
  clockOutAt   DateTime?     // null = currently clocked in
  autoClosed   Boolean   @default(false)
  warnedAt     DateTime?     // 12h-warning timestamp; idempotency for warn pass
  notes        String?
  deletedAt    DateTime?     // soft delete (admin only)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  user         User      @relation(fields: [userId], references: [id])
  auditLogs    AuditLog[]

  @@index([userId, clockInAt])
}
```

**Key invariant:** a user can have at most one open session at any time. Enforced two ways:

1. App layer: a transactional check inside `clockIn()` that refuses if the user already has any session with `clockOutAt IS NULL`.
2. DB layer: partial unique index in a raw migration:
   ```sql
   CREATE UNIQUE INDEX one_open_session_per_user
     ON "TimeSession" ("userId") WHERE "clockOutAt" IS NULL;
   ```

A session belongs to the calendar date of `clockInAt` *in the user's stored timezone*. Sessions crossing midnight count toward their start date.

### `AuditLog`

```prisma
model AuditLog {
  id              String    @id @default(cuid())
  actorUserId     String
  targetSessionId String?
  action          AuditAction
  before          Json?
  after           Json?
  reason          String?
  at              DateTime  @default(now())

  actor   User         @relation("ActorAuditLogs", fields: [actorUserId], references: [id])
  session TimeSession? @relation(fields: [targetSessionId], references: [id])

  @@index([targetSessionId, at])
  @@index([actorUserId, at])
}

enum AuditAction {
  CLOCK_IN
  CLOCK_OUT
  EDIT_SESSION
  DELETE_SESSION
  AUTO_CLOSE
  CREATE_USER
  DEACTIVATE_USER
  ROLE_CHANGE
}
```

### `LoginAttempt` (lockout tracking)

```prisma
model LoginAttempt {
  id        String   @id @default(cuid())
  email     String
  succeeded Boolean
  at        DateTime @default(now())

  @@index([email, at])
}
```

A user's account locks for 15 minutes after 5 failed attempts within a 15-minute window. Old rows pruned by a small periodic job.

### `DigestSend` (digest idempotency)

```prisma
model DigestSend {
  id      String   @id @default(cuid())
  userId  String
  isoWeek String   // e.g. "2026-W18"
  sentAt  DateTime @default(now())

  @@unique([userId, isoWeek])
}
```

---

## 4. Authentication & roles

### Login

- **NextAuth Credentials provider**, JWT session strategy. Cookie is httpOnly + sameSite=lax + secure (in prod).
- **Argon2id** password hashing.
- **Session lifetime:** 30 days, sliding refresh on activity.
- **Custom session shape** carries `id`, `email`, `name`, `role`, and `timezone` so server actions don't need a DB hit just to authorize. Role/timezone refresh on each successful re-login.
- **Password policy:** minimum 12 characters, no other rules.
- **Lockout:** 5 failures in 15 minutes → 15-minute lock. Tracked in `LoginAttempt`.
- **CSRF:** NextAuth handles auth flow CSRF; Next.js 16 server actions have built-in CSRF protection.

### Authorization helpers (single source of truth)

```ts
// src/lib/auth.ts
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ForbiddenError();
  return user;
}
```

Every server action and API route begins with one of these. Middleware also protects the `(app)` route group at the network layer as defense in depth.

### Account lifecycle

- **Initial admin** seeded from `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` on first run only (skipped if any admin exists). `mustChangePassword = true` so first login forces a new password.
- **New employees** created by an admin in `/admin/users`. Admin sets a temp password; user is forced to change it on first login.
- **Deactivation** sets `deactivatedAt`. Login refuses; data and history persist.
- **Password reset** is admin-driven in Phase 1 — admin sets a new temp password via `/admin/users`, communicated out-of-band.

### Roles

| Capability | Employee | Admin |
|---|:---:|:---:|
| Clock in / out | ✓ | ✓ |
| View own calendar | ✓ | ✓ |
| Edit own session within last 7 days | ✓ | ✓ |
| Edit any session, any date | | ✓ |
| Delete a session (soft) | | ✓ |
| View all users' calendars | | ✓ |
| Manage users (create / deactivate / reset password) | | ✓ |
| View audit log | | ✓ |
| Export CSV (own data) | ✓ | ✓ |
| Export CSV (all users) | | ✓ |

---

## 5. Core flows

Pseudocode. Every step inside a transaction unless noted.

### Clock in

```
clockIn():
  user = requireUser()
  if user.deactivatedAt: throw ForbiddenError("Account is deactivated")
  TX:
    if exists session where userId = user.id AND clockOutAt IS NULL:
      throw ConflictError("ALREADY_CLOCKED_IN")
    session = insert TimeSession(userId=user.id, clockInAt=now())
    insert AuditLog(action=CLOCK_IN, actorUserId=user.id, targetSessionId=session.id)
  revalidate("/clock", "/calendar")
```

### Clock out

```
clockOut():
  user = requireUser()
  TX:
    open = find single session where userId = user.id AND clockOutAt IS NULL
    if not open: throw NotFoundError("NOT_CLOCKED_IN")
    update open.clockOutAt = now()
    insert AuditLog(action=CLOCK_OUT, actorUserId=user.id, targetSessionId=open.id)
  revalidate("/clock", "/calendar", "/reports")
```

### Self-edit (employee, last 7 days)

```
editOwnSession(id, patch):
  user = requireUser()
  TX:
    s = load TimeSession by id
    if s.userId != user.id: throw ForbiddenError
    if s.deletedAt: throw NotFoundError
    if (now() - s.clockInAt) > 7 days: throw ForbiddenError("OUTSIDE_EDIT_WINDOW")
    validate(patch):
      clockInAt < clockOutAt
      neither in the future
      no overlap with this user's other sessions (excluding s)
    before = snapshot(s)
    apply patch
    after  = snapshot(s)
    insert AuditLog(action=EDIT_SESSION, actorUserId=user.id, targetSessionId=s.id,
                    before, after, reason=patch.reason)
```

### Admin edit / delete

Same as `editOwnSession` but with `requireAdmin()` and no 7-day window. Delete sets `deletedAt`, writes `AuditAction.DELETE_SESSION`.

### Auto-close watchdog

`POST /api/cron/watchdog`, fired every 15 minutes by the cron container.

```
watchdog():
  verify x-cron-secret header
  warnPass:
    sessions = find where clockOutAt IS NULL
                     AND warnedAt IS NULL
                     AND now() - clockInAt >= WATCHDOG_WARN_HOURS
    for s in sessions:
      set s.warnedAt = now()
      enqueueNotification(s.userId, "Still working? You've been clocked in 12 hours.")
  closePass:
    sessions = find where clockOutAt IS NULL
                     AND now() - clockInAt >= WATCHDOG_CLOSE_HOURS
    for s in sessions:
      before = snapshot(s)
      s.clockOutAt = s.clockInAt + WATCHDOG_CLOSE_HOURS  // deterministic
      s.autoClosed = true
      after = snapshot(s)
      insert AuditLog(action=AUTO_CLOSE, actorUserId="system",
                      targetSessionId=s.id, before, after,
                      reason="Exceeded watchdog threshold")
      enqueueNotification(s.userId, "Auto-closed after 18h. Edit if needed.")
      enqueueNotification(<all admins>, "User X auto-closed.")
```

Both passes are idempotent: a re-run finds no matching rows because `warnedAt` and `clockOutAt` flip on first pass.

---

## 6. UI surfaces

### Theme & visual language

Per Lexcom global frontend rules:

- **Three modes** — dark (default), light, system. CSS custom properties; theme toggle in header; init runs before paint to prevent flash of wrong theme.
- **Typography** — JetBrains Mono for the live clock and durations; Inter for body; Outfit for headings.
- **Motion** — 200–300 ms transitions, `prefers-reduced-motion` respected. Clock state change uses a brief scale + color pulse.
- **Color** — semantic tokens (`--bg`, `--bg-elev`, `--text`, `--text-dim`, `--accent`, `--success`, `--warn`, `--danger`). Accent color: TBD at implementation (saturated teal or amber).
- **Responsive** — mobile-first; works on phones (the eventual desktop-app wrap is just a Tauri shell).

### Screens

#### `/login`

Single centered card. Email + password + "Sign in". Subtle Lexcom mark. No public signup, no "forgot password" link in Phase 1 (copy: "Ask your admin").

#### `/clock` *(layout A — single hero state)*

The marquee screen. Approved layout:

```
┌──────────────────────────────────────────────────────────┐
│  PunchPad           Clock  Calendar  Reports  ☉  Jared ▾ │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                  ON THE CLOCK                            │
│                  06 : 12 : 47                            │
│           Started at 8:14 AM · Tuesday                   │
│                                                          │
│           ┌─────────────────────────────┐                │
│           │       CLOCK OUT             │                │
│           └─────────────────────────────┘                │
│                                                          │
│  Today: 6h 12m   This week: 28h 04m   Sessions: 1        │
│  Recent ─────────────────────────────────────────────    │
│  Mon  8:01a → 5:32p   8h 31m                             │
│  Fri  8:11a → 4:48p   8h 37m                             │
└──────────────────────────────────────────────────────────┘
```

Header has a persistent live indicator next to the user menu: a small pulsing dot + "On the clock 6h 12m" when active, dim when not. The clock state in the hero is the source of truth; the small indicator mirrors it.

#### `/calendar`

Month view by default; week view toggle. Each day cell shows total hours as a small bar plus a faint count of sessions. Today highlighted. Click a day → side sheet with session list and edit affordance for sessions inside the 7-day window.

#### `/reports`

- KPI row: *Today*, *This Week*, *Last Week*, *7-Day Avg* (JetBrains Mono).
- Date range picker with presets (this week / last week / pay period / custom).
- Per-user table with daily breakdown — sortable, sticky header. Employees see themselves only; admins see all users with a user filter.
- **Export CSV** button → `/api/reports/csv` (streamed).

#### `/admin/users` *(admin only)*

Table: name, email, role, status, last clock-in. Buttons: *New user*, *Edit*, *Reset password*, *Deactivate*. Modal forms.

#### `/admin/audit` *(admin only)*

Reverse-chronological audit log. Filters: actor, action, date range, target user. Each row expands to show before / after JSON. Plain and dense.

---

## 7. Reports, CSV export, weekly digest

### CSV export

- `GET /api/reports/csv?from=YYYY-MM-DD&to=YYYY-MM-DD&userId=<optional>`
- Streamed response.
- Filename: `punchpad-2026-04-21_to_2026-04-27.csv`.
- Columns: `user_email, user_name, date_local, session_id, clock_in_local, clock_out_local, duration_minutes, auto_closed, edited, notes`. A second set of `_utc` companion columns lets auditors verify against the underlying timestamps.
- Auth: same `requireUser` / `requireAdmin` rules. Employee export includes only their own sessions; admin export honors `userId` filter (or omits it for all users).

### Weekly digest email

- Sent **Monday at 7:00 AM in the recipient's timezone**.
- **To employees:** prior week summary — total hours, daily breakdown, any auto-closed or edited sessions flagged.
- **To admins:** rolled-up team summary — totals per person, anyone with auto-closed sessions, anyone with no clock-ins.
- Plain HTML, scannable. Light-mode brand styling.
- Triggered by `POST /api/cron/weekly-digest` (shared secret). Idempotency: `(userId, isoWeek)` unique constraint in `DigestSend` table — a duplicate fire is a no-op.

### Cron schedule

| Job | Cadence | Endpoint |
|---|---|---|
| Watchdog (warn + auto-close) | every 15 min | `POST /api/cron/watchdog` |
| Weekly digest | every 15 min on Monday between 06:00–15:00 UTC (covers all U.S. timezones with margin); handler fires only for users whose local time is within `[DIGEST_SEND_HOUR_LOCAL, DIGEST_SEND_HOUR_LOCAL + 15min]`; `DigestSend` idempotency prevents duplicates | `POST /api/cron/weekly-digest` |

### Email transport

`EMAIL_TRANSPORT=resend` (default) or `EMAIL_TRANSPORT=smtp`. Resend uses an API key; SMTP uses Nodemailer with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. Choice is made at deploy by env, no code change.

---

## 8. Errors, validation, edge cases

### Error model

```ts
class AppError extends Error {
  constructor(
    public code: string,
    public httpStatus: number,
    public userMessage: string,
    message?: string,
  ) { super(message ?? userMessage); }
}
class UnauthorizedError extends AppError { ... }
class ForbiddenError    extends AppError { ... }
class ValidationError   extends AppError { ... }
class ConflictError     extends AppError { ... }
class NotFoundError     extends AppError { ... }
class ServiceUnavailableError extends AppError { ... }
```

A thin wrapper around server actions and route handlers maps `AppError` → `{ ok: false, code, message }`, logs with request and user context, and re-raises unknown errors. UI matches on `code`.

### Validation

- **Zod** at every boundary: env, server-action inputs, request bodies.
- Internal calls trust internal data — no over-validation between modules.

### Edge cases

| Case | Handling |
|---|---|
| Double-click "Clock In" or retry storm | Partial unique index rejects; UI catches `ConflictError("ALREADY_CLOCKED_IN")`. |
| Two devices for the same user | `/clock` server-fetches state on each load; second device sees the open session and shows the "On the clock" view rather than the clock-in button. |
| Client clock skew | All stored timestamps are server `now()`; live UI counters use `clientNow - serverProvidedClockInAt` so display drift is bounded but truth isn't. |
| DST transition mid-session | UTC storage + TZ-on-display. A session that crosses spring-forward measures 23 wall-clock hours. Documented explicitly. |
| Session crosses midnight | Belongs to the calendar date of `clockInAt` *in the user's TZ*. |
| Edit creates an overlap | Service rejects with `ConflictError`; UI surfaces the conflicting session. |
| User deactivated mid-session | Can clock out (no orphaned open session). New clock-ins blocked with `ForbiddenError`. |
| Cron worker down for hours | Watchdog passes are idempotent — next run catches up. `warnedAt` prevents double-warns. |
| Digest cron fires twice | `DigestSend` unique constraint prevents the second send. |
| DB briefly unreachable | `ServiceUnavailableError`; UI toast "Couldn't reach the server — try again." No silent retries. |
| Unauthorized cron call | `401`, no body. Logged with source IP. |

### Logging

- **pino**, structured JSON to stdout.
- One logger per request; bound `request_id` and (when authenticated) `user_id`.
- Levels: `error` / `warn` / `info` (login, clock_in, clock_out, edit, auto_close, digest_sent) / `debug` (dev only).
- **Never** log passwords, tokens, or session contents.

### User-facing error UX

- **Toast** for transient errors and successful actions.
- **Inline form errors** for validation (`ValidationError.code` maps to a field).
- **Empty / error states** on every list view ("No sessions yet" / "Couldn't load — retry"). No bare spinners.

---

## 9. Testing strategy

Aligns with global testing rules: ≥ 80% lines/branches; ≥ 95% on critical paths; AAA structure; no `it.skip` on main.

### Layers

**Unit (Vitest)** — pure functions, no I/O. Targets:
- `lib/time.ts` (TZ-aware day/week boundaries, durations).
- `features/attendance/service.ts` overlap detection, watchdog selection logic, edit validation.
- `lib/csv.ts` row builder.

**Integration (Vitest + Testcontainers Postgres)** — service layer with a real DB; fresh schema per test. Covers clock-in / clock-out / edit / delete with all invariants, audit-log writes, partial-unique-index enforcement, watchdog passes, digest idempotency, NextAuth `authorize`, lockout counter, and a parameterized "every server action requires auth, every admin action requires admin" check.

**E2E (Playwright)** — critical journeys end-to-end:

| Flow | Why E2E |
|---|---|
| Login (success + lockout) | Cookie + session shape are real |
| Clock in → clock out → see session in `/calendar` | Marquee path |
| Edit a session within 7 days | Validation surfaces correctly |
| Admin creates user → user logs in → must change password | Account lifecycle |
| Admin edits another user's session | Role boundary |
| CSV export downloads correctly | Streaming response works |
| Auto-close watchdog produces expected record | Hit `/api/cron/watchdog` directly with a fixed test clock |
| Theme toggle persists + initializes pre-paint | No flash of wrong theme |

Following the governance-inversion-SaaS pattern: globalSetup seeds DB; an `auth.setup` Playwright project injects a NextAuth JWT cookie into `storageState`. Use `data-testid` everywhere — never `getByText` for unique elements (per prior lessons learned).

### Time control

A `clock` abstraction in `lib/time.ts` (`clock.now()`); production passes through to `Date`. Tests swap a fake clock to step forward "12 hours later" deterministically.

### CI gates (every PR)

```
pnpm install      (cached)
pnpm lint         (eslint + prettier check)
pnpm typecheck    (tsc --noEmit)
pnpm test:unit
pnpm test:int     (Testcontainers Postgres)
pnpm test:e2e     (Playwright vs built app)
```

All must pass before merge. Coverage reported via Vitest c8 and surfaced in PR comments.

---

## 10. Deployment & operations

### Topology

Single small VM (1 vCPU / 1 GB RAM is plenty for 5 users). Docker Compose runs four services:

| Service | Image | Purpose |
|---|---|---|
| `web` | local Dockerfile (Next.js standalone) | Application |
| `postgres` | `postgres:16-alpine` | Database, named volume `pgdata` |
| `cron` | `alpine` + supercronic | Scheduled HTTP triggers |
| `caddy` | `caddy:2` | TLS termination + reverse proxy |

### Environment variables

```
# App
NODE_ENV=production
NEXTAUTH_URL=https://punchpad.lexcom.internal
NEXTAUTH_SECRET=<32-byte random>

# DB
DATABASE_URL=postgresql://punchpad:<pw>@postgres:5432/punchpad

# Initial admin (ignored after first run)
ADMIN_EMAIL=jared@lexcom.com
ADMIN_INITIAL_PASSWORD=<change-me-on-first-login>

# Cron
CRON_SECRET=<32-byte random>
WATCHDOG_WARN_HOURS=12
WATCHDOG_CLOSE_HOURS=18

# Email
EMAIL_TRANSPORT=resend
RESEND_API_KEY=<key>
EMAIL_FROM="PunchPad <punchpad@lexcom.com>"
# SMTP_HOST=, SMTP_PORT=, SMTP_USER=, SMTP_PASS=  (when EMAIL_TRANSPORT=smtp)

# Defaults
TZ_DEFAULT=America/Chicago
DIGEST_SEND_HOUR_LOCAL=7
```

All validated by Zod at boot (`lib/env.ts`). Missing/invalid → exit with a single readable error.

### Migrations

`prisma migrate deploy` runs as part of the `web` container's startup script before the server boots. Idempotent. New migrations ship as new files; existing migrations are never edited.

### Backups

- Daily `pg_dump` to a mounted `backups/` directory (filename: `punchpad-YYYY-MM-DD.sql.gz`).
- Local retention: 14 days.
- Off-site copy via your existing backup target (rsync / restic / rclone). Documented but not coded into Phase 1.

### Health & observability

- `GET /api/health` → `{ ok: true, db: "up", commit: "<sha>" }`. Caddy uses it for upstream health.
- Logs to stdout → captured by Docker → tailable via `docker compose logs -f web`.
- Hooking a log aggregator (Loki, CloudWatch) later is config-only.

### Update process

```
git pull
docker compose build web
docker compose up -d web
```

Migrations run automatically on container start. A short restart blip (~5 s) is acceptable; a missed click in that window is recoverable manually.

---

## 11. Phase 2 hooks (informational, not in Phase 1 scope)

Architecture decisions made now to keep Phase 2 simple:

- Business logic in `service.ts` files (HTTP-agnostic) → a new `features/connectwise/` module can call them without rewrites.
- Audit log records `before`/`after` JSON → flexible enough for new session shapes (CW ticket entries, breaks, PTO).
- NextAuth provider list is an array → adding Entra ID for SSO is a single-file change.
- Email transport is config-driven → no code change to switch providers.
- Soft-deletes everywhere → no data loss on errors of judgment.
- Cron HTTP triggers → can move to a hosted scheduler later with no business-logic edits.

Likely Phase 2 features: CW push of overlapping ticket entries, Entra SSO, password-reset email flow, PTO/holiday tracking, mobile native shell (Tauri).

---

## 12. Open items for implementation

These are decisions left to the implementation phase:

- **Accent color** for the brand (saturated teal vs amber vs other).
- **Brand mark** — wordmark only, or a small icon as well.
- **Pay-period definition** (weekly vs bi-weekly vs custom) — affects "pay period" date-range preset on `/reports`.
- **Initial set of admin users** beyond Jared.
- **Notification channel preference** when a user has multiple delivery options (email + in-app banner — both, or one).

None of these block the implementation plan; they're the kind of small calls we make as we build.

---

*End of design.*
