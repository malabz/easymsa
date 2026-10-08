import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AlignmentMode,
  MSASequence,
  SequenceAlphabet
} from "../../lib/types/msa";
import {
  canonicalAlignmentSourceKey,
  rowKeyForSequence
} from "./alignmentModel";
import type {
  AnalysisScope,
  MotifMatchMode,
  MotifStrandMode
} from "./types";
import { useMotifSearch } from "./useMotifSearch";
import {
  MSA_ANALYSIS_PROTOCOL_VERSION,
  MsaAnalysisWorkerError,
  analysisWorkerError,
  assertMsaAnalysisPayloadV4,
  calculateMsaAnalysisPayloadV4,
  estimateMsaAnalysisPayloadBytes
} from "./workerProtocol";
import { markMsaPerformance, MSA_PERFORMANCE_MARKS } from "./performanceMarks";
import type {
  MsaAnalysisPayloadV4,
  MsaAnalysisWorkerErrorCode,
  MsaAnalysisWorkerRequest,
  MsaAnalysisWorkerResponse
} from "./workerProtocol";
import { columnStatsAtPosition } from "./columnStatsStore";

const MAX_ANALYSIS_CACHE_ENTRIES = 6;
const MAX_ANALYSIS_CACHE_BYTES = 48 * 1024 * 1024;
const analysisCache = new Map<
  string,
  { result: MsaAnalysisPayloadV4; estimatedBytes: number }
>();
let analysisCacheBytes = 0;
let nextGeneration = 1;
let nextRequestId = 1;

export type UseMsaAnalysisOptions = {
  /** Content-derived normalized SHA/FNV source identity, never a job token. */
  sourceFingerprint?: string;
  /** Backward-compatible alias used by AlignmentDescriptor. */
  sourceKey?: string;
  alphabet?: SequenceAlphabet;
  alignmentMode?: AlignmentMode;
  analysisScope?: AnalysisScope;
  /** Explicit membership for the selected/visible scope. Source row order wins. */
  scopeRowKeys?: Iterable<string>;
  visibleRowKeys?: Iterable<string>;
  selectedRowKeys?: Iterable<string>;
  referenceRowKey?: string | null;
  enabled?: boolean;
  overviewBinCount?: number;
  motifQuery?: string;
  motifMatchMode?: MotifMatchMode;
  motifStrandMode?: MotifStrandMode;
  maxMotifMatches?: number;
  motifDebounceMs?: number;
};

export function createMsaAnalysisCacheKey({
  sourceFingerprint,
  alignmentLength,
  alphabet,
  scope,
  scopeRowKeys,
  referenceRowKey,
  overviewBinCount
}: {
  sourceFingerprint: string;
  alignmentLength: number;
  alphabet?: SequenceAlphabet;
  scope: AnalysisScope;
  scopeRowKeys: readonly string[];
  referenceRowKey?: string | null;
  overviewBinCount: number;
}) {
  return JSON.stringify([
    "nucleotide-v2/column-store-v1",
    sourceFingerprint,
    alignmentLength,
    alphabet ?? "nucleotide",
    scope,
    scopeRowKeys,
    referenceRowKey ?? null,
    overviewBinCount
  ]);
}

function cachePeek(key: string) {
  return analysisCache.get(key)?.result ?? null;
}

function cacheGet(key: string) {
  const entry = analysisCache.get(key);
  if (!entry) {
    return null;
  }
  analysisCache.delete(key);
  analysisCache.set(key, entry);
  return entry.result;
}

