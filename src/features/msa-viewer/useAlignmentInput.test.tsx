import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { loadAlignmentInput, useAlignmentInput } from "./useAlignmentInput";
import { MSA_INPUT_PROTOCOL_VERSION } from "./inputWorkerProtocol";

describe("useAlignmentInput", () => {
  it("terminates an aborted read and ignores a late progress message", async () => {
    const controller = new AbortController(), progress = vi.fn();
    const worker = { onmessage: null as Worker["onmessage"], onerror: null as Worker["onerror"], postMessage: vi.fn(), terminate: vi.fn() };
    const result = loadAlignmentInput({ sourceKind: "pasted", sourceName: "paste", payload: {kind:"text",text:">a\nAC"} }, {signal:controller.signal,progress,workerFactory:()=>worker});
    const rejected = expect(result).rejects.toMatchObject({code:"INPUT_CANCELLED"});
    controller.abort(); await rejected;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    const request = worker.postMessage.mock.calls[0][0];
    worker.onmessage?.call(worker as unknown as Worker, {data:{protocolVersion:MSA_INPUT_PROTOCOL_VERSION,requestId:request.requestId,type:"inputProgress",progress:{stage:"preparing",bytes:100}}} as MessageEvent);
    expect(progress).toHaveBeenLastCalledWith(null);
  });

  it("ends an unresponsive Worker with a retryable timeout", async () => {
    vi.useFakeTimers();
    try {
      const worker = { onmessage: null, onerror: null, postMessage: vi.fn(), terminate: vi.fn() };
      const result = loadAlignmentInput({ sourceKind:"pasted",sourceName:"paste",payload:{kind:"text",text:">a\nAC"} }, {workerFactory:()=>worker});
      const rejected = expect(result).rejects.toMatchObject({code:"LOAD_TIMEOUT"});
      await vi.advanceTimersByTimeAsync(60_000); await rejected;
      expect(worker.terminate).toHaveBeenCalledTimes(1);
    } finally { vi.useRealTimers(); }
  });

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
