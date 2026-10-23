import { createSequenceExportCooperative, type SequenceExportRequest } from "./sequenceExportProtocol";
/// <reference lib="webworker" />
import type { MSASequence } from "../../lib/types/msa";
import type { SessionMessage, SessionTask } from "./sharedDataSession";
import { calculateMsaAnalysisPayloadV4Cooperative, analysisWorkerError, type MsaAnalysisWorkerRequest } from "./workerProtocol";
import { calculateMotifSearchPayloadCooperative, motifWorkerError, type MotifWorkerRequest } from "./motifWorkerProtocol";
import { calculateMsaRangeStatsTaskCooperative, normalizeRangeStatsError, type MsaRangeStatsWorkerRequest } from "./rangeStatsWorkerProtocol";
import { calculateMinimapPairCooperative, type MinimapInput } from "./minimapData";
import { columnStatsStoreTransferables } from "./columnStatsStore";
import { CooperativeScheduler, type CooperativeTask } from "./cooperativeTask";
// MessageChannel yields to incoming requests without the repeated timer clamp.
const turnChannel = new MessageChannel();
const scheduler = new CooperativeScheduler(8, callback => {
  turnChannel.port1.onmessage = callback;
  turnChannel.port2.postMessage(null);
});
const priority = { range: 4, motif: 3, analysis: 1, export: 0, overview: 0 };
let sequences: MSASequence[] = [];
function* calculate(message: SessionTask): CooperativeTask<{ result: unknown; transfer: Transferable[] }> {
  const rows = message.rows === null ? sequences : message.rows.map(index => sequences[index]);
  const request = { ...message.request, sequences: rows, rows,
    reference: message.reference === undefined ? null : sequences[message.reference],
    referenceSequence: message.referenceSequence === undefined ? null : sequences[message.referenceSequence] };
    let result: unknown;
    let transfer: Transferable[] = [];
    if (message.operation === "analysis") {
      const payload = yield* calculateMsaAnalysisPayloadV4Cooperative(request as unknown as Extract<MsaAnalysisWorkerRequest, { type: "analyze" }>);
      transfer = columnStatsStoreTransferables(payload.columnStore); result = payload;
    } else if (message.operation === "motif") result = yield* calculateMotifSearchPayloadCooperative(request as unknown as Extract<MotifWorkerRequest, { type: "search" }>);
    else if (message.operation === "range") result = yield* calculateMsaRangeStatsTaskCooperative(request as unknown as Extract<MsaRangeStatsWorkerRequest, { type: "calculate" }>);
    else if (message.operation === "export") result = yield* createSequenceExportCooperative(request as unknown as SequenceExportRequest, progress => self.postMessage({id: message.id, progress}));
    else {
      const pair = yield* calculateMinimapPairCooperative(request as unknown as MinimapInput);
      result = pair; transfer = [pair.horizontal.pixels.buffer, pair.vertical.pixels.buffer];
    }
    return { result, transfer };
}
self.onmessage = (event: MessageEvent<SessionMessage>) => {
  const message = event.data;
  if (message.type === "initialize") { sequences = message.sequences; return; }
  if (message.type === "cancel") { scheduler.cancel(message.id); return; }
  scheduler.add(message.id, priority[message.operation], calculate(message), ({ result, transfer }) => self.postMessage({ id: message.id, result }, transfer), error => {
    const normalized = message.operation === "analysis" ? analysisWorkerError(error)
      : message.operation === "motif" ? motifWorkerError(error)
      : message.operation === "range" ? normalizeRangeStatsError(error)
      : { code: message.operation === "export" ? "EXPORT_FAILED" : "OVERVIEW_FAILED", message: error instanceof Error ? error.message : "Overview failed." };
    self.postMessage({ id: message.id, error: normalized });
  });
};
export {};
