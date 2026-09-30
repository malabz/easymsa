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

self.onmessage = (event: MessageEvent<MsaInputWorkerRequest>) => {
  const request = event.data;
  void processMsaInputRequest(request).then(
    (result) => post({
      protocolVersion: MSA_INPUT_PROTOCOL_VERSION,
      type: "inputReady",
      requestId: request.requestId,
      result
    }),
    (error) => post({
      protocolVersion: MSA_INPUT_PROTOCOL_VERSION,
      type: "inputError",
      requestId: request.requestId,
      code: msaInputErrorCode(error)
    })
  );
};

export {};
