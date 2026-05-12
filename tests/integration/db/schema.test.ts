import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hash } from "@node-rs/argon2";
import { setupTestDb, type TestDb } from "../helpers/db";

let db: TestDb;

beforeAll(async () => {
  db = await setupTestDb();
}, 120_000);

afterAll(async () => {
  await db.stop();
});

describe("schema invariants", () => {
  it("partial unique index rejects a second open session for the same user", async () => {
    const user = await db.prisma.user.create({
      data: { email: "u1@x.com", name: "U1", passwordHash: await hash("password1234") },
    });
    await db.prisma.timeSession.create({
      data: { userId: user.id, clockInAt: new Date("2026-05-12T08:00:00Z") },
    });
    await expect(
      db.prisma.timeSession.create({
        data: { userId: user.id, clockInAt: new Date("2026-05-12T09:00:00Z") },
      }),
    ).rejects.toThrow(/[Uu]nique constraint.*userId/s);
  });

  it("partial unique index allows two closed sessions on the same user", async () => {
    const user = await db.prisma.user.create({
      data: { email: "u2@x.com", name: "U2", passwordHash: await hash("password1234") },
    });
    await db.prisma.timeSession.create({
      data: {
        userId: user.id,
        clockInAt: new Date("2026-05-12T08:00:00Z"),
        clockOutAt: new Date("2026-05-12T12:00:00Z"),
      },
    });
    await db.prisma.timeSession.create({
      data: {
        userId: user.id,
        clockInAt: new Date("2026-05-12T13:00:00Z"),
        clockOutAt: new Date("2026-05-12T17:00:00Z"),
      },
    });
    const sessions = await db.prisma.timeSession.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(2);
  });

  it("DigestSend unique constraint blocks duplicate (userId, isoWeek)", async () => {
    const user = await db.prisma.user.create({
      data: { email: "u3@x.com", name: "U3", passwordHash: await hash("password1234") },
    });
    await db.prisma.digestSend.create({ data: { userId: user.id, isoWeek: "2026-W19" } });
    await expect(
      db.prisma.digestSend.create({ data: { userId: user.id, isoWeek: "2026-W19" } }),
    ).rejects.toThrow();
  });
});
