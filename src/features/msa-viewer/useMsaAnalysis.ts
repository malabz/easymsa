import { useEffect, useRef, useState } from "react";
import type { MSASequence } from "../../lib/types/msa";
import {
  calculateMsaAnalysis,
  normalizedIupacMotif,
  searchIupacMotifMatches
} from "./analysis";
import type {
  AlignmentOverviewStats,
  ColumnStats,
  MotifMatch
} from "./types";
import type {
  MsaAnalysisWorkerRequest,
  MsaAnalysisWorkerResponse
} from "./workerProtocol";

const analysisCache = new WeakMap<
  MSASequence[],
  {
    alignmentLength: number;
    columns: ColumnStats[];
    overview: AlignmentOverviewStats;
  }
>();
let nextGeneration = 1;

export function useMsaAnalysis(
  sequences: MSASequence[],
  alignmentLength: number,
  motifQuery: string
) {
  const cached = analysisCache.get(sequences);
  const initialColumns =
    cached?.alignmentLength === alignmentLength ? cached.columns : [];
  const [columns, setColumns] = useState<ColumnStats[]>(initialColumns);
  const [overview, setOverview] = useState<AlignmentOverviewStats | null>(
    cached?.alignmentLength === alignmentLength ? cached.overview : null
  );
  const [motifMatches, setMotifMatches] = useState<MotifMatch[]>([]);
  const [motifMatchCount, setMotifMatchCount] = useState(0);
  const [motifMatchesTruncated, setMotifMatchesTruncated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(
    initialColumns.length !== alignmentLength
  );
  const [isSearchingMotif, setIsSearchingMotif] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const generationRef = useRef(0);
  const motifRequestRef = useRef(0);

  useEffect(() => {
    const generation = nextGeneration++;
    generationRef.current = generation;
    motifRequestRef.current = 0;
    setError(null);
    setMotifMatches([]);
    setMotifMatchCount(0);
    setMotifMatchesTruncated(false);
    const cachedResult = analysisCache.get(sequences);
    if (cachedResult?.alignmentLength === alignmentLength) {
      setColumns(cachedResult.columns);
      setOverview(cachedResult.overview);
      setIsCalculating(false);
    } else {
      setColumns([]);
      setOverview(null);
      setIsCalculating(true);
    }

    if (typeof Worker === "undefined") {
      if (cachedResult?.alignmentLength === alignmentLength) {
        return;
      }
      const timeout = window.setTimeout(() => {
        try {
          const result = calculateMsaAnalysis(sequences, alignmentLength);
          analysisCache.set(sequences, { alignmentLength, ...result });
          setColumns(result.columns);
          setOverview(result.overview);
          setIsCalculating(false);
        } catch (analysisError) {
          setError(
            analysisError instanceof Error
              ? analysisError.message
              : "MSA analysis failed"
          );
          setIsCalculating(false);
        }
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const worker = new Worker(
      new URL("../../workers/conservation.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<MsaAnalysisWorkerResponse>) => {
      const response = event.data;
      if (response.generation !== generationRef.current) {
        return;
      }
      if (response.type === "analysisReady") {
        analysisCache.set(sequences, {
          alignmentLength,
          columns: response.columns,
          overview: response.overview
        });
        setColumns(response.columns);
        setOverview(response.overview);
        setIsCalculating(false);
      } else if (response.type === "analysisInitialized") {
        setIsCalculating(false);
      } else if (
        response.type === "motifReady" &&
        response.requestId === motifRequestRef.current
      ) {
        setMotifMatches(response.matches);
        setMotifMatchCount(response.totalCount);
        setMotifMatchesTruncated(response.truncated);
        setIsSearchingMotif(false);
      } else if (response.type === "analysisError") {
        setError(response.message);
        setIsCalculating(false);
        setIsSearchingMotif(false);
      }
    };
    const request: MsaAnalysisWorkerRequest = {
      type: "initialize",
      generation,
      sequences,
      alignmentLength,
      skipAnalysis: cachedResult?.alignmentLength === alignmentLength
    };
    worker.postMessage(request);

    return () => {
      worker.terminate();
      if (workerRef.current === worker) {
        workerRef.current = null;
      }
    };
  }, [alignmentLength, sequences]);

  useEffect(() => {
    const query = normalizedIupacMotif(motifQuery);
    const requestId = motifRequestRef.current + 1;
    motifRequestRef.current = requestId;
    if (!query) {
      setMotifMatches([]);
      setMotifMatchCount(0);
      setMotifMatchesTruncated(false);
      setIsSearchingMotif(false);
      return;
    }

    setIsSearchingMotif(true);
    const timeout = window.setTimeout(() => {
      const worker = workerRef.current;
      if (worker) {
        const request: MsaAnalysisWorkerRequest = {
          type: "searchMotif",
          generation: generationRef.current,
          requestId,
          query
        };
        worker.postMessage(request);
        return;
      }

      try {
        const result = searchIupacMotifMatches(sequences, query, 20_000);
        setMotifMatches(result.matches);
        setMotifMatchCount(result.totalCount);
        setMotifMatchesTruncated(result.truncated);
        setIsSearchingMotif(false);
      } catch (searchError) {
        setError(
          searchError instanceof Error ? searchError.message : "Motif search failed"
        );
        setIsSearchingMotif(false);
      }
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [motifQuery, sequences]);

  return {
    columns,
    overview,
    error,
    isCalculating,
    isSearchingMotif,
    motifMatches,
    motifMatchCount,
    motifMatchesTruncated
  };
}
