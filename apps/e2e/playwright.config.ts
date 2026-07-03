import { defineConfig, devices } from "@playwright/test";

const WEB_URL = "http://localhost:3000";
const API_URL = "http://localhost:4000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // shared local SQL Server instance — keep runs predictable, not racy
  workers: 1, // fullyParallel only serializes within a file; this serializes across files too
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Starts both dev servers if they're not already running (reuseExistingServer
  // means `pnpm dev` at the repo root, or servers you started by hand, are used
  // as-is instead of double-starting). In CI, always starts fresh.
  webServer: [
    {
      command: "pnpm --filter @algowix/server dev",
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      // Relaxes the auth rate limiter (see middleware/rateLimiter.ts) — this suite
      // registers/logs in a fresh user per test. Only applies when Playwright
      // spawns the server itself; a manually-started server keeps its own env.
      env: { NODE_ENV: "test" },
    },
    {
      command: "pnpm --filter @algowix/web dev",
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
