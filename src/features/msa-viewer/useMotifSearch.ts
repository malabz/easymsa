import { useEffect, useMemo, useRef, useState } from "react";
import type { MSASequence } from "../../lib/types/msa";
import { validateIupacMotif } from "./analysis";
import {
  canonicalAlignmentSourceKey,
  rowKeyForSequence
} from "./alignmentModel";
import {
  DEFAULT_MAX_STORED_MOTIF_MATCHES,
  MOTIF_WORKER_PROTOCOL_VERSION,
  calculateMotifSearchPayload,
  motifWorkerError
} from "./motifWorkerProtocol";
import type {
  MotifSearchPayloadV2,
  MotifWorkerErrorCode,
  MotifWorkerRequest,
  MotifWorkerResponse
} from "./motifWorkerProtocol";
import type { MotifMatchMode, MotifStrandMode } from "./types";

const MAX_MOTIF_CACHE_ENTRIES = 8;
const motifCache = new Map<string, MotifSearchPayloadV2>();
let nextMotifRequestId = 1;

export type UseMotifSearchOptions = {
  sourceFingerprint?: string;
  matchMode?: MotifMatchMode;
  strandMode?: MotifStrandMode;
  maxMatches?: number;
  debounceMs?: number;
  enabled?: boolean;
};

function cacheGet(key: string) {
  const cached = motifCache.get(key);
  if (!cached) {
    return null;
  }
  motifCache.delete(key);
  motifCache.set(key, cached);
  return cached;
}

function cacheSet(key: string, value: MotifSearchPayloadV2) {
  motifCache.delete(key);
  motifCache.set(key, value);
  while (motifCache.size > MAX_MOTIF_CACHE_ENTRIES) {
    const oldest = motifCache.keys().next().value as string | undefined;
    if (oldest === undefined) {
      break;
    }
    motifCache.delete(oldest);
  }
}

export function clearMotifSearchCacheForTests() {
  motifCache.clear();
}

