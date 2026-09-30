/// <reference lib="webworker" />

import {
  MSA_RANGE_STATS_PROTOCOL_VERSION,
  calculateMsaRangeStatsTask,
  normalizeRangeStatsError
} from "../features/msa-viewer/rangeStatsWorkerProtocol";
import type {
  MsaRangeStatsWorkerRequest,
  MsaRangeStatsWorkerResponse
} from "../features/msa-viewer/rangeStatsWorkerProtocol";

const cancelled = new Set<number>();

function post(response: MsaRangeStatsWorkerResponse) {
  self.postMessage(response);
}

self.onmessage = (event: MessageEvent<MsaRangeStatsWorkerRequest>) => {
  const request = event.data;
  if (request.protocolVersion !== MSA_RANGE_STATS_PROTOCOL_VERSION) {
    post({
      protocolVersion: MSA_RANGE_STATS_PROTOCOL_VERSION,
      type: "rangeStatsError",
      requestId: request.requestId,
      code: "RANGE_STATS_PROTOCOL_MISMATCH",
      message: "Unsupported range statistics worker protocol version."
    });
    return;
  }
  if (request.type === "cancel") {
    cancelled.add(request.requestId);
    post({
      protocolVersion: MSA_RANGE_STATS_PROTOCOL_VERSION,
      type: "rangeStatsCancelled",
      requestId: request.requestId
    });
    return;
  }

  try {
    if (cancelled.delete(request.requestId)) {
      post({
        protocolVersion: MSA_RANGE_STATS_PROTOCOL_VERSION,
        type: "rangeStatsCancelled",
        requestId: request.requestId
      });
      return;
    }
    const result = calculateMsaRangeStatsTask(request);
    if (cancelled.delete(request.requestId)) {
      post({
        protocolVersion: MSA_RANGE_STATS_PROTOCOL_VERSION,
        type: "rangeStatsCancelled",
        requestId: request.requestId
      });
      return;
    }
    post({
      protocolVersion: MSA_RANGE_STATS_PROTOCOL_VERSION,
      type: "rangeStatsReady",
      requestId: request.requestId,
      result
    });
  } catch (error) {
    const normalized = normalizeRangeStatsError(error);
    post({
      protocolVersion: MSA_RANGE_STATS_PROTOCOL_VERSION,
      type: "rangeStatsError",
      requestId: request.requestId,
      code: normalized.code,
      message: normalized.message
    });
  } finally {
    cancelled.delete(request.requestId);
  }
};

export {};
