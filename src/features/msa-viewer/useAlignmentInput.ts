import { useCallback, useEffect, useRef } from "react";
import type { MSAResult, SequenceAlphabet } from "../../lib/types/msa";
import {
  MSA_INPUT_PROTOCOL_VERSION,
  MsaInputError,
  processMsaInputRequest
} from "./inputWorkerProtocol";
import type {
  AlignmentInputPayload,
  MsaInputWorkerRequest,
  MsaInputWorkerResponse
} from "./inputWorkerProtocol";
import { markMsaPerformance, MSA_PERFORMANCE_MARKS } from "./performanceMarks";

type InputWorker = Pick<Worker, "onerror" | "onmessage" | "postMessage" | "terminate">;
export type InputWorkerFactory = () => InputWorker | null;

export type AlignmentInputRequest = {
  sourceKind: "local-file" | "pasted";
  sourceName: string;
  declaredAlphabet?: SequenceAlphabet;
  payload: AlignmentInputPayload;
};

function defaultWorkerFactory(): InputWorker | null {
  if (typeof Worker === "undefined") {
    return null;
  }
  return new Worker(
    new URL("../../workers/alignment-input.worker.ts", import.meta.url),
    { type: "module" }
  );
}

let nextRequestId = 1;

export function useAlignmentInput(workerFactory: InputWorkerFactory = defaultWorkerFactory) {
  const activeRef = useRef<{
    requestId: number;
    worker: InputWorker | null;
    reject: (reason: MsaInputError) => void;
  } | null>(null);

  const cancel = useCallback(() => {
    const active = activeRef.current;
    if (!active) {
      return;
    }
    activeRef.current = null;
    active.worker?.terminate();
    active.reject(new MsaInputError("INPUT_CANCELLED"));
  }, []);

  useEffect(() => cancel, [cancel]);

  const processInput = useCallback((input: AlignmentInputRequest) => {
    cancel();
    markMsaPerformance(MSA_PERFORMANCE_MARKS.inputStart);
    const requestId = nextRequestId;
    nextRequestId += 1;
    const request: MsaInputWorkerRequest = {
      protocolVersion: MSA_INPUT_PROTOCOL_VERSION,
      type: "parse",
      requestId,
      ...input
    };
    let worker: InputWorker | null = null;
    try {
      worker = workerFactory();
    } catch {
      // Worker construction can fail in embedded webviews or under a strict
      // content-security policy. The same protocol implementation remains a
      // safe functional fallback on the main thread.
      worker = null;
    }

    return new Promise<MSAResult>((resolve, reject) => {
      const rejectTyped = (reason: MsaInputError) => reject(reason);
      activeRef.current = { requestId, worker, reject: rejectTyped };
      const finish = (callback: () => void) => {
        if (activeRef.current?.requestId !== requestId) {
          return;
        }
        activeRef.current = null;
        worker?.terminate();
        callback();
      };

      if (!worker) {
        if (import.meta.env.MODE === "test") {
          void processMsaInputRequest(request).then(
            (result) => finish(() => {
              markMsaPerformance(MSA_PERFORMANCE_MARKS.inputDecoded);
              resolve(result);
            }),
            (error) => finish(() => reject(error))
          );
        } else {
          finish(() => reject(new MsaInputError("INPUT_WORKER_FAILED")));
        }
        return;
      }

      worker.onmessage = (event: MessageEvent<MsaInputWorkerResponse>) => {
        const response = event.data;
        if (
          response.protocolVersion !== MSA_INPUT_PROTOCOL_VERSION ||
          response.requestId !== requestId
        ) {
          return;
        }
        if (response.type === "inputReady") {
          finish(() => {
            markMsaPerformance(MSA_PERFORMANCE_MARKS.inputDecoded);
            resolve(response.result);
          });
        } else {
          finish(() => reject(new MsaInputError(response.code)));
        }
      };
      worker.onerror = () => {
        finish(() => reject(new MsaInputError("INPUT_WORKER_FAILED")));
      };
      const transfer = request.payload.kind === "bytes"
        ? [request.payload.bytes]
        : undefined;
      worker.postMessage(request, transfer ?? []);
    });
  }, [cancel, workerFactory]);

  return { cancel, processInput };
}
