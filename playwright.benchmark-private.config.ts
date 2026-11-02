import {defineConfig,devices} from "@playwright/test";
const external=process.env.EASYMSA_PRIVATE_PREVIEW_URL;
const port=process.env.EASYMSA_PRIVATE_PREVIEW_PORT??"5219";
export default defineConfig({
  testDir:"./e2e",testMatch:/benchmark-private\.spec\.ts/,workers:1,fullyParallel:false,timeout:60_000,retries:0,
  outputDir:"test-results/benchmark-private",reporter:[["list"],["json",{outputFile:"test-results/benchmark-private-results.json"}]],
  use:{baseURL:external??`http://127.0.0.1:${port}/`,locale:"en-US",trace:"retain-on-failure",screenshot:"only-on-failure"},
  projects:[{name:"private-desktop",use:{...devices["Desktop Chrome"],viewport:{width:1440,height:1000}}},{name:"private-mobile",use:{...devices["Pixel 5"],viewport:{width:390,height:844}}}],
  ...(external?{}:{webServer:{command:`"${process.execPath}" node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${port} --strictPort`,url:`http://127.0.0.1:${port}/`,reuseExistingServer:false,env:{EASYMSA_BASE_PATH:"/"}}})
});
