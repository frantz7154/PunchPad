import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { recordAttempt, isLockedOut } from "@/features/auth/lockout";
import { FakeClock } from "@/lib/time";

let db: TestDb;
const clock = new FakeClock(new Date("2026-05-12T10:00:00Z"));

beforeAll(async () => {
  db = await setupTestDb();
}, 120_000);
afterAll(async () => {
  await db.stop();
});
beforeEach(async () => {
  await db.prisma.loginAttempt.deleteMany();
  clock.setNow(new Date("2026-05-12T10:00:00Z"));
});

describe("lockout", () => {
  it("allows login when no attempts logged", async () => {
    expect(await isLockedOut(db.prisma, "a@b.com", clock)).toBe(false);
  });

  it("locks out after 5 failures in a 15-minute window", async () => {
    for (let i = 0; i < 5; i++) {
      await recordAttempt(db.prisma, "a@b.com", false, clock);
      clock.advanceSeconds(30);
    }
    expect(await isLockedOut(db.prisma, "a@b.com", clock)).toBe(true);
  });

  it("does not lock out after fewer than 5 failures", async () => {
    for (let i = 0; i < 4; i++) {
      await recordAttempt(db.prisma, "a@b.com", false, clock);
      clock.advanceSeconds(30);
    }
    expect(await isLockedOut(db.prisma, "a@b.com", clock)).toBe(false);
  });

  it("expires lock 15 minutes after the 5th failure", async () => {
    for (let i = 0; i < 5; i++) {
      await recordAttempt(db.prisma, "a@b.com", false, clock);
      clock.advanceSeconds(10);
    }
    expect(await isLockedOut(db.prisma, "a@b.com", clock)).toBe(true);
    clock.advanceMinutes(16);
    expect(await isLockedOut(db.prisma, "a@b.com", clock)).toBe(false);
  });

  it("success resets the counter", async () => {
    for (let i = 0; i < 4; i++) await recordAttempt(db.prisma, "a@b.com", false, clock);
    await recordAttempt(db.prisma, "a@b.com", true, clock);
    for (let i = 0; i < 4; i++) await recordAttempt(db.prisma, "a@b.com", false, clock);
    expect(await isLockedOut(db.prisma, "a@b.com", clock)).toBe(false);
  });
});
