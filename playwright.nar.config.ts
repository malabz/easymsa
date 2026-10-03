import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: /(nar-readiness|viewer\.core)\.spec\.ts/,
  workers: 2,
  timeout: 90000,
  expect: { timeout: 20000 },
  reporter: [["list"]],
  outputDir: "test-results/nar",
  use: {
    baseURL:
      process.env.EASYMSA_TEST_BASE_URL || "http://127.0.0.1:5173/easymsa/",
    locale: "en-US",
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        launchOptions: process.env.EASYMSA_WEBKIT_EXECUTABLE
          ? { executablePath: process.env.EASYMSA_WEBKIT_EXECUTABLE }
          : undefined,
      },
    },
  ],
});
