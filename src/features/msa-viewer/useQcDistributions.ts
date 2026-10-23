import { useEffect, useState } from "react";
import type { RowQcStats } from "./types";
import type { QcDistribution } from "./qcDistributions";

const cache = new WeakMap<RowQcStats[], QcDistribution[]>();
/** Metadata only: this worker never receives alignment sequences. */
export function useQcDistributions(rows: RowQcStats[], enabled: boolean) {
  const [state, setState] = useState<{ rows: RowQcStats[]; result?: QcDistribution[]; error?: boolean }>();
  const [attempt, retry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const result = cache.get(rows);
    if (result) { setState({ rows, result }); return; }
    setState({ rows });
    let worker: Worker;
    try { worker = new Worker(new URL("./qcDistributions.worker.ts", import.meta.url), { type: "module" }); }
    catch { setState({ rows, error: true }); return; }
    worker.onmessage = event => {
      if (event.data.result) cache.set(rows, event.data.result);
      setState({ rows, ...event.data }); worker.terminate();
    };
    worker.onerror = () => { setState({ rows, error: true }); worker.terminate(); };
    worker.postMessage(rows);
    return () => worker.terminate();
  }, [rows, enabled, attempt]);
  return { result: state?.rows === rows ? state.result : undefined, error: state?.rows === rows && state.error, retry: () => retry(n => n + 1) };
}
