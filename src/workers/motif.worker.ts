/// <reference lib="webworker" />

import {
  MOTIF_WORKER_PROTOCOL_VERSION,
  calculateMotifSearchPayload,
  motifWorkerError
} from "../features/msa-viewer/motifWorkerProtocol";
import type {
  MotifWorkerRequest,
  MotifWorkerResponse
} from "../features/msa-viewer/motifWorkerProtocol";

const cancelled = new Set<number>();

function post(response: MotifWorkerResponse) {
  self.postMessage(response);
}

self.onmessage = (event: MessageEvent<MotifWorkerRequest>) => {
  const request = event.data;
  if (request.protocolVersion !== MOTIF_WORKER_PROTOCOL_VERSION) {
    post({
      protocolVersion: MOTIF_WORKER_PROTOCOL_VERSION,
      type: "motifError",
      requestId: request.requestId,
      code: "PROTOCOL_VERSION_MISMATCH",
      message: "Unsupported motif worker protocol version."
    });
    return;
  }
  if (request.type === "cancel") {
    cancelled.add(request.requestId);
    post({
      protocolVersion: MOTIF_WORKER_PROTOCOL_VERSION,
      type: "motifCancelled",
      requestId: request.requestId
    });
    return;
  }

  try {
    if (cancelled.delete(request.requestId)) {
      post({
        protocolVersion: MOTIF_WORKER_PROTOCOL_VERSION,
        type: "motifCancelled",
        requestId: request.requestId
      });
      return;
    }
    const result = calculateMotifSearchPayload(request);
    if (cancelled.delete(request.requestId)) {
      post({
        protocolVersion: MOTIF_WORKER_PROTOCOL_VERSION,
        type: "motifCancelled",
        requestId: request.requestId
      });
      return;
    }
    post({
      protocolVersion: MOTIF_WORKER_PROTOCOL_VERSION,
      type: "motifReady",
      requestId: request.requestId,
      result
    });
  } catch (error) {
    const normalized = motifWorkerError(error);
    post({
      protocolVersion: MOTIF_WORKER_PROTOCOL_VERSION,
      type: "motifError",
      requestId: request.requestId,
      code: normalized.code,
      message: normalized.message,
      invalidCharacters: normalized.invalidCharacters
    });
  } finally {
    cancelled.delete(request.requestId);
  }
};

export {};
