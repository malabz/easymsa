import { createSequenceExportCooperative } from "./sequenceExportProtocol";
/// <reference lib="webworker" />
import type { MSASequence } from "../../lib/types/msa";
import type { DataOperation, DataResult, SessionMessage, SessionResponse, SessionTask } from "./sharedDataProtocol";
import { calculateMsaAnalysisPayloadV4Cooperative, analysisWorkerError } from "./workerProtocol";
import { calculateMotifSearchPayloadCooperative, motifWorkerError } from "./motifWorkerProtocol";
import { calculateMsaRangeStatsTaskCooperative, normalizeRangeStatsError } from "./rangeStatsWorkerProtocol";
import { calculateMinimapPairCooperative } from "./minimapData";
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
function* calculate(message: SessionTask): CooperativeTask<{ result: DataResult<DataOperation>; transfer: Transferable[] }> {
  const rows = message.rows === null ? sequences : message.rows.map(index => sequences[index]);
  const selection = { sequences: rows, rows,
    reference: message.reference === undefined ? null : sequences[message.reference],
    referenceSequence: message.referenceSequence === undefined ? null : sequences[message.referenceSequence] };
    let result: DataResult<DataOperation>;
    let transfer: Transferable[] = [];
    if (message.operation === "analysis") {
      const payload = yield* calculateMsaAnalysisPayloadV4Cooperative({ ...message.request, ...selection });
      transfer = columnStatsStoreTransferables(payload.columnStore); result = payload;
    } else if (message.operation === "motif") result = yield* calculateMotifSearchPayloadCooperative({ ...message.request, ...selection });
    else if (message.operation === "range") result = yield* calculateMsaRangeStatsTaskCooperative({ ...message.request, ...selection });
    else if (message.operation === "export") result = yield* createSequenceExportCooperative({ ...message.request, ...selection }, progress => self.postMessage({id: message.id, progress} satisfies SessionResponse));
    else {
      const pair = yield* calculateMinimapPairCooperative({ ...message.request, ...selection });
      result = pair; transfer = [pair.horizontal.pixels.buffer, pair.vertical.pixels.buffer];
    }
    return { result, transfer };
}
self.onmessage = (event: MessageEvent<SessionMessage>) => {
  const message = event.data;
  if (message.type === "initialize") { sequences = message.sequences; return; }
  if (message.type === "cancel") { scheduler.cancel(message.id); return; }
  scheduler.add(message.id, priority[message.operation], calculate(message), ({ result, transfer }) => self.postMessage({ id: message.id, result } satisfies SessionResponse, transfer), error => {
    const normalized = message.operation === "analysis" ? analysisWorkerError(error)
      : message.operation === "motif" ? motifWorkerError(error)
      : message.operation === "range" ? normalizeRangeStatsError(error)
      : { code: message.operation === "export" ? "EXPORT_FAILED" : "OVERVIEW_FAILED", message: error instanceof Error ? error.message : "Overview failed." };
    self.postMessage({ id: message.id, error: normalized } satisfies SessionResponse);
  });
};
export {};
