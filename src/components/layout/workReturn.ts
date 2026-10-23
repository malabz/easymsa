type ReturnEntry = { kind: "submit" | "realign" | "result" | "viewer" | "job" | "example"; path: string };

/** A result belongs to its own job, never whichever job was visited most recently. */
export function workspaceReturn(pathname: string, search: string, entries: ReturnEntry[]) {
  const result = /^\/results\/([^/]+)$/.exec(pathname);
  if (result) {
    const jobPath = `/job/${result[1]}`;
    const token = new URLSearchParams(search).get("token");
    // Never borrow another credential for a same-named task.
    const remembered = entries.find(entry => entry.kind === "job" && entry.path.split("?")[0] === jobPath
      && new URLSearchParams(entry.path.split("?")[1]).get("token") === token);
    const params = new URLSearchParams();
    if (token) params.set("token", token);
    return { path: remembered?.path ?? `${jobPath}${params.size ? `?${params}` : ""}`, label: "job" as const };
  }
  if (/^\/examples\/.+/.test(pathname)) return { path: "/examples", label: "examplesBack" as const };
  return { path: "/lookup", label: "jobs" as const };
}

export function continuationEntry(pathname: string, entries: ReturnEntry[]) {
  return entries.find(entry => entry.path.split("?")[0] !== pathname);
}
