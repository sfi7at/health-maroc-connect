import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression config for HealthLink Maroc.
 * Assumes the dev server is already running at http://localhost:8080
 * (the sandbox does this automatically). Locally, run `bun run dev` first.
 */
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  reporter: [["list"]],
  timeout: 60_000,
  expect: {
    // Typography drift is subtle — keep the tolerance tight but not brittle.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
});