function cacheSet(key: string, result: MsaAnalysisPayloadV4) {
  const prior = analysisCache.get(key);
  if (prior) {
    analysisCacheBytes -= prior.estimatedBytes;
    analysisCache.delete(key);
  }
  const entry = { result, estimatedBytes: estimateMsaAnalysisPayloadBytes(result) };
  if (entry.estimatedBytes > MAX_ANALYSIS_CACHE_BYTES) {
    return;
  }
  analysisCache.set(key, entry);
  analysisCacheBytes += entry.estimatedBytes;
  while (
    analysisCache.size > MAX_ANALYSIS_CACHE_ENTRIES ||
    analysisCacheBytes > MAX_ANALYSIS_CACHE_BYTES
  ) {
    const oldestKey = analysisCache.keys().next().value as string | undefined;
    if (oldestKey === undefined || (oldestKey === key && analysisCache.size === 1)) {
      break;
    }
    const oldest = analysisCache.get(oldestKey);
    analysisCache.delete(oldestKey);
    analysisCacheBytes -= oldest?.estimatedBytes ?? 0;
  }
}

export function clearMsaAnalysisCacheForTests() {
  analysisCache.clear();
  analysisCacheBytes = 0;
}

function asStringArray(value?: Iterable<string>) {
  return value ? Array.from(value) : [];
}

function disabledState(
  enabled: boolean,
  alignmentMode: AlignmentMode | undefined,
  alphabet: SequenceAlphabet | undefined,
  scope: AnalysisScope,
  rowCount: number
): { code: MsaAnalysisWorkerErrorCode; message: string } | null {
  if (
    alignmentMode === "neutral" ||
    alignmentMode === "rawUnequal" ||
    alphabet === "protein" ||
    alphabet === "unknown"
  ) {
    return {
      code: alignmentMode === "rawUnequal"
        ? "RAW_UNEQUAL_ALIGNMENT"
        : "ANALYSIS_DISABLED_NEUTRAL",
      message: alignmentMode === "rawUnequal"
        ? "Nucleotide analysis requires equal-length aligned sequences."
        : "Nucleotide analysis is unavailable for this neutral alignment."
    };
  }
  if (!enabled) {
    return {
      code: "ANALYSIS_DISABLED",
      message: "MSA analysis is disabled for this data source."
    };
  }
  if (scope !== "all" && rowCount === 0) {
    return {
      code: "ANALYSIS_EMPTY_SCOPE",
      message: "The selected analysis scope contains no sequences."
    };
  }
  return null;
}

