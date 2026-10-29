import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const env = {...process.env, EASYMSA_BASE_PATH: "/", VITE_API_BASE_URL: "/api"};
for (const args of [["node_modules/typescript/bin/tsc", "-b"], ["node_modules/vite/bin/vite.js", "build"]]) {
  const result = spawnSync(process.execPath, args, {cwd, env, stdio:"inherit"});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
