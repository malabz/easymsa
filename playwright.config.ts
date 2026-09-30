import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 2,
  timeout: 60_000,
  expect: {
    timeout: 12_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.002,
      scale: "css"
    }
  },
  outputDir: "test-results",
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173/easymsa/",
    colorScheme: "light",
    locale: "en-US",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "routes-chromium",
      testMatch: /routes\.smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 }
      }
    },
    {
      name: "routes-firefox",
      testMatch: /routes\.smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 800 }
      }
    },
    {
      name: "routes-webkit",
      testMatch: /routes\.smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1280, height: 800 }
      }
    },
    {
      name: "core-chromium",
      testMatch: /viewer\.core\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 }
      }
    },
    {
      name: "core-firefox",
      testMatch: /viewer\.core\.spec\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 800 }
      }
    },
    {
      name: "core-webkit",
      testMatch: /viewer\.core\.spec\.ts/,
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1280, height: 800 }
      }
    },
    {
      name: "layout-360",
      testMatch: /viewer\.(layout|visual)\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 360, height: 800 }
      }
    },
    {
      name: "layout-390",
      testMatch: /viewer\.(layout|visual)\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 }
      }
    },
    {
      name: "layout-768",
      testMatch: /viewer\.(layout|visual)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        hasTouch: true,
        isMobile: true,
        viewport: { width: 768, height: 1024 }
      }
    },
    {
      name: "layout-1280",
      testMatch: /viewer\.(layout|visual)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 }
      }
    },
    {
      name: "layout-1920",
      testMatch: /viewer\.(layout|visual)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: "mobile-chrome",
      testMatch: /viewer\.(mobile|touch)\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 }
      }
    },
    {
      name: "mobile-safari",
      testMatch: /viewer\.(mobile|touch)\.spec\.ts/,
      use: { ...devices["iPhone 13"] }
    },
    {
      name: "a11y-chromium",
      testMatch: /viewer\.a11y\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 }
      }
    }
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:4173/easymsa/"
  }
});
