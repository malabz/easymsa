import { createSequenceExport, type SequenceExportRequest } from "./sequenceExportProtocol";
/// <reference lib="webworker" />
import type { MSASequence } from "../../lib/types/msa";
import type { SessionMessage } from "./sharedDataSession";
import { calculateMsaAnalysisPayloadV4, analysisWorkerError, type MsaAnalysisWorkerRequest } from "./workerProtocol";
import { calculateMotifSearchPayload, motifWorkerError, type MotifWorkerRequest } from "./motifWorkerProtocol";
import { calculateMsaRangeStatsTask, normalizeRangeStatsError, type MsaRangeStatsWorkerRequest } from "./rangeStatsWorkerProtocol";
import { calculateMinimapPair, type MinimapInput } from "./minimapData";
import { columnStatsStoreTransferables } from "./columnStatsStore";
let sequences: MSASequence[] = [];
self.onmessage = (event: MessageEvent<SessionMessage>) => {
  const message = event.data;
  if (message.type === "initialize") { sequences = message.sequences; return; }
  const rows = message.rows === null ? sequences : message.rows.map(index => sequences[index]);
  const request = { ...message.request, sequences: rows, rows,
    reference: message.reference === undefined ? null : sequences[message.reference],
    referenceSequence: message.referenceSequence === undefined ? null : sequences[message.referenceSequence] };
  try {
    let result: unknown;
    let transfer: Transferable[] = [];
    if (message.operation === "analysis") {
      const payload = calculateMsaAnalysisPayloadV4(request as unknown as Extract<MsaAnalysisWorkerRequest, { type: "analyze" }>);
      transfer = columnStatsStoreTransferables(payload.columnStore); result = payload;
    } else if (message.operation === "motif") result = calculateMotifSearchPayload(request as unknown as Extract<MotifWorkerRequest, { type: "search" }>);
    else if (message.operation === "range") result = calculateMsaRangeStatsTask(request as unknown as Extract<MsaRangeStatsWorkerRequest, { type: "calculate" }>);
    else if (message.operation === "export") result = createSequenceExport(request as unknown as SequenceExportRequest, progress => self.postMessage({id: message.id, progress}));
    else {
      const pair = calculateMinimapPair(request as unknown as MinimapInput);
      result = pair; transfer = [pair.horizontal.pixels.buffer, pair.vertical.pixels.buffer];
    }
    self.postMessage({ id: message.id, result }, transfer);
  } catch (error) {
    const normalized = message.operation === "analysis" ? analysisWorkerError(error)
      : message.operation === "motif" ? motifWorkerError(error)
      : message.operation === "range" ? normalizeRangeStatsError(error)
      : { code: "OVERVIEW_FAILED", message: error instanceof Error ? error.message : "Overview failed." };
    self.postMessage({ id: message.id, error: normalized });
  }
};
export {};
