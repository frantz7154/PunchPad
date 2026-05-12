import { test, expect } from "@playwright/test";
import { Client } from "pg";

function cuid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

test("POST /api/cron/watchdog requires secret", async ({ request }) => {
  const res = await request.post("/api/cron/watchdog");
  expect(res.status()).toBe(401);
});

test("watchdog auto-closes a long-open session via direct POST", async ({ request }) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let empId: string;
  try {
    const r = await client.query(
      `SELECT id FROM "User" WHERE email = 'emp@e2e.test' LIMIT 1`,
    );
    empId = r.rows[0].id as string;
    await client.query(`DELETE FROM "TimeSession" WHERE "userId" = $1`, [empId]);
    const inAt = new Date(Date.now() - 19 * 3_600_000);
    await client.query(
      `INSERT INTO "TimeSession" (id, "userId", "clockInAt", "autoClosed", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, false, now(), now())`,
      [cuid(), empId, inAt],
    );
  } finally {
    await client.end();
  }

  const secret = process.env.CRON_SECRET ?? "dev-cron-secret-32-chars-aaaaaaaa";
  const res = await request.post("/api/cron/watchdog", {
    headers: { "x-cron-secret": secret },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.closed).toBeGreaterThanOrEqual(1);
});
