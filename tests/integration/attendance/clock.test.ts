import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import {
  clockIn,
  clockOut,
  editOwnSession,
  adminEditSession,
  adminDeleteSession,
} from "@/features/attendance/service";
import { FakeClock } from "@/lib/time";
import { hash } from "@node-rs/argon2";

let db: TestDb;
const clock = new FakeClock(new Date("2026-05-12T13:00:00Z"));

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
  clock.setNow(new Date("2026-05-12T13:00:00Z"));
});

async function makeUser(email = "u@x.com", role: "EMPLOYEE" | "ADMIN" = "EMPLOYEE") {
  return db.prisma.user.create({
    data: { email, name: email, role, passwordHash: await hash("password1234aa") },
  });
}

describe("clockIn", () => {
  it("creates a session with clockInAt = clock.now() and an audit row", async () => {
    const u = await makeUser();
    const s = await clockIn({ prisma: db.prisma, clock }, u.id);
    expect(s.clockInAt.toISOString()).toBe("2026-05-12T13:00:00.000Z");
    expect(s.clockOutAt).toBeNull();
    const audits = await db.prisma.auditLog.findMany({ where: { targetSessionId: s.id } });
    expect(audits).toHaveLength(1);
    expect(audits[0]!.action).toBe("CLOCK_IN");
    expect(audits[0]!.actorUserId).toBe(u.id);
  });

  it("refuses double clock-in with ALREADY_CLOCKED_IN", async () => {
    const u = await makeUser();
    await clockIn({ prisma: db.prisma, clock }, u.id);
    await expect(clockIn({ prisma: db.prisma, clock }, u.id)).rejects.toMatchObject({
      code: "ALREADY_CLOCKED_IN",
    });
  });

  it("refuses when user is deactivated", async () => {
    const u = await makeUser();
    await db.prisma.user.update({ where: { id: u.id }, data: { deactivatedAt: new Date() } });
    await expect(clockIn({ prisma: db.prisma, clock }, u.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("clockOut", () => {
  it("closes the open session and writes CLOCK_OUT audit", async () => {
    const u = await makeUser();
    await clockIn({ prisma: db.prisma, clock }, u.id);
    clock.advanceMinutes(90);
    const s = await clockOut({ prisma: db.prisma, clock }, u.id);
    expect(s.clockOutAt?.toISOString()).toBe("2026-05-12T14:30:00.000Z");
    const audits = await db.prisma.auditLog.findMany({
      where: { targetSessionId: s.id },
      orderBy: { at: "asc" },
    });
    expect(audits.map((a) => a.action)).toEqual(["CLOCK_IN", "CLOCK_OUT"]);
  });

  it("rejects when not clocked in (NOT_FOUND)", async () => {
    const u = await makeUser();
    await expect(clockOut({ prisma: db.prisma, clock }, u.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("editOwnSession", () => {
  it("adjusts times within 7-day window with audit", async () => {
    const u = await makeUser();
    const s = await db.prisma.timeSession.create({
      data: {
        userId: u.id,
        clockInAt: new Date("2026-05-12T08:00:00Z"),
        clockOutAt: new Date("2026-05-12T12:00:00Z"),
      },
    });
    const updated = await editOwnSession({ prisma: db.prisma, clock }, u.id, s.id, {
      clockInAt: new Date("2026-05-12T08:15:00Z"),
      reason: "forgot to clock in",
    });
    expect(updated.clockInAt.toISOString()).toBe("2026-05-12T08:15:00.000Z");
    const audit = await db.prisma.auditLog.findFirst({
      where: { targetSessionId: s.id, action: "EDIT_SESSION" },
    });
    expect(audit?.reason).toBe("forgot to clock in");
    expect(audit?.before).toBeTruthy();
    expect(audit?.after).toBeTruthy();
  });

  it("rejects edit outside 7-day window", async () => {
    const u = await makeUser();
    const s = await db.prisma.timeSession.create({
      data: {
        userId: u.id,
        clockInAt: new Date("2026-05-01T08:00:00Z"),
        clockOutAt: new Date("2026-05-01T12:00:00Z"),
      },
    });
    await expect(
      editOwnSession({ prisma: db.prisma, clock }, u.id, s.id, {
        clockInAt: new Date("2026-05-01T08:30:00Z"),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects editing another user's session", async () => {
    const u1 = await makeUser("u1@x.com");
    const u2 = await makeUser("u2@x.com");
    const s = await db.prisma.timeSession.create({
      data: {
        userId: u2.id,
        clockInAt: new Date("2026-05-12T08:00:00Z"),
        clockOutAt: new Date("2026-05-12T12:00:00Z"),
      },
    });
    await expect(
      editOwnSession({ prisma: db.prisma, clock }, u1.id, s.id, {
        clockInAt: new Date("2026-05-12T08:30:00Z"),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects edit that creates overlap with another own session", async () => {
    const u = await makeUser();
    await db.prisma.timeSession.create({
      data: {
        userId: u.id,
        clockInAt: new Date("2026-05-12T08:00:00Z"),
        clockOutAt: new Date("2026-05-12T10:00:00Z"),
      },
    });
    const s2 = await db.prisma.timeSession.create({
      data: {
        userId: u.id,
        clockInAt: new Date("2026-05-12T11:00:00Z"),
        clockOutAt: new Date("2026-05-12T12:00:00Z"),
      },
    });
    await expect(
      editOwnSession({ prisma: db.prisma, clock }, u.id, s2.id, {
        clockInAt: new Date("2026-05-12T09:30:00Z"),
      }),
    ).rejects.toMatchObject({ code: "OVERLAP" });
  });

  it("rejects times in the future", async () => {
    const u = await makeUser();
    const s = await db.prisma.timeSession.create({
      data: {
        userId: u.id,
        clockInAt: new Date("2026-05-12T08:00:00Z"),
        clockOutAt: new Date("2026-05-12T12:00:00Z"),
      },
    });
    await expect(
      editOwnSession({ prisma: db.prisma, clock }, u.id, s.id, {
        clockOutAt: new Date("2026-06-01T00:00:00Z"),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("admin mutations", () => {
  it("admin can edit a session older than 7 days", async () => {
    const admin = await makeUser("a@x.com", "ADMIN");
    const emp = await makeUser("e@x.com");
    const s = await db.prisma.timeSession.create({
      data: {
        userId: emp.id,
        clockInAt: new Date("2026-04-01T08:00:00Z"),
        clockOutAt: new Date("2026-04-01T12:00:00Z"),
      },
    });
    const updated = await adminEditSession({ prisma: db.prisma, clock }, admin.id, s.id, {
      clockInAt: new Date("2026-04-01T08:15:00Z"),
      reason: "payroll fix",
    });
    expect(updated.clockInAt.toISOString()).toBe("2026-04-01T08:15:00.000Z");
  });

  it("adminDeleteSession soft-deletes and writes DELETE_SESSION", async () => {
    const admin = await makeUser("a@x.com", "ADMIN");
    const emp = await makeUser("e@x.com");
    const s = await db.prisma.timeSession.create({
      data: {
        userId: emp.id,
        clockInAt: new Date("2026-05-10T08:00:00Z"),
        clockOutAt: new Date("2026-05-10T12:00:00Z"),
      },
    });
    await adminDeleteSession(
      { prisma: db.prisma, clock },
      admin.id,
      s.id,
      "duplicate entry",
    );
    const fresh = await db.prisma.timeSession.findUnique({ where: { id: s.id } });
    expect(fresh?.deletedAt).not.toBeNull();
    const audit = await db.prisma.auditLog.findFirst({
      where: { targetSessionId: s.id, action: "DELETE_SESSION" },
    });
    expect(audit?.reason).toBe("duplicate entry");
  });
});
