import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { execSync } from "node:child_process";

export type TestDb = {
  prisma: PrismaClient;
  container: StartedPostgreSqlContainer;
  url: string;
  stop: () => Promise<void>;
};

export async function setupTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });
  return {
    prisma,
    container,
    url,
    stop: async () => {
      await prisma.$disconnect();
      await container.stop();
    },
  };
}
