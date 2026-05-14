# PunchPad Runbook

## First-time deployment

1. Provision the VM (1 vCPU / 1 GB RAM is sufficient). Install Docker and the Docker Compose plugin.
2. `git clone` this repo to `/opt/punchpad`.
3. Copy `.env.example` to `.env` and fill in:
   - `POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, `CRON_SECRET` — generate fresh 32-byte values (`openssl rand -base64 32`).
   - `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`, `NEXTAUTH_URL`, `PUNCHPAD_DOMAIN`, `ACME_EMAIL`.
   - `EMAIL_TRANSPORT` + corresponding keys (`RESEND_API_KEY` or `SMTP_*`).
4. Point DNS `${PUNCHPAD_DOMAIN}` at the VM.
5. `docker compose up -d`. First boot pulls images, builds `web`, runs migrations, seeds the system user and initial admin.
6. Visit `https://${PUNCHPAD_DOMAIN}`. Log in as `${ADMIN_EMAIL}` with `${ADMIN_INITIAL_PASSWORD}`; you'll be forced to change the password.
7. Add the host crontab line for daily backups (see Backups below).

## Update

```bash
cd /opt/punchpad
git pull
docker compose build web
docker compose up -d web
```

Migrations run automatically on `web` start. Other services keep running. The blip is ~5 seconds; clicks during that window can be recovered manually via `/admin/audit`.

## Rollback

```bash
cd /opt/punchpad
git checkout <previous-tag>
docker compose build web
docker compose up -d web
```

If a migration was applied and you need to revert it: restore from the most recent backup (see Restore below) and roll the code back.

## Backups

Host crontab line (`crontab -e`):

```
0 3 * * * cd /opt/punchpad && ./scripts/backup.sh >> /var/log/punchpad-backup.log 2>&1
```

Off-site copy: pipe `./backups/` to your existing target (rsync / restic / rclone). Not wired automatically in Phase 1.

## Restore

```bash
cd /opt/punchpad
docker compose stop web cron
gunzip -c backups/punchpad-YYYY-MM-DD.sql.gz \
  | docker compose exec -T postgres psql -U punchpad -d punchpad
docker compose start web cron
```

## Recover lost admin password

Phase 1 has no email-based password reset (Phase 2 P3 candidate). If an admin forgets their password — or you need to bootstrap a new admin because the seed skipped (some other admin already existed) — use the CLI utility from a checkout of the repo with dependencies installed:

```bash
cd /opt/punchpad
pnpm exec tsx scripts/reset-password.ts <email> "<new-password>"
```

The script:

- Requires the new password to be ≥12 characters (matches the app's policy).
- Hashes with Argon2id, same parameters as the live app.
- Sets the password, clears `mustChangePassword`, reactivates the account if `deactivatedAt` was set, and clears recent `LoginAttempt` rows so the lockout counter resets.
- Errors if the user does not exist. To create a missing admin, add `--create-admin --name "Full Name"`:

```bash
pnpm exec tsx scripts/reset-password.ts admin@example.com "ChangeMeNow!23" \
  --create-admin --name "Site Admin"
```

**Phase 1.1 follow-up:** the production `runner` Docker stage uses Next.js's standalone output and does not include `scripts/` or `tsx`. To run this script on a production VM, either (a) keep a full checkout of the repo on the host outside the container and run `pnpm install && pnpm exec tsx ...`, or (b) extend the Dockerfile to ship `scripts/` and a minimal Node toolchain into a separate stage. The password argument is briefly visible in `ps` output and shell history — prefix with a space (with `HISTCONTROL=ignorespace`) if that matters.

## Cron health checks

- Tail watchdog logs: `docker compose logs cron --tail=200`
- Manual trigger:
  ```
  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" \
    http://localhost:3000/api/cron/watchdog
  ```

## Observability

- `docker compose logs -f web` — JSON pino logs to stdout.
- `GET /api/health` returns `{ ok, db, commit }`. Caddy uses it for upstream health.
- To ship logs to a log aggregator later, mount the Docker logging driver — no code change required.

## Local development

```bash
docker compose -f docker-compose.dev.yml up -d   # starts Postgres on host port 54329
cp .env.example .env                              # then edit DATABASE_URL to port 54329 + dev creds
pnpm install
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
pnpm dev
```

Tests:
- `pnpm test:unit` — fast, no DB
- `pnpm test:int` — Testcontainers-backed; brings up an ephemeral Postgres per suite
- `pnpm test:e2e` — Playwright end-to-end against a `pnpm dev` server (uses `.env`)
