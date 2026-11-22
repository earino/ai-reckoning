import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:4173/ai-reckoning/";
const gl = { launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] } };
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [["list"], ["json", { outputFile: "test-results/e2e-results.json" }]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, ...gl } },
    { name: "mobile", use: { ...devices["Pixel 7"], ...gl } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run preview", url: baseURL, reuseExistingServer: true, timeout: 60_000 },
});
