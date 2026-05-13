# PunchPad — Stage 1 Launch Handoff (Public Repo Live)

**Date:** 2026-05-13
**Owner:** Jared Reid (`frantz7154` on GitHub)
**Repo:** https://github.com/frantz7154/PunchPad (public)
**Previous handoff:** [`2026-05-12-phase1-handoff.md`](2026-05-12-phase1-handoff.md) — development complete → ready to launch
**This handoff:** Stage 1 of launch complete — code is now public on GitHub with green CI. Captures what's left to actually run PunchPad with real users.

---

## Executive summary

Today's work pushed PunchPad from "feature-complete, lives only on Jared's laptop" to **"public on GitHub at https://github.com/frantz7154/PunchPad with all CI gates green."** The repo is hardened for public visibility — example-config files sanitized, repo description and topics applied, and four real React Compiler hook-rule violations that had been latent (and incorrectly reported as green in the prior handoff) are now fixed. **The path to first production use is unchanged from yesterday: ~2 hours of ops work, zero new code.** The remaining gating items are three pre-flight decisions (hosting target, domain, email transport), then a routine provision → secrets → boot → pilot sequence.

---

## What changed today (2026-05-13)

Three commits added on `main`, all CI-verified green:

| SHA | Subject | What it did |
|---|---|---|
| `cdc521a` | `docs: Phase 1 handoff document` | (From 2026-05-12; first commit pushed to remote.) |
| `b040673` | `chore: sanitize example env and metadata for public repo` | `.env.example`, `src/app/layout.tsx` meta description, and the env-test fixture switched from `jared@lexcom.com` → `admin@example.com`. Authentic Lexcom references in `docs/` (handoff, spec, plan) intentionally preserved as portfolio provenance. |
| `0b384af` | `fix: resolve React Compiler hook rule violations` | 4 errors + 2 warnings from `eslint-plugin-react-hooks@7.1.1` resolved across `live-indicator.tsx`, `theme-toggle.tsx`, `day-sheet.tsx`, `range-picker.tsx`, `db.ts`. See "Implementation deviations" below for the patterns used. |

GitHub-side changes (API only, no commit):

- **Description set:** *"Self-hosted clock-in/out attendance tracker. Decouples payroll time from billable ticket time. Next.js 16 + Prisma 7 + NextAuth v5 + Postgres + Docker."*
- **12 topics applied:** `nextjs`, `typescript`, `prisma`, `postgresql`, `nextauth`, `tailwindcss`, `docker`, `docker-compose`, `self-hosted`, `attendance`, `time-tracking`, `internal-tools`.
- **Visibility: public** — intentional, for portfolio.

---

## Current state at a glance

| Area | State | Notes |
|---|---|---|
| Code | Phase 1 complete + hook-rule fixes | Tagged `v1.0.0-phase1` (covers M0–M10 from plan). |
| GitHub remote | ✅ `frantz7154/PunchPad` | Public; CI runs on every push to `main`. |
| Tag pushed | ✅ `v1.0.0-phase1` on `f26cb50` | Worth drafting a Release on GitHub for polish — optional. |
| CI | ✅ All gates green | Lint, typecheck, unit 50/50, integration 35/35, E2E 14/14. Run `25811755056` — 9m48s cold-cache. |
| Lint | ✅ Actually green now | Prior handoff claimed green; was red. Fixed in `0b384af`. |
| Production deployment | ⏸ Not started | Same as 2026-05-12. |
| Domain / DNS | ⏸ Not configured | Stage 0 decision pending. |
| Backups | ⏸ Script written, not scheduled | Post-deploy task. |
| `gh` CLI | ✅ Authenticated as both `frantz7154` (active) and `Ducky119` | Switch with `gh auth switch -u <name>`. |

---

## Trust-calibration findings (important for future sessions)

Two things surfaced during today's work that future sessions should not lose:

1. **The 2026-05-12 handoff over-stated lint status.** It claimed "Lint / typecheck / format — Green" while lint had actually been failing locally on 4 React Compiler hook-rule violations. These rules came in when `eslint-plugin-react-hooks` resolved to ≥7.1. CI exposed the discrepancy on the first push to GitHub. Fixed in `0b384af`. **Lesson: verify gates at the moment of writing — don't rely on remembered state.**
2. **All other test counts in the prior handoff are now externally verified.** The CI run on a fresh Ubuntu runner with `--frozen-lockfile` confirmed 50 unit + 35 integration + 14 E2E. These numbers can be trusted going forward — they're not just self-reported, they ran on a clean environment with no stale `node_modules`.

---

## Implementation deviations (additions since 2026-05-12)

React Compiler hook rules (`eslint-plugin-react-hooks@7.1.1`) are now satisfied. Patterns used:

- **`Date.now()` in render** → store `now` in state, update via `setInterval` in `useEffect`. Used in `live-indicator.tsx` (30s tick for live counter) and `day-sheet.tsx` (refresh on data fetch for the 7-day-edit-window check).
- **`localStorage` hydration on mount** → `useSyncExternalStore` with a server snapshot (`"system"` theme on SSR). Avoids hydration mismatch. Same-tab updates dispatch a custom `punchpad-theme-changed` event the subscriber listens for, because the `storage` event only fires cross-tab. Used in `theme-toggle.tsx`.
- **Manual `loading` state in data-fetch effects** → `useTransition` + `isPending`, so the setState inside the async action isn't flagged by `set-state-in-effect`. Used in `day-sheet.tsx`.

