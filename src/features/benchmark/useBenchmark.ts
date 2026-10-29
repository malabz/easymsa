import { useEffect, useState } from "react";
import { parseSnapshot, type BenchmarkSnapshot } from "./model";

export function useBenchmark() {
  const [data, setData] = useState<BenchmarkSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setFailed(false);
    fetch(`${import.meta.env.BASE_URL}benchmark/snapshot.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Benchmark data unavailable"); return response.json(); })
      .then(value => { if (!controller.signal.aborted) setData(parseSnapshot(value)); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [revision]);
  return { data, failed, retry: () => setRevision(value => value + 1) };
}
