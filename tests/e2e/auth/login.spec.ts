import { test, expect } from "@playwright/test";

test.describe("login", () => {
  test("successful login redirects to /clock", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("emp@e2e.test");
    await page.getByTestId("login-password").fill("password1234aa");
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/clock");
    await expect(page).toHaveURL(/\/clock$/);
  });

  test("wrong password shows error and stays on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("emp@e2e.test");
    await page.getByTestId("login-password").fill("wrongwrongwrong");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("5 failures triggers lockout (6th attempt is also rejected even with right password)", async ({
    page,
  }) => {
    for (let i = 0; i < 5; i++) {
      await page.goto("/login");
      await page.getByTestId("login-email").fill("emp@e2e.test");
      await page.getByTestId("login-password").fill("wrongwrongwrong");
      await page.getByTestId("login-submit").click();
      await expect(page.getByTestId("login-error")).toBeVisible();
    }
    await page.goto("/login");
    await page.getByTestId("login-email").fill("emp@e2e.test");
    await page.getByTestId("login-password").fill("password1234aa");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toBeVisible();
  });
});
