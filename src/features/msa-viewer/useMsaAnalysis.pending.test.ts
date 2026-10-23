import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMsaAnalysis } from "./useMsaAnalysis";
import type { MsaAnalysisWorkerRequest } from "./workerProtocol";

const sequences = [{ id: "a teaching sequence", rowKey: "row:a", sequence: "ACGT" }];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("stable analysis placeholders", () => {
  it("does not rebuild downstream input while Worker progress changes", () => {
    const workers: PendingWorker[] = [];
    class PendingWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror = null;
      postMessage = vi.fn();
      terminate = vi.fn();
      constructor() { workers.push(this); }
    }
    vi.stubGlobal("Worker", PendingWorker);
    const { result, rerender } = renderHook(() => useMsaAnalysis(sequences, 4, {
      sourceFingerprint: "test:stable-pending-placeholders",
      alphabet: "dna"
    }));
    const initial = result.current;
    const worker = workers[0];
    const request = worker.postMessage.mock.calls[0][0] as MsaAnalysisWorkerRequest;
    for (const progress of [0.1, 0.4, 0.8]) {
      act(() => worker.onmessage?.({ data: {
        protocolVersion: request.protocolVersion,
        generation: request.generation,
        requestId: request.requestId,
        type: "analysisProgress",
        progress
      } } as MessageEvent));
      rerender();
      expect(result.current.progress).toBe(progress);
      expect(result.current.status).toBe("calculating");
      expect(result.current.rowQc).toBe(initial.rowQc);
      expect(result.current.overviewBins).toBe(initial.overviewBins);
      expect(result.current.consensus).toBe(initial.consensus);
    }
    expect(workers).toHaveLength(1);
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
  });

  it("keeps disabled placeholders stable for neutral alignments", () => {
    const { result, rerender } = renderHook(() => useMsaAnalysis(sequences, 4, {
      sourceFingerprint: "test:stable-disabled-placeholders",
      alignmentMode: "neutral"
    }));
    const initial = result.current;
    rerender();
    expect(result.current.status).toBe("disabled");
    expect(result.current.rowQc).toBe(initial.rowQc);
    expect(result.current.overviewBins).toBe(initial.overviewBins);
    expect(result.current.consensus).toBe(initial.consensus);
  });

  it("does not serialize row membership again for unrelated renders", () => {
    vi.stubGlobal("Worker", undefined);
    const rows = Array.from({ length: 1000 }, (_, index) => ({ id: `row-${index}`, rowKey: `row:${index}`, sequence: "ACGT" }));
    const { rerender } = renderHook(() => useMsaAnalysis(rows, 4, {
      sourceFingerprint: "test:memoized-membership",
      alignmentMode: "neutral"
    }));
    const stringify = vi.spyOn(JSON, "stringify");
    rerender(); rerender();
    const largeKeyCalls = stringify.mock.calls.filter(([value]) => Array.isArray(value) && (
      value.length >= rows.length || value.some(item => Array.isArray(item) && item.length >= rows.length)
    ));
    expect(largeKeyCalls).toHaveLength(0);
    stringify.mockRestore();
  });
});
