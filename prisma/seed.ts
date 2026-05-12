import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import { hash } from "@node-rs/argon2";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPw = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminEmail || !adminPw) {
    throw new Error("ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD must be set for seed.");
  }

  // System user — reserved id for AUTO_CLOSE audit entries.
  await prisma.user.upsert({
    where: { id: "system" },
    update: {},
    create: {
      id: "system",
      email: "system@punchpad.internal",
      name: "System",
      passwordHash: "!disabled",
      role: Role.ADMIN,
      deactivatedAt: new Date(),
    },
  });

  // Initial admin — skip if any non-system admin already exists.
  const anyAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN, id: { not: "system" }, deactivatedAt: null },
  });
  if (!anyAdmin) {
    const passwordHash = await hash(adminPw);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Initial Admin",
        passwordHash,
        role: Role.ADMIN,
        mustChangePassword: true,
      },
    });
    console.log(`Seeded initial admin: ${adminEmail}`);
  } else {
    console.log("Admin already exists; skipping initial-admin seed.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
