import { useEffect, useState } from "react";
import type { MSASequence, SequenceAlphabet } from "../../lib/types/msa";
import type {
  ColumnRange,
  ConsensusMode,
  RangeStats
} from "./types";
import {
  MSA_RANGE_STATS_PROTOCOL_VERSION,
  calculateMsaRangeStatsTask,
  normalizeRangeStatsError
} from "./rangeStatsWorkerProtocol";
import type {
  MsaRangeStatsErrorCode,
  MsaRangeStatsWorkerRequest,
  MsaRangeStatsWorkerResponse
} from "./rangeStatsWorkerProtocol";

const MAX_RANGE_CACHE_ENTRIES = 8;
const rangeCache = new Map<string, RangeStats>();
let nextRangeRequestId = 1;

export type UseMsaRangeStatsOptions = {
  sourceFingerprint: string;
  scopeRowKeys: readonly string[];
  sequences: MSASequence[];
  range: ColumnRange | null;
  consensusMode: ConsensusMode;
  reference?: MSASequence | null;
  alphabet?: SequenceAlphabet;
  enabled?: boolean;
  debounceMs?: number;
};

export function createMsaRangeStatsCacheKey({
  sourceFingerprint,
  scopeRowKeys,
  range,
  consensusMode,
  reference,
  alphabet
}: Pick<
  UseMsaRangeStatsOptions,
  "sourceFingerprint" | "scopeRowKeys" | "range" | "consensusMode" | "reference" | "alphabet"
>) {
  return JSON.stringify([
    "nucleotide-v2-range",
    sourceFingerprint,
    scopeRowKeys,
    range?.start ?? null,
    range?.end ?? null,
    consensusMode,
    reference?.rowKey ?? null,
    alphabet ?? "nucleotide"
  ]);
}

function cacheGet(key: string) {
  const result = rangeCache.get(key);
  if (!result) {
    return null;
  }
  rangeCache.delete(key);
  rangeCache.set(key, result);
  return result;
}

function cacheSet(key: string, result: RangeStats) {
  rangeCache.delete(key);
  rangeCache.set(key, result);
  while (rangeCache.size > MAX_RANGE_CACHE_ENTRIES) {
    const oldest = rangeCache.keys().next().value as string | undefined;
    if (oldest === undefined) {
      break;
    }
    rangeCache.delete(oldest);
  }
}

export function clearMsaRangeStatsCacheForTests() {
  rangeCache.clear();
}

