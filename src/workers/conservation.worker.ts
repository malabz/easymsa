/// <reference lib="webworker" />

import {
  calculateMsaAnalysis,
  searchIupacMotifMatches
} from "../features/msa-viewer/analysis";
import type {
  MsaAnalysisWorkerRequest,
  MsaAnalysisWorkerResponse
} from "../features/msa-viewer/workerProtocol";
import type { MSASequence } from "../lib/types/msa";

let sequences: MSASequence[] = [];
let generation = 0;
const motifCache = new Map<string, ReturnType<typeof searchIupacMotifMatches>>();
const MAX_STORED_MOTIF_MATCHES = 20_000;

self.onmessage = (event: MessageEvent<MsaAnalysisWorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === "initialize") {
      sequences = request.sequences;
      generation = request.generation;
      motifCache.clear();
      if (request.skipAnalysis) {
        const response: MsaAnalysisWorkerResponse = {
          type: "analysisInitialized",
          generation
        };
        self.postMessage(response);
        return;
      }
      const analysis = calculateMsaAnalysis(sequences, request.alignmentLength);
      const response: MsaAnalysisWorkerResponse = {
        type: "analysisReady",
        generation,
        columns: analysis.columns,
        overview: analysis.overview
      };
      self.postMessage(response);
      return;
    }

    if (request.generation !== generation) {
      return;
    }
    const result = motifCache.get(request.query) ??
      searchIupacMotifMatches(sequences, request.query, MAX_STORED_MOTIF_MATCHES);
    motifCache.set(request.query, result);
    const response: MsaAnalysisWorkerResponse = {
      type: "motifReady",
      generation,
      requestId: request.requestId,
      matches: result.matches,
      totalCount: result.totalCount,
      truncated: result.truncated
    };
    self.postMessage(response);
  } catch (error) {
    const response: MsaAnalysisWorkerResponse = {
      type: "analysisError",
      generation: request.generation,
      message: error instanceof Error ? error.message : "MSA analysis failed"
    };
    self.postMessage(response);
  }
};