export function useMsaAnalysis(
  sequences: MSASequence[],
  alignmentLength: number,
  motifQueryOrOptions: string | UseMsaAnalysisOptions = "",
  additionalOptions: UseMsaAnalysisOptions = {}
) {
  const options = typeof motifQueryOrOptions === "string"
    ? additionalOptions
    : motifQueryOrOptions;
  const motifQuery = typeof motifQueryOrOptions === "string"
    ? motifQueryOrOptions
    : options.motifQuery ?? "";
  const scope = options.analysisScope ?? "all";
  const explicitScopeRows = asStringArray(options.scopeRowKeys);
  const visibleRows = asStringArray(options.visibleRowKeys);
  const selectedRows = asStringArray(options.selectedRowKeys);
  const membershipRows = options.scopeRowKeys !== undefined
    ? explicitScopeRows
    : scope === "visible"
      ? visibleRows
      : scope === "selected"
        ? selectedRows
        : [];
  const membershipKey = JSON.stringify(membershipRows);
  const allRowKeys = useMemo(
    () => sequences.map((sequence, index) => rowKeyForSequence(sequence, index)),
    [sequences]
  );
  const rowIndexByKey = useMemo(
    () => new Map(allRowKeys.map((rowKey, index) => [rowKey, index])),
    [allRowKeys]
  );
  const scopedSequences = useMemo(() => {
    if (scope === "all") {
      return sequences;
    }
    const included = new Set<string>(JSON.parse(membershipKey) as string[]);
    return sequences.filter((_sequence, index) =>
      included.has(allRowKeys[index])
    );
  }, [allRowKeys, membershipKey, scope, sequences]);
  const scopeRowKeys = useMemo(() => {
    if (scope === "all") {
      return allRowKeys;
    }
    const included = new Set<string>(JSON.parse(membershipKey) as string[]);
    return allRowKeys.filter((rowKey) => included.has(rowKey));
  }, [allRowKeys, membershipKey, scope]);
  const scopeRowKey = JSON.stringify(scopeRowKeys);
  const providedFingerprint = options.sourceFingerprint ?? options.sourceKey;
  const fallbackFingerprint = useMemo(
    () => providedFingerprint ? null : canonicalAlignmentSourceKey(sequences),
    [providedFingerprint, sequences]
  );
  const sourceFingerprint = providedFingerprint ?? fallbackFingerprint!;
  const alphabet = options.alphabet;
  const referenceRowKey = options.referenceRowKey ?? null;
  const referenceSequence = useMemo(() => {
    if (!referenceRowKey) {
      return null;
    }
    const index = rowIndexByKey.get(referenceRowKey) ?? -1;
    return index >= 0 ? sequences[index] : null;
  }, [referenceRowKey, rowIndexByKey, sequences]);
  const overviewBinCount = Math.max(
    1,
    Math.trunc(options.overviewBinCount ?? 512)
  );
  const enabled = options.enabled ?? true;
  const disabled = disabledState(
    enabled,
    options.alignmentMode,
    alphabet,
    scope,
    scopedSequences.length
  );
  const cacheKey = createMsaAnalysisCacheKey({
    sourceFingerprint,
    alignmentLength,
    alphabet,
    scope,
    scopeRowKeys,
    referenceRowKey,
    overviewBinCount
  });
  const initial = disabled ? null : cachePeek(cacheKey);
  const [result, setResult] = useState<MsaAnalysisPayloadV4 | null>(initial);
  const [resultCacheKey, setResultCacheKey] = useState<string | null>(
    initial ? cacheKey : null
  );
  const [errorCacheKey, setErrorCacheKey] = useState<string | null>(
    disabled ? cacheKey : null
  );
  const [processingCacheKey, setProcessingCacheKey] = useState<string | null>(
    !disabled && !initial ? cacheKey : null
  );
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState<string | null>(
    disabled?.message ?? null
  );
  const [analysisErrorCode, setAnalysisErrorCode] =
    useState<MsaAnalysisWorkerErrorCode | null>(disabled?.code ?? null);
  const [progress, setProgress] = useState(initial ? 1 : 0);
  const [retryGeneration, setRetryGeneration] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const generationRef = useRef(0);
  const requestRef = useRef(0);

  useEffect(() => {
    const generation = nextGeneration++;
    const requestId = nextRequestId++;
    generationRef.current = generation;
    requestRef.current = requestId;

    if (disabled) {
      setResult(null);
      setResultCacheKey(null);
      setErrorCacheKey(cacheKey);
      setProcessingCacheKey(null);
      setAnalysisErrorMessage(disabled.message);
      setAnalysisErrorCode(disabled.code);
      setProgress(0);
      return;
    }

    const cached = cacheGet(cacheKey);
    if (cached) {
      // A cache hit is terminal: do not construct or initialize a Worker and do
      // not clone the alignment merely to tell a Worker to skip analysis.
      setResult(cached);
      setResultCacheKey(cacheKey);
      setErrorCacheKey(null);
      setProcessingCacheKey(null);
      setAnalysisErrorMessage(null);
      setAnalysisErrorCode(null);
      setProgress(1);
      return;
    }

    setResult(null);
    setResultCacheKey(null);
    setErrorCacheKey(null);
    setProcessingCacheKey(cacheKey);
    setAnalysisErrorMessage(null);
    setAnalysisErrorCode(null);
    setProgress(0);
    let cancelled = false;
    const request: Extract<MsaAnalysisWorkerRequest, { type: "analyze" }> = {
      protocolVersion: MSA_ANALYSIS_PROTOCOL_VERSION,
      type: "analyze",
      generation,
      requestId,
      sourceFingerprint,
      scope,
      scopeRowKeys,
      sequences: scopedSequences,
      alignmentLength,
      alphabet,
      referenceRowKey,
      referenceSequence,
      overviewBinCount
    };

    const complete = (payload: MsaAnalysisPayloadV4) => {
      if (cancelled) {
        return;
      }
      cacheSet(cacheKey, payload);
      setResult(payload);
      setResultCacheKey(cacheKey);
      setErrorCacheKey(null);
      setProcessingCacheKey(null);
      setAnalysisErrorMessage(null);
      setAnalysisErrorCode(null);
      setProgress(1);
      window.requestAnimationFrame(() => {
        markMsaPerformance(MSA_PERFORMANCE_MARKS.analysisCommitted);
      });
    };
    const fail = (
      error: unknown,
      explicitCode?: MsaAnalysisWorkerErrorCode,
      explicitMessage?: string
    ) => {
      if (cancelled) {
        return;
      }
      const normalized = explicitCode
        ? { code: explicitCode, message: explicitMessage ?? "MSA analysis failed" }
        : analysisWorkerError(error);
      setResult(null);
      setResultCacheKey(null);
      setErrorCacheKey(cacheKey);
      setProcessingCacheKey(null);
      setAnalysisErrorMessage(normalized.message);
      setAnalysisErrorCode(normalized.code);
      setProgress(0);
    };
    const calculateWithoutWorker = () => {
      try {
        complete(calculateMsaAnalysisPayloadV4(request));
      } catch (analysisError) {
        fail(analysisError);
      }
    };

    let fallbackTimeout: number | null = null;
    if (typeof Worker === "undefined") {
      if (import.meta.env.MODE === "test") {
        fallbackTimeout = window.setTimeout(calculateWithoutWorker, 0);
      } else {
        fail(null, "ANALYSIS_WORKER_UNAVAILABLE", "MSA analysis Worker is unavailable.");
      }
    } else {
      try {
        const worker = new Worker(
          new URL("../../workers/conservation.worker.ts", import.meta.url),
          { type: "module" }
        );
        workerRef.current = worker;
        markMsaPerformance(MSA_PERFORMANCE_MARKS.analysisWorkerStart);
        const closeWorker = () => {
          worker.terminate();
          if (workerRef.current === worker) {
            workerRef.current = null;
          }
        };
        worker.onmessage = (event: MessageEvent<MsaAnalysisWorkerResponse>) => {
          const response = event.data;
          if (
            cancelled ||
            response.protocolVersion !== MSA_ANALYSIS_PROTOCOL_VERSION ||
            response.generation !== generationRef.current ||
            response.requestId !== requestRef.current
          ) {
            return;
          }
          if (response.type === "analysisProgress") {
            setProgress(Math.max(0, Math.min(1, response.progress)));
          } else if (response.type === "analysisReady") {
            markMsaPerformance(MSA_PERFORMANCE_MARKS.analysisWorkerDone);
            try {
              assertMsaAnalysisPayloadV4(response.result);
              complete(response.result);
            } catch (payloadError) {
              fail(payloadError);
            }
            closeWorker();
          } else if (response.type === "analysisError") {
            fail(null, response.code, response.message);
            closeWorker();
          } else {
            fail(new MsaAnalysisWorkerError(
              "ANALYSIS_CANCELLED",
              "MSA analysis was cancelled."
            ));
            closeWorker();
          }
        };
        worker.onerror = () => {
          fail(new Error("MSA analysis worker failed"));
          closeWorker();
        };
        worker.postMessage(request);
      } catch {
        if (import.meta.env.MODE === "test") {
          fallbackTimeout = window.setTimeout(calculateWithoutWorker, 0);
        } else {
          fail(null, "ANALYSIS_WORKER_UNAVAILABLE", "MSA analysis Worker is unavailable.");
        }
      }
    }

    return () => {
      cancelled = true;
      if (fallbackTimeout !== null) {
        window.clearTimeout(fallbackTimeout);
      }
      const worker = workerRef.current;
      if (worker) {
        const cancel: MsaAnalysisWorkerRequest = {
          protocolVersion: MSA_ANALYSIS_PROTOCOL_VERSION,
          type: "cancel",
          generation,
          requestId
        };
        try {
          worker.postMessage(cancel);
        } catch {
          // terminate() below is the hard cancellation boundary.
        }
        worker.terminate();
        if (workerRef.current === worker) {
          workerRef.current = null;
        }
      }
    };
  }, [
    alignmentLength,
    alphabet,
    cacheKey,
    disabled?.code,
    disabled?.message,
    overviewBinCount,
    retryGeneration,
    referenceRowKey,
    referenceSequence,
    scope,
    scopeRowKey,
    scopedSequences,
    sourceFingerprint
  ]);

  const motif = useMotifSearch(scopedSequences, motifQuery, {
    sourceFingerprint,
    matchMode: options.motifMatchMode,
    strandMode: options.motifStrandMode,
    maxMatches: options.maxMotifMatches,
    debounceMs: options.motifDebounceMs,
    enabled: !disabled
  });
  const motifRowTotals = useMemo(
    () => Object.fromEntries(
      motif.rowTotals.map(({ rowKey, totalCount }) => [rowKey, totalCount])
    ) as Record<string, number>,
    [motif.rowTotals]
  );
  const activeResult = !disabled && resultCacheKey === cacheKey ? result : null;
  const getColumnStats = useCallback(
    (position: number) => activeResult
      ? columnStatsAtPosition(activeResult.columnStore, position)
      : null,
    [activeResult]
  );
  const activeAnalysisError = disabled
    ? disabled.message
    : errorCacheKey === cacheKey
      ? analysisErrorMessage
      : null;
  const activeAnalysisErrorCode = disabled
    ? disabled.code
    : errorCacheKey === cacheKey
      ? analysisErrorCode
      : null;
  const effectiveIsCalculating = !disabled && !activeResult && !activeAnalysisError;
  const activeProgress = activeResult
    ? 1
    : processingCacheKey === cacheKey
      ? progress
      : 0;
  const combinedError = activeAnalysisError ?? motif.error;

  return {
    columnStore: activeResult?.columnStore ?? null,
    columnCount: activeResult?.columnStore.length ?? 0,
    getColumnStats,
    overview: activeResult?.overview ?? null,
    overviewBins: activeResult?.overviewBins ?? [],
    rowQc: activeResult?.rowQc ?? [],
    consensus: activeResult?.consensus ?? { majority: "", iupac: "" },
    scope,
    scopeRowKeys,
    scopeRowCount: scopedSequences.length,
    semanticsVersion: activeResult?.semanticsVersion ?? "nucleotide-v2",
    sourceFingerprint,
    status: disabled
      ? "disabled" as const
      : effectiveIsCalculating
        ? "calculating" as const
        : activeAnalysisError
          ? "error" as const
          : "ready" as const,
    progress: activeProgress,
    retry: () => setRetryGeneration(value=>value+1),
    error: combinedError,
    errorCode: activeAnalysisErrorCode ?? motif.errorCode,
    analysisError: activeAnalysisError,
    analysisErrorCode: activeAnalysisErrorCode,
    isCalculating: effectiveIsCalculating,
    isSearchingMotif: motif.isSearching,
    motifMatches: motif.matches,
    motifColumnHitCounts: motif.columnHitCounts,
    motifColumnFirstRows: motif.columnFirstRows,
    motifMatchCount: motif.totalCount,
    motifRowTotals,
    motifRowTotalList: motif.rowTotals,
    motifMatchesTruncated: motif.truncated,
    motifError: motif.error,
    motifErrorCode: motif.errorCode,
    motifInvalidCharacters: motif.invalidCharacters
  };
}
