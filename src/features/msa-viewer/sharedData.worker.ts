import type { PreparedAnalysis } from "./workerProtocol";
import { createSequenceExportCooperative } from "./sequenceExportProtocol";
/// <reference lib="webworker" />
import type { MSASequence } from "../../lib/types/msa";
import type { DataOperation, DataResult, SessionMessage, SessionResponse, SessionTask } from "./sharedDataProtocol";
import { calculateMsaAnalysisPayloadV4Cooperative, analysisWorkerError } from "./workerProtocol";
import { calculateMotifSearchPayloadCooperative, motifWorkerError } from "./motifWorkerProtocol";
import { calculateMsaRangeStatsTaskCooperative, normalizeRangeStatsError } from "./rangeStatsWorkerProtocol";
import { calculateMinimapPairCooperative } from "./minimapData";
import { columnStatsStoreByteLength, columnStatsStoreTransferables } from "./columnStatsStore";
import { CooperativeScheduler, type CooperativeTask } from "./cooperativeTask";
// MessageChannel yields to incoming requests without the repeated timer clamp.
const turnChannel = new MessageChannel();
const scheduler = new CooperativeScheduler(8, callback => {
  turnChannel.port1.onmessage = callback;
  turnChannel.port2.postMessage(null);
});
const priority = { range: 4, motif: 3, analysis: 1, export: 0, overview: 0 };
let sequences: MSASequence[] = [];
const preparedCache = new Map<string, { value: PreparedAnalysis; bytes: number }>();
function remember(key: string, value: PreparedAnalysis) {
  preparedCache.delete(key);
  preparedCache.set(key, {value, bytes: columnStatsStoreByteLength(value.analysis.columnStore) + value.basicRows.length * 384});
  while (preparedCache.size > 3 || [...preparedCache.values()].reduce((n, item) => n + item.bytes, 0) > 48 * 1024 * 1024) {
    preparedCache.delete(preparedCache.keys().next().value!);
  }
}
function* calculate(message: SessionTask): CooperativeTask<{ result: DataResult<DataOperation>; transfer: Transferable[] }> {
  const rows = message.rows === null ? sequences : message.rows.map(index => sequences[index]);
  const selection = { sequences: rows, rows,
    reference: message.reference === undefined ? null : sequences[message.reference],
    referenceSequence: message.referenceSequence === undefined ? null : sequences[message.referenceSequence] };
    let result: DataResult<DataOperation>;
    let transfer: Transferable[] = [];
    if (message.operation === "analysis") {
      const key = JSON.stringify([message.request.sourceFingerprint, message.request.alignmentLength, message.request.alphabet, message.rows]);
      const cached = preparedCache.get(key)?.value;
      if (cached) remember(key, cached);
      result = yield* calculateMsaAnalysisPayloadV4Cooperative({ ...message.request, ...selection }, {
        prepared: cached, onPrepared: value => remember(key, value),
        onColumns: partial => self.postMessage({id: message.id, partial} satisfies SessionResponse)
      });
      // Transfer an independent result; cached counters must remain attached.
      result = { ...result, columnStore: structuredClone(result.columnStore) };
      transfer = columnStatsStoreTransferables(result.columnStore);
    } else if (message.operation === "motif") result = yield* calculateMotifSearchPayloadCooperative({ ...message.request, ...selection });
    else if (message.operation === "range") result = yield* calculateMsaRangeStatsTaskCooperative({ ...message.request, ...selection });
    else if (message.operation === "export") result = yield* createSequenceExportCooperative({ ...message.request, ...selection }, progress => self.postMessage({id: message.id, progress} satisfies SessionResponse));
    else {
      const pair = yield* calculateMinimapPairCooperative({ ...message.request, ...selection });
      result = pair; transfer = [pair.horizontal.pixels.buffer, pair.vertical.pixels.buffer];
    }
    return { result, transfer };
}
export function handleSessionMessage(message: SessionMessage) {
  if (message.type === "initialize") { sequences = message.sequences; preparedCache.clear(); return; }
  if (message.type === "cancel") { scheduler.cancel(message.id); return; }
  scheduler.add(message.id, priority[message.operation], calculate(message), ({ result, transfer }) => self.postMessage({ id: message.id, result } satisfies SessionResponse, transfer), error => {
    const normalized = message.operation === "analysis" ? analysisWorkerError(error)
      : message.operation === "motif" ? motifWorkerError(error)
      : message.operation === "range" ? normalizeRangeStatsError(error)
      : { code: message.operation === "export" ? "EXPORT_FAILED" : "OVERVIEW_FAILED", message: error instanceof Error ? error.message : "Overview failed." };
    self.postMessage({ id: message.id, error: normalized } satisfies SessionResponse);
  });
};
self.onmessage = (event: MessageEvent<SessionMessage>) => handleSessionMessage(event.data);
