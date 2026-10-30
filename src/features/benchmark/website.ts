import type { BenchmarkSnapshot } from "./model";

/** Website catalog policy. Keep the frozen scientific archive and method IDs intact. */
export function websiteSnapshot(snapshot: BenchmarkSnapshot): BenchmarkSnapshot {
  const methods = snapshot.methods
    .filter(method => method.id !== "halign3" && method.id !== "kalign3")
    .map(method => method.id === "halign4" ? { ...method, name: "HAlign" } : method);
  const visible = new Set(methods.map(method => method.id));
  return {
    ...snapshot,
    methods,
    batches: snapshot.batches.map(batch => ({
      ...batch,
      methods: batch.methods.filter(method => visible.has(method.method_id)),
      results: batch.results.filter(result => visible.has(result.method_id)),
    })).filter(batch => batch.methods.length > 0),
  };
}
