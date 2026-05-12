import { test as setup } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import path from "node:path";
import fs from "node:fs/promises";

const SECRET = process.env.NEXTAUTH_SECRET ?? "dev-secret-32-chars-aaaaaaaaaaaaa";

async function storageStateFor(email: string) {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.$disconnect();
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
