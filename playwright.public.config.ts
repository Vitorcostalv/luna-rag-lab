import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/public",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: process.env.PUBLIC_TEST_URL || "http://localhost:3101",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: process.env.PUBLIC_TEST_URL
    ? undefined
    : {
        command: "pnpm dev --port 3101",
        url: "http://localhost:3101",
        reuseExistingServer: false,
        timeout: 120000,
        env: {
          LAB_MODE: "snapshot",
          PUBLIC_DEMO_MODE: "true",
          AI_PROVIDER: "mock",
        },
      },
});
