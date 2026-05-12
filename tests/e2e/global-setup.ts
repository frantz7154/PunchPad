import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";
import { hash } from "@node-rs/argon2";

function cuid() {
  // Lightweight stand-in: timestamp + random for E2E seed only.
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL must be set for E2E.");

  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('DELETE FROM "AuditLog"');
    await client.query('DELETE FROM "TimeSession"');
    await client.query('DELETE FROM "LoginAttempt"');
    await client.query('DELETE FROM "DigestSend"');
    await client.query('DELETE FROM "User" WHERE id <> $1', ["system"]);

    await client.query(
      `INSERT INTO "User" (id, email, name, "passwordHash", role, timezone, "mustChangePassword", "deactivatedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'ADMIN', 'America/Chicago', false, now(), now(), now())
       ON CONFLICT (id) DO NOTHING`,
      ["system", "system@punchpad.internal", "System", "!disabled"],
    );

    const adminHash = await hash("password1234aa");
    const empHash = await hash("password1234aa");

    await client.query(
      `INSERT INTO "User" (id, email, name, "passwordHash", role, timezone, "mustChangePassword", "createdAt", "updatedAt")
       VALUES ($1, 'admin@e2e.test', 'E2E Admin', $2, 'ADMIN', 'America/Chicago', false, now(), now())`,
      [cuid(), adminHash],
    );
    await client.query(
      `INSERT INTO "User" (id, email, name, "passwordHash", role, timezone, "mustChangePassword", "createdAt", "updatedAt")
       VALUES ($1, 'emp@e2e.test', 'E2E Employee', $2, 'EMPLOYEE', 'America/Chicago', false, now(), now())`,
      [cuid(), empHash],
    );
  } finally {
    await client.end();
  }
}