export function useMotifSearch(
  sequences: MSASequence[],
  motifQuery: string,
  options: UseMotifSearchOptions = {}
) {
  const matchMode = options.matchMode ?? "strict";
  const strandMode = options.strandMode ?? "forward";
  const maxMatches = Math.max(
    0,
    Math.trunc(options.maxMatches ?? DEFAULT_MAX_STORED_MOTIF_MATCHES)
  );
  const debounceMs = Math.max(0, Math.trunc(options.debounceMs ?? 180));
  const enabled = options.enabled ?? true;
  const validation = useMemo(() => validateIupacMotif(motifQuery), [motifQuery]);
  const providedFingerprint = options.sourceFingerprint;
  const fallbackFingerprint = useMemo(
    () => providedFingerprint || !enabled || !validation.valid || !validation.query
      ? null
      : canonicalAlignmentSourceKey(sequences),
    [enabled, providedFingerprint, sequences, validation.query, validation.valid]
  );
  const sourceFingerprint = providedFingerprint ?? fallbackFingerprint ?? "motif-inactive";
  const rowOrder = useMemo(
    () => sequences.map((sequence, index) =>
      rowKeyForSequence(sequence, index)
    ),
    [sequences]
  );
  const rowOrderKey = JSON.stringify(rowOrder);
  const cacheKey = JSON.stringify([
    sourceFingerprint,
    rowOrder,
    validation.query,
    matchMode,
    strandMode,
    maxMatches
  ]);
  const cached = validation.valid && validation.query
    ? motifCache.get(cacheKey) ?? null
    : null;
  const [result, setResult] = useState<MotifSearchPayloadV2 | null>(cached);
  const [resultCacheKey, setResultCacheKey] = useState<string | null>(
    cached ? cacheKey : null
  );
  const [errorCacheKey, setErrorCacheKey] = useState<string | null>(
    validation.valid ? null : cacheKey
  );
  const [error, setError] = useState<string | null>(
    validation.valid ? null : validation.error
  );
  const [errorCode, setErrorCode] = useState<MotifWorkerErrorCode | null>(
    validation.valid ? null : "MOTIF_INVALID"
  );
  const [invalidCharacters, setInvalidCharacters] = useState<string[]>(
    validation.invalidCharacters
  );
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const requestId = nextMotifRequestId++;
    const currentValidation = validateIupacMotif(motifQuery);
    const stopWorker = () => {
      const worker = workerRef.current;
      if (!worker) {
        return;
      }
      const cancel: MotifWorkerRequest = {
        protocolVersion: MOTIF_WORKER_PROTOCOL_VERSION,
        type: "cancel",
        requestId
      };
      try {
        worker.postMessage(cancel);
      } catch {
        // Termination below remains the authoritative cancellation mechanism.
      }
      worker.terminate();
      if (workerRef.current === worker) {
        workerRef.current = null;
      }
    };

    stopWorker();
    if (!enabled || !currentValidation.query) {
      setResult(null);
      setResultCacheKey(null);
      setErrorCacheKey(null);
      setError(null);
      setErrorCode(null);
      setInvalidCharacters([]);
      return stopWorker;
    }
    if (!currentValidation.valid) {
      setResult(null);
      setResultCacheKey(null);
      setErrorCacheKey(cacheKey);
      setError(currentValidation.error);
      setErrorCode("MOTIF_INVALID");
      setInvalidCharacters(currentValidation.invalidCharacters);
      return stopWorker;
    }

    const cachedResult = cacheGet(cacheKey);
    if (cachedResult) {
      setResult(cachedResult);
      setResultCacheKey(cacheKey);
      setErrorCacheKey(null);
      setError(null);
      setErrorCode(null);
      setInvalidCharacters([]);
      return stopWorker;
    }

    setResult(null);
    setResultCacheKey(null);
    setErrorCacheKey(null);
    setError(null);
    setErrorCode(null);
    setInvalidCharacters([]);

    let cancelled = false;
    const request: Extract<MotifWorkerRequest, { type: "search" }> = {
      protocolVersion: MOTIF_WORKER_PROTOCOL_VERSION,
      type: "search",
      requestId,
      sourceFingerprint,
      sequences,
      query: currentValidation.query,
      matchMode,
      strandMode,
      maxMatches
    };
    const complete = (payload: MotifSearchPayloadV2) => {
      if (cancelled) {
        return;
      }
      cacheSet(cacheKey, payload);
      setResult(payload);
      setResultCacheKey(cacheKey);
      setErrorCacheKey(null);
      setError(null);
      setErrorCode(null);
      setInvalidCharacters([]);
    };
    const fail = (
      searchError: unknown,
      explicit?: {
        code: MotifWorkerErrorCode;
        message: string;
        invalidCharacters?: string[];
      }
    ) => {
      if (cancelled) {
        return;
      }
      const normalized = explicit ?? motifWorkerError(searchError);
      setResult(null);
      setResultCacheKey(null);
      setErrorCacheKey(cacheKey);
      setError(normalized.message);
      setErrorCode(normalized.code);
      setInvalidCharacters(normalized.invalidCharacters ?? []);
    };

    const timeout = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      if (typeof Worker === "undefined") {
        if (import.meta.env.MODE === "test") {
          try {
            complete(calculateMotifSearchPayload(request));
          } catch (searchError) {
            fail(searchError);
          }
        } else {
          fail(new Error("Motif search Worker is unavailable"));
        }
        return;
      }
      try {
        const worker = new Worker(
          new URL("../../workers/motif.worker.ts", import.meta.url),
          { type: "module" }
        );
        workerRef.current = worker;
        worker.onmessage = (event: MessageEvent<MotifWorkerResponse>) => {
          if (cancelled || event.data.requestId !== requestId) {
            return;
          }
          const response = event.data;
          if (response.type === "motifReady") {
            complete(response.result);
            worker.terminate();
            if (workerRef.current === worker) {
              workerRef.current = null;
            }
          } else if (response.type === "motifError") {
            fail(null, {
              code: response.code,
              message: response.message,
              invalidCharacters: response.invalidCharacters
            });
            worker.terminate();
            if (workerRef.current === worker) {
              workerRef.current = null;
            }
          } else {
          }
        };
        worker.onerror = () => {
          fail(new Error("Motif search worker failed"));
          worker.terminate();
          if (workerRef.current === worker) {
            workerRef.current = null;
          }
        };
        worker.postMessage(request);
      } catch (workerError) {
        if (import.meta.env.MODE === "test") {
          try {
            complete(calculateMotifSearchPayload(request));
          } catch (searchError) {
            fail(searchError instanceof Error ? searchError : workerError);
          }
        } else {
          fail(workerError);
        }
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      stopWorker();
    };
  }, [
    cacheKey,
    debounceMs,
    enabled,
    matchMode,
    maxMatches,
    motifQuery,
    rowOrderKey,
    sequences,
    sourceFingerprint,
    strandMode
  ]);

  const activeResult = enabled && validation.valid && Boolean(validation.query) &&
    resultCacheKey === cacheKey
    ? result
    : null;
  const activeError = !enabled || !validation.query
    ? null
    : !validation.valid
      ? validation.error
      : errorCacheKey === cacheKey
        ? error
        : null;
  const activeErrorCode = !enabled || !validation.query
    ? null
    : !validation.valid
      ? "MOTIF_INVALID" as const
      : errorCacheKey === cacheKey
        ? errorCode
        : null;
  const activeInvalidCharacters = !validation.valid
    ? validation.invalidCharacters
    : errorCacheKey === cacheKey
      ? invalidCharacters
      : [];
  const effectiveIsSearching = Boolean(
    enabled && validation.valid && validation.query && !activeResult && !activeError
  );

  return {
    matches: activeResult?.matches ?? [],
    totalCount: activeResult?.totalCount ?? 0,
    rowTotals: activeResult?.rowTotals ?? [],
    truncated: activeResult?.truncated ?? false,
    normalizedQuery: validation.query,
    isSearching: effectiveIsSearching,
    error: activeError,
    errorCode: activeErrorCode,
    invalidCharacters: activeInvalidCharacters
  };
}