export function useMsaRangeStats(options: UseMsaRangeStatsOptions) {
  const enabled = (options.enabled ?? true) &&
    options.range !== null &&
    options.sequences.length > 0;
  const debounceMs = Math.max(0, Math.trunc(options.debounceMs ?? 150));
  const cacheKey = createMsaRangeStatsCacheKey(options);
  const initial = enabled ? rangeCache.get(cacheKey) ?? null : null;
  const [result, setResult] = useState<RangeStats | null>(initial);
  const [resultKey, setResultKey] = useState<string | null>(
    initial ? cacheKey : null
  );
  const [completedKey, setCompletedKey] = useState<string | null>(
    initial ? cacheKey : null
  );
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<MsaRangeStatsErrorCode | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !options.range) {
      setResult(null);
      setResultKey(null);
      setCompletedKey(null);
      setError(null);
      setErrorCode(null);
      setErrorKey(null);
      return;
    }
    const cached = cacheGet(cacheKey);
    if (cached) {
      setResult(cached);
      setResultKey(cacheKey);
      setCompletedKey(cacheKey);
      setError(null);
      setErrorCode(null);
      setErrorKey(null);
      return;
    }

    const requestId = nextRangeRequestId++;
    let cancelled = false;
    let worker: Worker | null = null;
    let fallbackTimer: number | null = null;
    setResult(null);
    setResultKey(null);
    setCompletedKey(null);
    setError(null);
    setErrorCode(null);
    setErrorKey(null);

    const request: Extract<MsaRangeStatsWorkerRequest, { type: "calculate" }> = {
      protocolVersion: MSA_RANGE_STATS_PROTOCOL_VERSION,
      type: "calculate",
      requestId,
      sourceFingerprint: options.sourceFingerprint,
      scopeRowKeys: [...options.scopeRowKeys],
      sequences: options.sequences,
      range: { ...options.range },
      consensusMode: options.consensusMode,
      reference: options.reference,
      alphabet: options.alphabet
    };
    const closeWorker = () => {
      worker?.terminate();
      worker = null;
    };
    const complete = (next: RangeStats | null) => {
      if (cancelled) {
        return;
      }
      if (next) {
        cacheSet(cacheKey, next);
      }
      setResult(next);
      setResultKey(cacheKey);
      setCompletedKey(cacheKey);
      setError(null);
      setErrorCode(null);
      setErrorKey(null);
    };
    const fail = (
      failure: unknown,
      explicitCode?: MsaRangeStatsErrorCode,
      explicitMessage?: string
    ) => {
      if (cancelled) {
        return;
      }
      const normalized = explicitCode
        ? { code: explicitCode, message: explicitMessage ?? "Range statistics failed" }
        : normalizeRangeStatsError(failure);
      setResult(null);
      setResultKey(null);
      setCompletedKey(null);
      setError(normalized.message);
      setErrorCode(normalized.code);
      setErrorKey(cacheKey);
    };
    const runFallback = () => {
      fallbackTimer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        try {
          complete(calculateMsaRangeStatsTask(request));
        } catch (failure) {
          fail(failure);
        }
      }, 0);
    };
    const debounceTimer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      if (typeof Worker === "undefined") {
        if (import.meta.env.MODE === "test") {
          runFallback();
        } else {
          fail(null, "RANGE_STATS_FAILED", "Range statistics Worker is unavailable.");
        }
        return;
      }
      try {
        worker = new Worker(
          new URL("../../workers/rangeStats.worker.ts", import.meta.url),
          { type: "module" }
        );
        worker.onmessage = (event: MessageEvent<MsaRangeStatsWorkerResponse>) => {
          const response = event.data;
          if (cancelled || response.requestId !== requestId) {
            return;
          }
          if (response.type === "rangeStatsReady") {
            complete(response.result);
          } else if (response.type === "rangeStatsError") {
            fail(null, response.code, response.message);
          } else {
            fail(null, "RANGE_STATS_CANCELLED", "Range statistics were cancelled.");
          }
          closeWorker();
        };
        worker.onerror = () => {
          fail(new Error("Range statistics worker failed"));
          closeWorker();
        };
        worker.postMessage(request);
      } catch {
        closeWorker();
        if (import.meta.env.MODE === "test") {
          runFallback();
        } else {
          fail(null, "RANGE_STATS_FAILED", "Range statistics Worker is unavailable.");
        }
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
      if (worker) {
        const cancel: MsaRangeStatsWorkerRequest = {
          protocolVersion: MSA_RANGE_STATS_PROTOCOL_VERSION,
          type: "cancel",
          requestId
        };
        try {
          worker.postMessage(cancel);
        } catch {
          // terminate() is the hard cancellation boundary.
        }
      }
      closeWorker();
    };
  }, [
    cacheKey,
    debounceMs,
    enabled,
    options.alphabet,
    options.consensusMode,
    options.range,
    options.reference,
    options.scopeRowKeys,
    options.sequences,
    options.sourceFingerprint
  ]);

  const activeResult = enabled && resultKey === cacheKey ? result : null;
  const completed = enabled && completedKey === cacheKey;
  const activeError = enabled && errorKey === cacheKey ? error : null;
  const activeErrorCode = enabled && errorKey === cacheKey ? errorCode : null;

  return {
    rangeStats: activeResult,
    isCalculating: enabled && !completed && !activeError,
    error: activeError,
    errorCode: activeErrorCode,
    status: !enabled
      ? "idle" as const
      : activeError
        ? "error" as const
        : completed
          ? "ready" as const
          : "calculating" as const
  };
}
