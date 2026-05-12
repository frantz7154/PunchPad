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
