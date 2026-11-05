import {defineConfig} from "@playwright/test";
const port=process.env.EASYMSA_FEEDBACK_PORT??"5275";
export default defineConfig({
  testDir:"./e2e",testMatch:/feedback\.spec\.ts/,fullyParallel:true,workers:3,timeout:60_000,retries:0,
  expect:{timeout:12_000},outputDir:"test-results/feedback",
  reporter:[["list"],["json",{outputFile:"test-results/feedback-results.json"}]],
  use:{baseURL:`http://127.0.0.1:${port}/`,locale:"en-US",colorScheme:"light",trace:"retain-on-failure",screenshot:"only-on-failure"},
  projects:(["chromium","firefox","webkit"] as const).flatMap(browserName=>[390,768,1440].map(width=>({name:`${browserName}-${width}`,use:{browserName,viewport:{width,height:width===390?844:1000}}}))),
  webServer:{command:`"${process.execPath}" node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${port} --strictPort`,url:`http://127.0.0.1:${port}/`,reuseExistingServer:false,env:{EASYMSA_BASE_PATH:"/",VITE_API_BASE_URL:"/api"}}
});
