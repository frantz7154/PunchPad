import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { createUser } from "@/features/users/admin-service";
import { adminDeleteSession } from "@/features/attendance/service";
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
});

describe("admin services produce audit rows attributed to the actor", () => {
  it("createUser audit references admin actor", async () => {
    const admin = await db.prisma.user.create({
      data: {
        email: "a@x.com",
        name: "A",
        role: "ADMIN",
        passwordHash: await hash("password1234aa"),
      },
    });
    await createUser({ prisma: db.prisma, clock }, admin.id, {
      email: "n@x.com",
      name: "N",
      initialPassword: "password1234aa",
      role: "EMPLOYEE",
      timezone: "America/Chicago",
    });
    const audit = await db.prisma.auditLog.findFirst({ where: { action: "CREATE_USER" } });
    expect(audit?.actorUserId).toBe(admin.id);
  });

  it("adminDeleteSession audit references admin actor", async () => {
    const admin = await db.prisma.user.create({
      data: {
        email: "a@x.com",
        name: "A",
        role: "ADMIN",
        passwordHash: await hash("password1234aa"),
      },
    });
    const emp = await db.prisma.user.create({
      data: { email: "e@x.com", name: "E", passwordHash: await hash("password1234aa") },
    });
    const s = await db.prisma.timeSession.create({
      data: {
        userId: emp.id,
        clockInAt: new Date("2026-05-10T08:00:00Z"),
        clockOutAt: new Date("2026-05-10T12:00:00Z"),
      },
    });
    await adminDeleteSession({ prisma: db.prisma, clock }, admin.id, s.id, "test");
    const audit = await db.prisma.auditLog.findFirst({ where: { action: "DELETE_SESSION" } });
    expect(audit?.actorUserId).toBe(admin.id);
  });
});
