import { test, expect } from "@playwright/test";

test("theme toggle updates localStorage and pre-paint script restores it on reload", async ({
  page,
}) => {
  // Clear any prior persisted mode.
  await page.goto("/clock");
  await page.evaluate(() => localStorage.removeItem("punchpad-theme"));

  // Force a deterministic stored mode and reload so the pre-paint script reads it.
  await page.evaluate(() => localStorage.setItem("punchpad-theme", "light"));
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");

  await page.evaluate(() => localStorage.setItem("punchpad-theme", "dark"));
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");

  // Toggle click writes to localStorage (one click from "dark" should land on "system").
  await page.getByTestId("theme-toggle").click();
  await page.waitForFunction(() => localStorage.getItem("punchpad-theme") !== "dark");
  expect(await page.evaluate(() => localStorage.getItem("punchpad-theme"))).toBe("system");
});
