import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { hash } from "@node-rs/argon2";

function cuid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

test("admin-created user with mustChangePassword is forced to change password on first login", async ({
  browser,
}) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`DELETE FROM "User" WHERE email = 'newhire@e2e.test'`);
    const ph = await hash("tempPassword1234");
    await client.query(
      `INSERT INTO "User" (id, email, name, "passwordHash", role, timezone, "mustChangePassword", "createdAt", "updatedAt")
       VALUES ($1, 'newhire@e2e.test', 'New Hire', $2, 'EMPLOYEE', 'America/Chicago', true, now(), now())`,
      [cuid(), ph],
    );
  } finally {
    await client.end();
  }

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/login");
  await page.getByTestId("login-email").fill("newhire@e2e.test");
  await page.getByTestId("login-password").fill("tempPassword1234");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/account/change-password");
  await page.getByTestId("cp-current").fill("tempPassword1234");
  await page.getByTestId("cp-new").fill("newGoodPassword12");
  await page.getByTestId("cp-submit").click();
  await page.waitForURL("**/clock");
  await expect(page.getByTestId("clock-in-button")).toBeVisible();
  await ctx.close();
});

test("admin can open New User dialog and fields are visible", async ({ page }) => {
  await page.goto("/admin/users");
  await page.getByTestId("new-user-button").click();
  await expect(page.getByTestId("new-user-name")).toBeVisible();
  await expect(page.getByTestId("new-user-email")).toBeVisible();
});
