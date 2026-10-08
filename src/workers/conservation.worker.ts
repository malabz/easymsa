/// <reference lib="webworker" />

import {
  MSA_ANALYSIS_PROTOCOL_VERSION,
  analysisWorkerError,
  calculateMsaAnalysisPayloadV4
} from "../features/msa-viewer/workerProtocol";
import { columnStatsStoreTransferables } from "../features/msa-viewer/columnStatsStore";
import type {
  MsaAnalysisWorkerRequest,
  MsaAnalysisWorkerResponse
} from "../features/msa-viewer/workerProtocol";

const cancelledRequests = new Set<string>();

function requestKey(generation: number, requestId: number) {
  return `${generation}:${requestId}`;
}

function post(response: MsaAnalysisWorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(response, transfer);
}

self.onmessage = (event: MessageEvent<MsaAnalysisWorkerRequest>) => {
  const request = event.data;
  const generation = request.generation;
  const requestId = request.requestId;
  const key = requestKey(generation, requestId);

  if (request.protocolVersion !== MSA_ANALYSIS_PROTOCOL_VERSION) {
    post({
      protocolVersion: MSA_ANALYSIS_PROTOCOL_VERSION,
      type: "analysisError",
      generation,
      requestId,
      code: "PROTOCOL_VERSION_MISMATCH",
      message: "Unsupported MSA analysis worker protocol version."
    });
    return;
  }

  if (request.type === "cancel") {
    cancelledRequests.add(key);
    post({
      protocolVersion: MSA_ANALYSIS_PROTOCOL_VERSION,
      type: "analysisCancelled",
      generation,
      requestId
    });
    return;
  }

  try {
    post({
      protocolVersion: MSA_ANALYSIS_PROTOCOL_VERSION,
      type: "analysisProgress",
      generation,
      requestId,
      progress: 0
    });
    if (cancelledRequests.delete(key)) {
      post({
        protocolVersion: MSA_ANALYSIS_PROTOCOL_VERSION,
        type: "analysisCancelled",
        generation,
        requestId
      });
      return;
    }
    const result = calculateMsaAnalysisPayloadV4(request);
    if (cancelledRequests.delete(key)) {
      post({
        protocolVersion: MSA_ANALYSIS_PROTOCOL_VERSION,
        type: "analysisCancelled",
        generation,
        requestId
      });
      return;
    }
    post({
      protocolVersion: MSA_ANALYSIS_PROTOCOL_VERSION,
      type: "analysisReady",
      generation,
      requestId,
      result
    }, columnStatsStoreTransferables(result.columnStore));
  } catch (error) {
    const normalized = analysisWorkerError(error);
    post({
      protocolVersion: MSA_ANALYSIS_PROTOCOL_VERSION,
      type: "analysisError",
      generation,
      requestId,
      code: normalized.code,
      message: normalized.message
    });
  } finally {
    cancelledRequests.delete(key);
  }
};

export {};
