import { useEffect, useMemo, useState } from "react";
import {
  calculateConservationColumns,
  type ConservationColumn
} from "./conservation";

const WORKER_CELL_THRESHOLD = 250_000;

export function useConservationColumns(
  jobId: string,
  sequences: Array<{ sequence: string }>,
  alignmentLength: number
) {
  const shouldUseWorker = sequences.length * alignmentLength > WORKER_CELL_THRESHOLD;
  const synchronousColumns = useMemo(
    () =>
      shouldUseWorker
        ? null
        : calculateConservationColumns(sequences, alignmentLength),
    [alignmentLength, sequences, shouldUseWorker]
  );
  const [workerResult, setWorkerResult] = useState<{
    jobId: string;
    sequences: Array<{ sequence: string }>;
    alignmentLength: number;
    columns: ConservationColumn[];
  } | null>(null);

  useEffect(() => {
    if (!shouldUseWorker) {
      return;
    }

    if (typeof Worker === "undefined") {
      const timeout = window.setTimeout(() => {
        setWorkerResult({
          jobId,
          sequences,
          alignmentLength,
          columns: calculateConservationColumns(sequences, alignmentLength)
        });
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const worker = new Worker(
      new URL("../../workers/conservation.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (event: MessageEvent<ConservationColumn[]>) => {
      setWorkerResult({ jobId, sequences, alignmentLength, columns: event.data });
      worker.terminate();
    };
    worker.postMessage({ sequences, alignmentLength });

    return () => worker.terminate();
  }, [alignmentLength, jobId, sequences, shouldUseWorker]);

  const hasCurrentWorkerResult =
    workerResult?.jobId === jobId &&
    workerResult?.sequences === sequences &&
    workerResult?.alignmentLength === alignmentLength;

  const columns = synchronousColumns ?? (
    hasCurrentWorkerResult ? workerResult.columns : []
  );

  return {
    columns,
    isCalculating: shouldUseWorker && !hasCurrentWorkerResult
  };
}
