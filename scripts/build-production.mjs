import { spawnSync } from "node:child_process";
if (process.versions.node.split(".").map(Number)[0] !== 24 || Number(process.versions.node.split(".")[1]) < 21) {
  throw new Error("Use Node.js 24.21.0 or newer within Node 24.");
}
const env = { ...process.env, EASYMSA_BASE_PATH: "/", VITE_API_BASE_URL: "https://api.easymsa.cn/api" };
for (const args of [["node_modules/typescript/bin/tsc", "-b"], ["node_modules/vite/bin/vite.js", "build"]]) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
