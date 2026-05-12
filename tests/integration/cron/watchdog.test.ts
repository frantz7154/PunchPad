import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { runWatchdog } from "@/features/cron/watchdog-service";
import { FakeClock } from "@/lib/time";
import { hash } from "@node-rs/argon2";

let db: TestDb;
const clock = new FakeClock(new Date("2026-05-12T00:00:00Z"));

beforeAll(async () => {
  db = await setupTestDb();
}, 120_000);
afterAll(async () => {
  await db.stop();
});
beforeEach(async () => {
  await db.prisma.auditLog.deleteMany();
  await db.prisma.timeSession.deleteMany();
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
  await db.prisma.user.upsert({
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
  clock.setNow(new Date("2026-05-12T00:00:00Z"));
});

describe("watchdog", () => {
  it("warns at 12h+ and is idempotent", async () => {
    const u = await db.prisma.user.create({
      data: { email: "u@x.com", name: "U", passwordHash: await hash("password1234aa") },
    });
    await db.prisma.timeSession.create({
      data: { userId: u.id, clockInAt: new Date("2026-05-11T11:00:00Z") },
    });
    clock.setNow(new Date("2026-05-12T00:00:00Z")); // 13h in
    const send = vi.fn();
    const r1 = await runWatchdog({
      prisma: db.prisma,
      clock,
      warnHours: 12,
      closeHours: 18,
      notify: send,
      systemUserId: "system",
    });
    expect(r1.warned).toBe(1);
    expect(r1.closed).toBe(0);
    const r2 = await runWatchdog({
      prisma: db.prisma,
      clock,
      warnHours: 12,
      closeHours: 18,
      notify: send,
      systemUserId: "system",
    });
    expect(r2.warned).toBe(0);
  });

  it("auto-closes at 18h+ at clockInAt + 18h and writes AUTO_CLOSE audit attributed to system", async () => {
    const u = await db.prisma.user.create({
      data: { email: "u@x.com", name: "U", passwordHash: await hash("password1234aa") },
    });
    await db.prisma.timeSession.create({
      data: { userId: u.id, clockInAt: new Date("2026-05-11T05:00:00Z") },
    });
    clock.setNow(new Date("2026-05-12T00:00:00Z")); // 19h in
    const send = vi.fn();
    const r = await runWatchdog({
      prisma: db.prisma,
      clock,
      warnHours: 12,
      closeHours: 18,
      notify: send,
      systemUserId: "system",
    });
    expect(r.closed).toBe(1);
    const fresh = await db.prisma.timeSession.findFirstOrThrow({ where: { userId: u.id } });
    expect(fresh.clockOutAt?.toISOString()).toBe("2026-05-11T23:00:00.000Z");
    expect(fresh.autoClosed).toBe(true);
    const audit = await db.prisma.auditLog.findFirst({ where: { action: "AUTO_CLOSE" } });
    expect(audit?.actorUserId).toBe("system");
  });
});
