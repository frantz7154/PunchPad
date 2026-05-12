import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { sessionsInRange, bucketByLocalDay } from "@/features/attendance/calendar-queries";
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

describe("calendar queries", () => {
  it("sessionsInRange returns only sessions intersecting the window for the user", async () => {
    const u = await db.prisma.user.create({
      data: { email: "u@x.com", name: "U", passwordHash: await hash("password1234aa") },
    });
    await db.prisma.timeSession.create({
      data: {
        userId: u.id,
        clockInAt: new Date("2026-05-01T08:00:00Z"),
        clockOutAt: new Date("2026-05-01T12:00:00Z"),
      },
    });
    await db.prisma.timeSession.create({
      data: {
        userId: u.id,
        clockInAt: new Date("2026-05-15T08:00:00Z"),
        clockOutAt: new Date("2026-05-15T12:00:00Z"),
      },
    });
    const rows = await sessionsInRange(
      db.prisma,
      u.id,
      new Date("2026-05-10T00:00:00Z"),
      new Date("2026-05-20T00:00:00Z"),
    );
    expect(rows).toHaveLength(1);
  });

  it("bucketByLocalDay groups by user TZ", () => {
    const sessions = [
      {
        id: "a",
        clockInAt: new Date("2026-05-12T05:30:00Z"),
        clockOutAt: new Date("2026-05-12T07:30:00Z"),
      },
      {
        id: "b",
        clockInAt: new Date("2026-05-12T13:00:00Z"),
        clockOutAt: new Date("2026-05-12T17:00:00Z"),
      },
    ];
    const buckets = bucketByLocalDay(sessions, "America/Chicago");
    expect(Object.keys(buckets).sort()).toEqual(["2026-05-12"]);
    expect(buckets["2026-05-12"]).toHaveLength(2);
  });
});
