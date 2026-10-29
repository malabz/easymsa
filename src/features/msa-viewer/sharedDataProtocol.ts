import type { MSASequence } from "../../lib/types/msa";
import type { MinimapInput, MinimapPair } from "./minimapData";
import type { MotifSearchPayloadV3, MotifWorkerRequest } from "./motifWorkerProtocol";
import type { MsaRangeStatsWorkerRequest } from "./rangeStatsWorkerProtocol";
import type { SequenceExportRequest } from "./sequenceExportProtocol";
import type { RangeStats } from "./types";
import type { MsaAnalysisPayloadV4, MsaAnalysisWorkerRequest } from "./workerProtocol";

type DataProtocol = {
  analysis: { request: Extract<MsaAnalysisWorkerRequest, { type: "analyze" }>; result: MsaAnalysisPayloadV4 };
  motif: { request: Extract<MotifWorkerRequest, { type: "search" }>; result: MotifSearchPayloadV3 };
  range: { request: Extract<MsaRangeStatsWorkerRequest, { type: "calculate" }>; result: RangeStats | null };
  overview: { request: MinimapInput; result: MinimapPair };
  export: { request: SequenceExportRequest; result: Blob };
};

export type DataOperation = keyof DataProtocol;
export type DataRequest<K extends DataOperation> = DataProtocol[K]["request"];
export type DataResult<K extends DataOperation> = DataProtocol[K]["result"];

/** Sequence objects stay with the data owner; each task sends only row indexes. */
export type SessionTask = {
  [K in DataOperation]: {
    type: "run";
    id: number;
    operation: K;
    rows: number[] | null;
    reference?: number;
    referenceSequence?: number;
    request: Omit<DataRequest<K>, "sequences" | "rows" | "sourceRows" | "reference" | "referenceSequence">;
  }
}[DataOperation];

export type SessionMessage =
  | { type: "initialize"; sequences: MSASequence[] }
  | { type: "cancel"; id: number }
  | SessionTask;

export type SessionResponse = { id: number } & (
  | { result: DataResult<DataOperation>; progress?: never; error?: never }
  | { progress: number; result?: never; error?: never }
  | { error: { code: string; message: string; invalidCharacters?: string[] }; result?: never; progress?: never }
);
