import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { reportForRange } from "@/features/reports/service";
import { hash } from "@node-rs/argon2";

let db: TestDb;
beforeAll(async () => {
  db = await setupTestDb();
}, 120_000);
afterAll(async () => {
  await db.stop();
});
beforeEach(async () => {
  await db.prisma.timeSession.deleteMany();
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
});

describe("reportForRange", () => {
  it("aggregates per user, per local day", async () => {
    const u = await db.prisma.user.create({
      data: { email: "u@x.com", name: "U", passwordHash: await hash("password1234aa") },
    });
    await db.prisma.timeSession.createMany({
      data: [
        {
          userId: u.id,
          clockInAt: new Date("2026-05-12T13:00:00Z"),
          clockOutAt: new Date("2026-05-12T17:00:00Z"),
        },
        {
          userId: u.id,
          clockInAt: new Date("2026-05-12T18:00:00Z"),
          clockOutAt: new Date("2026-05-12T20:00:00Z"),
        },
        {
          userId: u.id,
          clockInAt: new Date("2026-05-13T13:00:00Z"),
          clockOutAt: new Date("2026-05-13T17:30:00Z"),
        },
      ],
    });
    const rows = await reportForRange(db.prisma, {
      from: new Date("2026-05-12T05:00:00Z"),
      to: new Date("2026-05-13T23:59:59Z"),
      timezone: "America/Chicago",
    });
    expect(rows).toHaveLength(1);
    const r = rows[0]!;
    expect(r.totalMinutes).toBe(6 * 60 + 4 * 60 + 30);
    const byDay = Object.fromEntries(r.days.map((d) => [d.dateLocal, d.minutes]));
    expect(byDay["2026-05-12"]).toBe(360);
    expect(byDay["2026-05-13"]).toBe(270);
  });

  it("filters by userId when provided", async () => {
    const u1 = await db.prisma.user.create({
      data: { email: "u1@x.com", name: "U1", passwordHash: await hash("password1234aa") },
    });
    const u2 = await db.prisma.user.create({
      data: { email: "u2@x.com", name: "U2", passwordHash: await hash("password1234aa") },
    });
    await db.prisma.timeSession.create({
      data: {
        userId: u1.id,
        clockInAt: new Date("2026-05-12T13:00:00Z"),
        clockOutAt: new Date("2026-05-12T17:00:00Z"),
      },
    });
    await db.prisma.timeSession.create({
      data: {
        userId: u2.id,
        clockInAt: new Date("2026-05-12T13:00:00Z"),
        clockOutAt: new Date("2026-05-12T17:00:00Z"),
      },
    });
    const rows = await reportForRange(db.prisma, {
      from: new Date("2026-05-12T00:00:00Z"),
      to: new Date("2026-05-12T23:59:59Z"),
      timezone: "America/Chicago",
      userId: u1.id,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.userId).toBe(u1.id);
  });
});
