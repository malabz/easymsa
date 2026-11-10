/// <reference lib="webworker" />

import {
  MSA_INPUT_PROTOCOL_VERSION,
  msaInputErrorCode,
  processMsaInputRequest
} from "../features/msa-viewer/inputWorkerProtocol";
import type {
  MsaInputWorkerRequest,
  MsaInputWorkerResponse
} from "../features/msa-viewer/inputWorkerProtocol";

function post(response: MsaInputWorkerResponse) {
  self.postMessage(response);
}

import { handleSessionMessage } from "../features/msa-viewer/sharedData.worker";
import type { SessionMessage } from "../features/msa-viewer/sharedDataProtocol";
import { EasyMsaApiError } from "../lib/api/client";

self.onmessage = (event: MessageEvent<MsaInputWorkerRequest | SessionMessage>) => {
  const request = event.data;
  if (request.type !== "parse") { handleSessionMessage(request); return; }
  let lastProgress = -Infinity;
  void processMsaInputRequest(request, progress => {
    if (progress.stage === "preparing" || performance.now() - lastProgress > 80) {
      lastProgress = performance.now();
      post({ protocolVersion: MSA_INPUT_PROTOCOL_VERSION, type: "inputProgress", requestId: request.requestId, progress });
    }
  }).then(
    (result) => { handleSessionMessage({ type: "initialize", sequences: result.sequences }); post({
      protocolVersion: MSA_INPUT_PROTOCOL_VERSION,
      type: "inputReady",
      requestId: request.requestId,
      result
    }); },
    (error) => post({
      protocolVersion: MSA_INPUT_PROTOCOL_VERSION,
      type: "inputError",
      requestId: request.requestId,
      code: msaInputErrorCode(error),
      apiCode: error instanceof EasyMsaApiError ? error.code : undefined,
      status: error instanceof EasyMsaApiError ? error.status : undefined
    })
  );
};

export {};
