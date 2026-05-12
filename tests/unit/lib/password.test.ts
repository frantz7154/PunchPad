import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("hashPassword returns argon2id phc string", async () => {
    const h = await hashPassword("correct horse battery staple");
    expect(h).toMatch(/^\$argon2id\$/);
  });

  it("verifyPassword accepts the right password", async () => {
    const h = await hashPassword("hunter22222222");
    expect(await verifyPassword(h, "hunter22222222")).toBe(true);
  });

  it("verifyPassword rejects the wrong password", async () => {
    const h = await hashPassword("hunter22222222");
    expect(await verifyPassword(h, "wrongpassword!")).toBe(false);
  });

  it("verifyPassword returns false on invalid hash without throwing", async () => {
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false);
  });
});
