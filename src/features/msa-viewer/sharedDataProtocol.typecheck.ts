import type { MinimapPair } from "./minimapData";
import type { MotifSearchPayloadV3 } from "./motifWorkerProtocol";
import type { DataOperation, DataRequest, SessionTask } from "./sharedDataProtocol";
import type { MsaDataSession } from "./sharedDataSession";
import type { RangeStats } from "./types";
import type { MsaAnalysisPayloadV4 } from "./workerProtocol";

// Checked by tsc with the app sources, never executed or included in the app bundle.
function checkProtocolTypes(session: MsaDataSession, requests: { [K in DataOperation]: DataRequest<K> }) {
  const analysis: Promise<MsaAnalysisPayloadV4> = session.run("analysis", requests.analysis);
  const motif: Promise<MotifSearchPayloadV3> = session.run("motif", requests.motif);
  const range: Promise<RangeStats | null> = session.run("range", requests.range);
  const overview: Promise<MinimapPair> = session.run("overview", requests.overview);
  const exported: Promise<Blob> = session.run("export", requests.export);

  // @ts-expect-error A motif request cannot be used for an analysis operation.
  session.run("analysis", requests.motif);
  // @ts-expect-error Callers cannot choose an unrelated result type.
  session.run<Blob>("analysis", requests.analysis);
  // @ts-expect-error Required range fields cannot be omitted.
  session.run("range", { sequences: requests.range.sequences });
  // @ts-expect-error Cancel is a session message, not an analysis request.
  session.run("analysis", { protocolVersion: 4, type: "cancel", generation: 1, requestId: 1 });
  // @ts-expect-error An overview result is not an export blob.
  const wrongResult: Promise<Blob> = session.run("overview", requests.overview);
  const { sequences: _sequences, ...motifRequest } = requests.motif;
  const motifTask: SessionTask = { type: "run", id: 1, operation: "motif", rows: null, request: motifRequest };
  // @ts-expect-error Serialized messages must preserve the operation/request pairing.
  const wrongTask: SessionTask = { ...motifTask, operation: "analysis" };

  return [analysis, motif, range, overview, exported, wrongResult, wrongTask];
}
void checkProtocolTypes;
