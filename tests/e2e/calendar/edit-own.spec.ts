import { test, expect } from "@playwright/test";
import { Client } from "pg";

test("employee edits own session via day sheet", async ({ page }) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT id FROM "User" WHERE email = 'emp@e2e.test' LIMIT 1`,
    );
    const empId = rows[0].id as string;
    await client.query(`DELETE FROM "TimeSession" WHERE "userId" = $1`, [empId]);

    const now = new Date();
    const inAt = new Date(now.getTime() - 3 * 24 * 3_600_000);
    inAt.setUTCHours(13, 0, 0, 0);
    const outAt = new Date(inAt.getTime() + 4 * 3_600_000);
    await client.query(
      `INSERT INTO "TimeSession" (id, "userId", "clockInAt", "clockOutAt", "autoClosed", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, false, now(), now())`,
      [
        "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12),
        empId,
        inAt,
        outAt,
      ],
    );

    await page.goto("/calendar");
    const isoDay = inAt.toISOString().slice(0, 10);
    await page.getByTestId(`day-${isoDay}`).click();
    await expect(page.getByTestId("day-sheet-list")).toBeVisible();

    const editButton = page.locator('[data-testid^="edit-button-"]').first();
    await editButton.click();
    await page.locator('[data-testid^="edit-reason-"]').fill("forgot to clock in on time");
    await page.locator('[data-testid^="edit-save-"]').click();
    await expect(page.locator('[data-testid^="edit-form-"]')).toHaveCount(0);
  } finally {
    await client.end();
  }
});
