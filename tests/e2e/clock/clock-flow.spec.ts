import { test, expect } from "@playwright/test";

test("clock in then clock out, recent list reflects it", async ({ page }) => {
  await page.goto("/clock");
  await expect(page.getByTestId("clock-in-button")).toBeVisible();
  await page.getByTestId("clock-in-button").click();
  await expect(page.getByTestId("clock-out-button")).toBeVisible();
  await expect(page.getByTestId("clock-counter")).toBeVisible();
  await expect(page.getByTestId("clock-started-at")).toBeVisible();

  await page.getByTestId("clock-out-button").click();
  await expect(page.getByTestId("clock-in-button")).toBeVisible();
  await expect(page.getByTestId("recent-list")).toBeVisible();
});
