export const TASK_STORAGE_KEYS = [
  "easymsa.jobAccess.v1",
  "easymsa.jobTokens",
] as const;
export const VIEWER_STORAGE_KEYS = [
  "easymsa.viewer.workspaces.v1",
  "easymsa.viewer.preferences.v2",
  "easymsa.viewer.references.v1",
] as const;
export function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
export function clearOwnStorage(keys: readonly string[]): boolean {
  try {
    const storage = browserStorage();
    if (!storage) return false;
    keys.forEach((key) => storage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}
export function reportStorageFailure() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("easymsa-storage-unavailable"));
}
