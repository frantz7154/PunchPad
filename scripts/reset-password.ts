// Admin password reset / admin creation utility for PunchPad.
//
// Usage:
//   pnpm exec tsx scripts/reset-password.ts <email> <password>
//     - Resets the password for an existing user. Errors if user not found.
//
//   pnpm exec tsx scripts/reset-password.ts <email> <password> --create-admin --name "Full Name"
//     - Upsert: creates the user with ADMIN role if missing, otherwise resets password.
//
// Always clears mustChangePassword, reactivates the account if deactivated,
// and clears prior login attempts so the lockout counter resets.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import { hash } from "@node-rs/argon2";

const ARGON_OPTS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
const MIN_PASSWORD_LENGTH = 12;

function getFlag(name: string): string | null {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx < 0) return null;
  return process.argv[idx + 1] ?? "";
}

async function main() {
  const [email, newPassword] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const createAdmin = process.argv.includes("--create-admin");
  const name = getFlag("name");

  if (!email || !newPassword) {
    console.error(
      "Usage: pnpm exec tsx scripts/reset-password.ts <email> <password> [--create-admin --name \"Full Name\"]",
    );
    process.exit(1);
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }
  if (createAdmin && !name) {
    console.error("--create-admin requires --name \"Full Name\".");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await hash(newPassword, ARGON_OPTS);

    let user;
    if (createAdmin) {
      user = await prisma.user.upsert({
        where: { email },
        create: {
          email,
          name: name!,
          role: Role.ADMIN,
          passwordHash,
          timezone: "America/Chicago",
          mustChangePassword: false,
        },
        update: {
          passwordHash,
          mustChangePassword: false,
          deactivatedAt: null,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          mustChangePassword: false,
          deactivatedAt: null,
        },
      });
    }

    const cleared = await prisma.loginAttempt.deleteMany({ where: { email } });

    console.log(`User: ${user.email} (id: ${user.id}, role: ${user.role}).`);
    console.log(`Cleared ${cleared.count} prior login attempt(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
