import { test, expect } from "@playwright/test";

test("admin downloads CSV with expected header", async ({ page }) => {
  await page.goto("/reports?range=thisWeek");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("csv-download").click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  const fs = await import("node:fs/promises");
  const head = (await fs.readFile(path!, "utf-8")).split("\r\n")[0];
  expect(head).toBe(
    "user_email,user_name,date_local,session_id,clock_in_local,clock_out_local,duration_minutes,auto_closed,edited,notes,clock_in_utc,clock_out_utc",
  );
});
