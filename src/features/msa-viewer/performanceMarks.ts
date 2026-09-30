export const MSA_PERFORMANCE_MARKS = {
  inputStart: "easymsa:input-start",
  inputDecoded: "easymsa:input-decoded",
  matrixMounted: "easymsa:matrix-mounted",
  viewerInteractive: "easymsa:viewer-interactive",
  analysisWorkerStart: "easymsa:analysis-worker-start",
  analysisWorkerDone: "easymsa:analysis-worker-done",
  analysisCommitted: "easymsa:analysis-committed",
  exportPreflightStart: "easymsa:export-preflight-start",
  exportPreflightDone: "easymsa:export-preflight-done",
  exportRenderStart: "easymsa:export-render-start",
  exportRenderDone: "easymsa:export-render-done"
} as const;

export function markMsaPerformance(name: string) {
  try {
    globalThis.performance?.mark(name);
  } catch {
    // Performance instrumentation must never affect the Viewer workflow.
  }
}
