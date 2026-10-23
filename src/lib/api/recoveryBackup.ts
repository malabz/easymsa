import { strFromU8, unzipSync } from "fflate";
import { isValidJobId, validateJobAccess, type JobAccess } from "./tokens";
export type RecoveryEntry = { name: string; access?: JobAccess; duplicate?: boolean };
/** No archive path is used as a filesystem path or a URL. */
export function parseRecoveryBackup(bytes: Uint8Array): RecoveryEntry[] {
  if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("RECOVERY_TOO_LARGE");
  let size = 0, count = 0;
  const entries = unzipSync(bytes, { filter: entry => {
    count++; size += entry.originalSize;
    if (count > 1000 || size > 4 * 1024 * 1024 || entry.originalSize > 128 * 1024) throw new Error("RECOVERY_TOO_LARGE");
    return entry.name.endsWith(".json");
  } });
  const seen = new Set<string>();
  const result = Object.entries(entries).map(([name, content]): RecoveryEntry => {
    try {
      const access = validateJobAccess(JSON.parse(strFromU8(content)));
      if (!access || !isValidJobId(access.jobId)) return { name };
      const key = `${access.jobId}\n${access.token}`;
      const duplicate = seen.has(key); seen.add(key);
      return { name: access.jobId, access, duplicate };
    } catch { return { name }; }
  });
  if (!result.length) throw new Error("RECOVERY_EMPTY");
  return result;
}
