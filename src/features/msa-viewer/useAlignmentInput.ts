import { useCallback, useEffect, useRef, useState } from "react";
import type { MSAResult } from "../../lib/types/msa";
import { EasyMsaApiError } from "../../lib/api/client";
import { MSA_INPUT_PROTOCOL_VERSION, MsaInputError, processMsaInputRequest } from "./inputWorkerProtocol";
import type { InputProgress, MsaInputWorkerRequest, MsaInputWorkerResponse } from "./inputWorkerProtocol";
import { adoptMsaDataSession } from "./sharedDataSession";
import { markMsaPerformance, MSA_PERFORMANCE_MARKS } from "./performanceMarks";

type InputWorker = Pick<Worker, "onerror" | "onmessage" | "postMessage" | "terminate">;
export type InputWorkerFactory = () => InputWorker | null;
export type AlignmentInputRequest = Omit<MsaInputWorkerRequest, "protocolVersion" | "type" | "requestId">;
function defaultWorkerFactory(): InputWorker | null {
  return typeof Worker === "undefined" ? null : new Worker(new URL("../../workers/alignment-input.worker.ts", import.meta.url), { type: "module" });
}
let nextRequestId = 1;

/** Owns cancellation until handoff; the viewer session then owns the same Worker. */
export function loadAlignmentInput(input: AlignmentInputRequest, options: {
  signal?: AbortSignal; progress?: (progress: InputProgress | null) => void; workerFactory?: InputWorkerFactory;
} = {}): Promise<MSAResult> {
  markMsaPerformance(MSA_PERFORMANCE_MARKS.inputStart);
  const request: MsaInputWorkerRequest = { ...input, protocolVersion: MSA_INPUT_PROTOCOL_VERSION, type: "parse", requestId: nextRequestId++ };
  let worker: InputWorker | null = null;
  try { worker = (options.workerFactory ?? defaultWorkerFactory)(); } catch { /* handled below */ }
  return new Promise((resolve, reject) => {
    let finished = false;
    const stages = new Set<string>();
    const cleanup = () => { clearTimeout(timer); options.signal?.removeEventListener("abort", abort); options.progress?.(null); };
    const fail = (error: unknown) => { if (finished) return; finished = true; cleanup(); worker?.terminate(); reject(error); };
    const abort = () => fail(new MsaInputError("INPUT_CANCELLED"));
    const timer = setTimeout(() => fail(new EasyMsaApiError({ code: "LOAD_TIMEOUT", message: "Loading timed out. Retry the request." })), 60_000);
    const ready = (result: MSAResult) => {
      if (finished) return;
      finished = true; cleanup();
      if (worker) adoptMsaDataSession(result.sequences, worker as Worker);
      markMsaPerformance(MSA_PERFORMANCE_MARKS.inputDecoded); resolve(result);
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) { abort(); return; }
    options.progress?.({ stage: "reading", bytes: 0 });
    if (!worker) {
      if (import.meta.env.MODE === "test") void processMsaInputRequest(request, options.progress).then(ready, fail);
      else fail(new MsaInputError("INPUT_WORKER_FAILED"));
      return;
    }
    worker.onmessage = (event: MessageEvent<MsaInputWorkerResponse>) => {
      if (finished) return;
      const response = event.data;
      if (response.protocolVersion !== MSA_INPUT_PROTOCOL_VERSION || response.requestId !== request.requestId) return;
      if (response.type === "inputProgress") {
        if (!stages.has(response.progress.stage)) {
          stages.add(response.progress.stage);
          markMsaPerformance(`easymsa:input-${response.progress.stage}`);
        }
        options.progress?.(response.progress);
      }
      else if (response.type === "inputReady") ready(response.result);
      else fail(response.apiCode ? new EasyMsaApiError({ code: response.apiCode, status: response.status, message: "The alignment could not be read." }) : new MsaInputError(response.code));
    };
    worker.onerror = () => fail(new MsaInputError("INPUT_WORKER_FAILED"));
    try { worker.postMessage(request, request.payload.kind === "bytes" ? [request.payload.bytes] : []); }
    catch { fail(new MsaInputError("INPUT_WORKER_FAILED")); }
  });
}

export function useAlignmentInput(workerFactory: InputWorkerFactory = defaultWorkerFactory) {
  const active = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<InputProgress | null>(null);
  const cancel = useCallback(() => { active.current?.abort(); active.current = null; }, []);
  useEffect(() => cancel, [cancel]);
  const processInput = useCallback((input: AlignmentInputRequest) => {
    cancel(); const controller = new AbortController(); active.current = controller;
    return loadAlignmentInput(input, { signal: controller.signal, workerFactory,
      progress: value => { if (active.current === controller) setProgress(value); } });
  }, [cancel, workerFactory]);
  return { cancel, processInput, progress };
}
