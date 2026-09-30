import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAlignmentInput } from "./useAlignmentInput";

describe("useAlignmentInput", () => {
  it("uses the safe inline fallback when Worker is unavailable", async () => {
    const { result } = renderHook(() => useAlignmentInput(() => null));
    let alignment;
    await act(async () => {
      alignment = await result.current.processInput({
        sourceKind: "pasted",
        sourceName: "paste",
        payload: { kind: "text", text: ">a\nACGT\n>b\nAC-T" }
      });
    });

    expect(alignment).toMatchObject({ sequenceCount: 2, alignmentLength: 4 });
  });

  it("falls back when an embedded browser rejects Worker construction", async () => {
    const { result } = renderHook(() => useAlignmentInput(() => {
      throw new DOMException("blocked", "SecurityError");
    }));

    await expect(result.current.processInput({
      sourceKind: "pasted",
      sourceName: "paste",
      payload: { kind: "text", text: ">a\nACGT" }
    })).resolves.toMatchObject({ sequenceCount: 1, alignmentLength: 4 });
  });

  it("cancels an unfinished inline request without publishing stale data", async () => {
    const { result } = renderHook(() => useAlignmentInput(() => null));
    const first = result.current.processInput({
      sourceKind: "pasted",
      sourceName: "first",
      payload: { kind: "text", text: ">a\nACGT" }
    });
    act(() => result.current.cancel());

    await expect(first).rejects.toEqual(
      expect.objectContaining({ code: "INPUT_CANCELLED" })
    );
  });
});
