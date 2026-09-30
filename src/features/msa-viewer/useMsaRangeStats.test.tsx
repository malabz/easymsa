import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MSASequence } from "../../lib/types/msa";
import {
  clearMsaRangeStatsCacheForTests,
  useMsaRangeStats
} from "./useMsaRangeStats";

const ROWS: MSASequence[] = [
  { id: "one", rowKey: "one", sequence: "AAAA" },
  { id: "two", rowKey: "two", sequence: "AGGG" }
];

describe("useMsaRangeStats fallback", () => {
  beforeEach(() => {
    clearMsaRangeStatsCacheForTests();
    vi.useFakeTimers();
    vi.stubGlobal("Worker", undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("cancels a pending fallback and isolates a replacement range", async () => {
    const hook = renderHook(
      ({ sourceFingerprint, start, end }) => useMsaRangeStats({
        sourceFingerprint,
        scopeRowKeys: ["one", "two"],
        sequences: ROWS,
        range: { start, end },
        consensusMode: "majority",
        alphabet: "dna",
        debounceMs: 150
      }),
      {
        initialProps: {
          sourceFingerprint: "sha256:first",
          start: 1,
          end: 4
        }
      }
    );

    hook.rerender({
      sourceFingerprint: "sha256:second",
      start: 2,
      end: 3
    });
    expect(hook.result.current.rangeStats).toBeNull();
    expect(hook.result.current.status).toBe("calculating");

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(hook.result.current.status).toBe("ready");
    expect(hook.result.current.rangeStats).toEqual(expect.objectContaining({
      length: 2,
      consensusSegment: "AA"
    }));
    hook.unmount();
  });
});
