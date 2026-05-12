import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { hash } from "@node-rs/argon2";

export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL must be set for E2E.");
  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });
  try {
    await prisma.auditLog.deleteMany();
    await prisma.timeSession.deleteMany();
    await prisma.loginAttempt.deleteMany();
    await prisma.digestSend.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: "system" } } });
    await prisma.user.upsert({
      where: { id: "system" },
      update: {},
      create: {
        id: "system",
        email: "system@punchpad.internal",
        name: "System",
        passwordHash: "!disabled",
        role: "ADMIN",
        deactivatedAt: new Date(),
      },
    });
    await prisma.user.create({
      data: {
        email: "admin@e2e.test",
        name: "E2E Admin",
        passwordHash: await hash("password1234aa"),
        role: "ADMIN",
        timezone: "America/Chicago",
      },
    });
    await prisma.user.create({
      data: {
        email: "emp@e2e.test",
        name: "E2E Employee",
        passwordHash: await hash("password1234aa"),
        role: "EMPLOYEE",
        timezone: "America/Chicago",
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
