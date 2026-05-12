import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import {
  createUser,
  resetPassword,
  deactivateUser,
  changeRole,
} from "@/features/users/admin-service";
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
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
});

describe("admin user service", () => {
  it("createUser persists user with mustChangePassword=true and writes CREATE_USER audit", async () => {
    const admin = await db.prisma.user.create({
      data: {
        email: "a@x.com",
        name: "A",
        role: "ADMIN",
        passwordHash: await hash("password1234aa"),
      },
    });
    const u = await createUser({ prisma: db.prisma, clock }, admin.id, {
      email: "new@x.com",
      name: "New",
      initialPassword: "password1234aa",
      role: "EMPLOYEE",
      timezone: "America/Chicago",
    });
    expect(u.mustChangePassword).toBe(true);
    const audit = await db.prisma.auditLog.findFirst({
      where: { actorUserId: admin.id, action: "CREATE_USER" },
    });
    expect(audit).toBeTruthy();
  });

  it("createUser rejects duplicate email with VALIDATION", async () => {
    const admin = await db.prisma.user.create({
      data: {
        email: "a@x.com",
        name: "A",
        role: "ADMIN",
        passwordHash: await hash("password1234aa"),
      },
    });
    await db.prisma.user.create({
      data: { email: "dup@x.com", name: "Dup", passwordHash: await hash("password1234aa") },
    });
    await expect(
      createUser({ prisma: db.prisma, clock }, admin.id, {
        email: "dup@x.com",
        name: "X",
        initialPassword: "password1234aa",
        role: "EMPLOYEE",
        timezone: "America/Chicago",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("resetPassword sets mustChangePassword=true", async () => {
    const admin = await db.prisma.user.create({
      data: {
        email: "a@x.com",
        name: "A",
        role: "ADMIN",
        passwordHash: await hash("password1234aa"),
      },
    });
    const e = await db.prisma.user.create({
      data: { email: "e@x.com", name: "E", passwordHash: await hash("password1234aa") },
    });
    await resetPassword({ prisma: db.prisma, clock }, admin.id, e.id, "newpassword1234");
    const fresh = await db.prisma.user.findUniqueOrThrow({ where: { id: e.id } });
    expect(fresh.mustChangePassword).toBe(true);
  });

  it("deactivateUser sets deactivatedAt and writes audit", async () => {
    const admin = await db.prisma.user.create({
      data: {
        email: "a@x.com",
        name: "A",
        role: "ADMIN",
        passwordHash: await hash("password1234aa"),
      },
    });
    const e = await db.prisma.user.create({
      data: { email: "e@x.com", name: "E", passwordHash: await hash("password1234aa") },
    });
    await deactivateUser({ prisma: db.prisma, clock }, admin.id, e.id);
    const fresh = await db.prisma.user.findUniqueOrThrow({ where: { id: e.id } });
    expect(fresh.deactivatedAt).not.toBeNull();
    const audit = await db.prisma.auditLog.findFirst({ where: { action: "DEACTIVATE_USER" } });
    expect(audit?.actorUserId).toBe(admin.id);
  });

  it("changeRole writes ROLE_CHANGE audit with before/after", async () => {
    const admin = await db.prisma.user.create({
      data: {
        email: "a@x.com",
        name: "A",
        role: "ADMIN",
        passwordHash: await hash("password1234aa"),
      },
    });
    const e = await db.prisma.user.create({
      data: { email: "e@x.com", name: "E", passwordHash: await hash("password1234aa") },
    });
    await changeRole({ prisma: db.prisma, clock }, admin.id, e.id, "ADMIN");
    const audit = await db.prisma.auditLog.findFirst({ where: { action: "ROLE_CHANGE" } });
    expect(audit?.before).toMatchObject({ role: "EMPLOYEE" });
    expect(audit?.after).toMatchObject({ role: "ADMIN" });
  });

  it("refuses to deactivate the system user or the last admin", async () => {
    const admin = await db.prisma.user.create({
      data: {
        email: "a@x.com",
        name: "A",
        role: "ADMIN",
        passwordHash: await hash("password1234aa"),
      },
    });
    await expect(
      deactivateUser({ prisma: db.prisma, clock }, admin.id, "system"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      deactivateUser({ prisma: db.prisma, clock }, admin.id, admin.id),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
