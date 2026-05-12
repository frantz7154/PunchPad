import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium-admin",
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/storage/admin.json" },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts$/,
    },
    {
      name: "chromium-emp",
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/storage/emp.json" },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts$/,
    },
    {
      name: "chromium-public",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /auth\.setup\.ts$/,
    },
  ],
  webServer: process.env.PLAYWRIGHT_NO_WEBSERVER
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
