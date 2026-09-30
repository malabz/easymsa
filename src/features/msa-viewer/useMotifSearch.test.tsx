import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MSASequence } from "../../lib/types/msa";
import type {
  MotifWorkerRequest,
  MotifWorkerResponse
} from "./motifWorkerProtocol";
import {
  clearMotifSearchCacheForTests,
  useMotifSearch
} from "./useMotifSearch";

class HangingMotifWorker {
  static instances: HangingMotifWorker[] = [];
  onmessage: ((event: MessageEvent<MotifWorkerResponse>) => void) | null = null;
  onerror: (() => void) | null = null;
  messages: MotifWorkerRequest[] = [];
  terminated = false;

  constructor() {
    HangingMotifWorker.instances.push(this);
  }

  postMessage(message: MotifWorkerRequest) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }
}

const ROWS: MSASequence[] = [
  { id: "row", rowKey: "row", sequence: "AAACCC" }
];

describe("useMotifSearch cancellation", () => {
  beforeEach(() => {
    clearMotifSearchCacheForTests();
    HangingMotifWorker.instances = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("terminates the old Worker when a newer query replaces it", async () => {
    vi.stubGlobal("Worker", HangingMotifWorker);
    const hook = renderHook(
      ({ query }) => useMotifSearch(ROWS, query, {
        sourceFingerprint: "sha256:motif-cancel",
        debounceMs: 0
      }),
      { initialProps: { query: "AAA" } }
    );
    await waitFor(() => expect(HangingMotifWorker.instances).toHaveLength(1));
    const first = HangingMotifWorker.instances[0];

    hook.rerender({ query: "CCC" });
    await waitFor(() => expect(HangingMotifWorker.instances).toHaveLength(2));

    expect(first.terminated).toBe(true);
    expect(first.messages.some((message) => message.type === "cancel")).toBe(true);
    hook.unmount();
    expect(HangingMotifWorker.instances[1].terminated).toBe(true);
  });

  it("reports invalid symbols without creating a Worker", () => {
    vi.stubGlobal("Worker", HangingMotifWorker);
    const hook = renderHook(() => useMotifSearch(ROWS, "A-G", {
      sourceFingerprint: "sha256:invalid",
      debounceMs: 0
    }));

    expect(hook.result.current.errorCode).toBe("MOTIF_INVALID");
    expect(hook.result.current.invalidCharacters).toEqual(["-"]);
    expect(HangingMotifWorker.instances).toHaveLength(0);
    hook.unmount();
  });
});
