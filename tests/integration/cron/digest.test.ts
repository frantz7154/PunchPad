import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { runWeeklyDigest } from "@/features/cron/digest-service";
import { FakeClock } from "@/lib/time";
import { hash } from "@node-rs/argon2";

let db: TestDb;
// 2026-05-11 07:00 America/Chicago = 12:00 UTC (CDT, UTC-5)
const clock = new FakeClock(new Date("2026-05-11T12:00:00Z"));

beforeAll(async () => {
  db = await setupTestDb();
}, 120_000);
afterAll(async () => {
  await db.stop();
});
beforeEach(async () => {
  await db.prisma.digestSend.deleteMany();
  await db.prisma.timeSession.deleteMany();
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
});

describe("weekly digest", () => {
  it("sends to employees in their local 07:00 window and is idempotent on second call", async () => {
    const u = await db.prisma.user.create({
      data: {
        email: "u@x.com",
        name: "U",
        passwordHash: await hash("password1234aa"),
        timezone: "America/Chicago",
      },
    });
    await db.prisma.timeSession.createMany({
      data: [
        {
          userId: u.id,
          clockInAt: new Date("2026-05-04T13:00:00Z"),
          clockOutAt: new Date("2026-05-04T22:00:00Z"),
        },
        {
          userId: u.id,
          clockInAt: new Date("2026-05-05T13:00:00Z"),
          clockOutAt: new Date("2026-05-05T21:00:00Z"),
        },
      ],
    });
    const send = vi.fn();
    const r1 = await runWeeklyDigest({
      prisma: db.prisma,
      clock,
      sendHourLocal: 7,
      send,
    });
    expect(r1.sent).toBe(1);
    const r2 = await runWeeklyDigest({
      prisma: db.prisma,
      clock,
      sendHourLocal: 7,
      send,
    });
    expect(r2.sent).toBe(0);
  });
});
