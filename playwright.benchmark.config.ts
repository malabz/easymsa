import { defineConfig, devices } from "@playwright/test";

const port = process.env.EASYMSA_E2E_PORT ?? "5210";
export default defineConfig({
  testDir: "./e2e", fullyParallel: true, workers: 1, timeout: 60_000, retries: 0,
  expect: { timeout: 12_000 },
  outputDir: "test-results/benchmark",
  reporter: [["list"], ["json", {outputFile: "test-results/benchmark-results.json"}]],
  use: {baseURL: `http://127.0.0.1:${port}/`, locale: "en-US", colorScheme: "light", trace: "retain-on-failure", screenshot: "only-on-failure"},
  projects: [
    {name: "benchmark-chromium", testMatch: /benchmark\.spec\.ts/, use: {...devices["Desktop Chrome"], viewport:{width:1280,height:900}}},
    {name: "benchmark-firefox", testMatch: /benchmark\.spec\.ts/, use: {...devices["Desktop Firefox"], viewport:{width:1280,height:900}}},
    {name: "benchmark-webkit", testMatch: /benchmark\.spec\.ts/, use: {...devices["Desktop Safari"], viewport:{width:1280,height:900}}},
    {name: "benchmark-mobile", testMatch: /benchmark\.spec\.ts/, use: {...devices["Pixel 5"], viewport:{width:390,height:844}}},
    {name: "existing-route-regression", testMatch: /(routes\.smoke|nar-readiness)\.spec\.ts/, use: {...devices["Desktop Chrome"], viewport:{width:1280,height:900}}},
  ],
  webServer: {
    command: `"${process.execPath}" node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/`, reuseExistingServer: false,
    env: {EASYMSA_BASE_PATH: "/", VITE_API_BASE_URL: "/api"},
  },
});
