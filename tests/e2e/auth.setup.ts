import "dotenv/config";
import { test as setup } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { Client } from "pg";
import path from "node:path";
import fs from "node:fs/promises";

const SECRET = process.env.NEXTAUTH_SECRET ?? "dev-secret-32-chars-aaaaaaaaaaaaa";

async function fetchUser(email: string) {
  const client = new Client({ connectionString: process.env.DATABASE_URL! });
  await client.connect();
  try {
    const r = await client.query(
      `SELECT id, email, name, role, timezone, "mustChangePassword"
       FROM "User" WHERE email = $1`,
      [email],
    );
    if (r.rows.length === 0) throw new Error(`No user with email ${email}`);
    return r.rows[0] as {
      id: string;
      email: string;
      name: string;
      role: "EMPLOYEE" | "ADMIN";
      timezone: string;
      mustChangePassword: boolean;
    };
  } finally {
    await client.end();
  }
}

async function storageStateFor(email: string) {
  const user = await fetchUser(email);
  const token = await encode({
    salt: "authjs.session-token",
    secret: SECRET,
    token: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      timezone: user.timezone,
      mustChangePassword: user.mustChangePassword,
      sub: user.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
    },
  });
  return {
    cookies: [
      {
        name: "authjs.session-token",
        value: token,
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
}

setup("authenticate admin", async () => {
  const state = await storageStateFor("admin@e2e.test");
  await fs.mkdir(path.join("tests/e2e/storage"), { recursive: true });
  await fs.writeFile(path.join("tests/e2e/storage/admin.json"), JSON.stringify(state, null, 2));
});

setup("authenticate employee", async () => {
  const state = await storageStateFor("emp@e2e.test");
  await fs.mkdir(path.join("tests/e2e/storage"), { recursive: true });
  await fs.writeFile(path.join("tests/e2e/storage/emp.json"), JSON.stringify(state, null, 2));
});