These are the React-team-recommended patterns for React 19 + React Compiler. Future component work should follow them.

---

## What's next (sequenced)

Same launch plan as 2026-05-12, with Stage 1 now complete:

| Stage | Description | Status |
|---|---|---|
| 0 | Pre-flight decisions: hosting target, domain, email transport | ⏸ **Next gate** |
| 1 | Push code to remote + polish | ✅ Done (this handoff) |
| 2 | Provision VM + install Docker; configure DNS | ⏸ |
| 3 | Clone repo to VM, generate real secrets, populate `.env` | ⏸ |
| 4 | First boot — `docker compose up -d`, verify `/api/health` 200 | ⏸ |
| 5 | Bootstrap users — log in as initial admin, change password, create pilot accounts | ⏸ |
| 6 | Operational hardening — daily backup cron, wire `./backups/` to off-site target | ⏸ |
| 7 | Pilot — 2–3 internal users for one week, then decide Phase 2 priorities | ⏸ |

Total estimated wall-clock from "Stage 0 decisions made" to "pilot live": **~2 hours of focused ops work**, plus DNS propagation and pilot duration.

---

## Stage 0 decisions still needed

These three decisions gate everything downstream:

### 1. Hosting target

| Option | Pros | Cons | TLS implication |
|---|---|---|---|
| Internal Lexcom VM (Hyper-V/VMware) | No external dependency; behind VPN; cheapest | Need IT to provision; not internet-reachable | Caddy auto-LE doesn't work; use `tls internal` or DNS-01 challenge |
| Azure / AWS small instance (~$15–30/mo) | Public-reachable; auto-TLS works as configured | Recurring cost; secrets travel outside Lexcom perimeter | Caddy + Let's Encrypt HTTP-01 works out of the box |
| Local lab box | Free; full control | Uptime not enterprise-grade; reboot risk | Same constraints as internal VM |

### 2. Domain

- `punchpad.lexcom.internal` (split-horizon DNS, internal only)
- `punchpad.lexcom.com` (public DNS, even if access is restricted by VPN/firewall)
- Something else

### 3. Email transport

| Option | Pros | Cons |
|---|---|---|
| Resend | Already wired as default; clean API; good deliverability | New vendor; another credential to manage; verify sending domain |
| M365 SMTP (Lexcom mailbox) | Reuses existing tenant; credentials stay internal; no new vendor | App password required in Entra ID; SMTP AUTH must be enabled on the mailbox |

**Mild recommendation: M365 SMTP** — keeps the credential surface inside the existing Lexcom tenant, no new vendor relationship to manage. Both paths are wired and tested in code.

---

## Other open / non-blocking items

**Carried forward from 2026-05-12:**

- Brand mark — wordmark only (current) vs. wordmark + icon.
- Initial admin users beyond Jared — create via `/admin/users` after first deploy.
- Notification channels — email only currently; in-app banners not implemented.

**New as of 2026-05-13:**

- **README is 5 lines.** Adequate, but for a portfolio repo a richer README would lift first-impression substantially. Suggested additions: problem statement ("Decouples payroll from billable time…"), stack badges (`shields.io`), screenshot of the clock screen, run-locally section, links to the design spec + handoff docs. ~30 min of work.
- **GitHub Actions Node 20 deprecation warning** on `actions/checkout@v4`, `actions/setup-node@v4`, `pnpm/action-setup@v4`. Forced switch to Node 24 on **2026-06-02**. Trivial workflow-file update; can wait until you have another reason to touch `.github/workflows/ci.yml`.
- **Draft a GitHub Release for `v1.0.0-phase1`.** The tag is pushed but no Release object exists. Releases get their own URL and discoverability on GitHub and look polished on a portfolio profile. One click: https://github.com/frantz7154/PunchPad/releases/new

---

## Where to look (key file paths)

For the next engineer (or future-you):

```
docs/
  handoff/
    2026-05-12-phase1-handoff.md          ← architecture, decisions, runbook
    2026-05-13-stage1-launch-handoff.md   ← this file
  superpowers/
    specs/2026-05-07-punchpad-design.md   ← original design spec
    plans/2026-05-12-punchpad-phase1-plan.md  ← 67-task implementation plan
RUNBOOK.md                                  ← deploy / update / rollback / restore
docker-compose.yml + Dockerfile + Caddyfile ← production stack
.github/workflows/ci.yml                    ← CI definition (note: Node 20 deprecation pending)
```

---

## How to resume

1. Read this file for current state.
2. Read `2026-05-12-phase1-handoff.md` for deeper architecture/decisions context.
3. Make the three Stage 0 decisions (hosting, domain, email transport).
4. Walk Stages 2–7 as documented in `2026-05-12-phase1-handoff.md` §"What needs to happen before first real production use."

`gh` is now authenticated as both `frantz7154` (active) and `Ducky119`. Switch with `gh auth switch -u <name>` — no re-login required.

---

*End of Stage 1 launch handoff.*
