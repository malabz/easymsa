import type { InputProgress } from "../../features/msa-viewer/inputWorkerProtocol";
import { MsaInputError } from "../../features/msa-viewer/inputWorkerProtocol";
import { loadAlignmentInput } from "../../features/msa-viewer/useAlignmentInput";
import { EasyMsaApiError } from "./client";
import { resultFilename } from "../utils/downloadName";
import type { ResultStage } from "../types/job";
import { boundedRequest } from "./boundedRequest";
import { apiUrl } from "./client";
import { adaptServerAlignment } from "./serverAlignment";
export { adaptServerAlignment, ServerAlignmentPayloadError, ServerAlignmentPayloadSchema } from "./serverAlignment";
export type { ServerAlignmentPreview } from "./serverAlignment";
import type { MSAResult } from "../types/msa";
import type { ResultFile, ResultSummary } from "../types/result";

export type ServerResultSummary = {
  jobId: string;
  algorithm?: {
    name?: string | null;
    resolvedName?: string | null;
  };
  summary: {
    preprocess?: {
      mode?: string | null;
      strictness?: string | null;
      rawSequenceCount?: number | null;
      cleanSequenceCount?: number | null;
      removedSequenceCount?: number | null;
    };
    alignment?: {
      sequenceCount?: number | null;
      alignmentLength?: number | null;
      gapPercentage?: number | null;
      averageIdentity?: number | null;
    };
    outputFiles?: unknown;
  };
};

function jobPathSegment(jobId: string) {
  return encodeURIComponent(jobId);
}

function optionalNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function adaptServerSummary(payload: ServerResultSummary): ResultSummary {
  const alignment = payload.summary.alignment ?? {};
  const preprocess = payload.summary.preprocess ?? {};

  return {
    jobId: payload.jobId,
    algorithm: {
      name:
        typeof payload.algorithm?.name === "string"
          ? payload.algorithm.name
          : null,
      resolvedName:
        typeof payload.algorithm?.resolvedName === "string"
          ? payload.algorithm.resolvedName
          : null
    },
    metrics: {
      sequenceCount: optionalNumber(alignment.sequenceCount),
      alignmentLength: optionalNumber(alignment.alignmentLength),
      averageIdentity: optionalNumber(alignment.averageIdentity),
      gapPercentage: optionalNumber(alignment.gapPercentage)
    },
    preprocess: {
      mode: typeof preprocess.mode === "string" ? preprocess.mode : null,
      strictness:
        typeof preprocess.strictness === "string" ? preprocess.strictness : null,
      rawSequenceCount: optionalNumber(preprocess.rawSequenceCount),
      cleanSequenceCount: optionalNumber(preprocess.cleanSequenceCount),
      removedSequenceCount: optionalNumber(preprocess.removedSequenceCount)
    },
    outputFiles: Array.isArray(payload.summary.outputFiles)
      ? payload.summary.outputFiles.filter(
          (file): file is string => typeof file === "string"
        )
      : []
  };
}

export async function getResultSummary(
  jobId: string,
  token: string,
  signal?: AbortSignal,
  stage: ResultStage = "final"
): Promise<ResultSummary> {
  return boundedRequest(apiUrl(
      `/jobs/${jobPathSegment(jobId)}/results/summary?token=${encodeURIComponent(token)}${stage === "final" ? "" : `&stage=${stage}`}`
    ), { signal }, async response => adaptServerSummary(await response.json()), 60_000);
}

export async function getAlignmentResult(
  jobId: string,
  token: string,
  signal?: AbortSignal,
  stage: ResultStage = "final",
  progress?: (value: InputProgress | null) => void
): Promise<MSAResult> {
  const legacyUrl = apiUrl(`/jobs/${jobPathSegment(jobId)}/results/alignment?token=${encodeURIComponent(token)}${stage === "final" ? "" : `&stage=${stage}`}`);
  if (typeof Worker !== "undefined") {
    try {
      return await loadAlignmentInput({ sourceKind: "job", sourceName: jobId, payload: { kind: "url",
        url: apiUrl(`/jobs/${jobPathSegment(jobId)}/results/alignment/fasta?token=${encodeURIComponent(token)}&stage=${stage}`), legacyUrl } }, { signal, progress });
    } catch (error) {
      if (error instanceof MsaInputError && ["INPUT_EMPTY", "INPUT_DECODE_FAILED", "INPUT_INVALID_FASTA"].includes(error.code)) {
        throw new EasyMsaApiError({ code: "INCOMPATIBLE_RESULT", message: "This result format could not be read." });
      }
      throw error;
    }
  }
  return boundedRequest(legacyUrl, { signal }, async response => adaptServerAlignment(await response.json()), 60_000);
}

export function getDownloadFiles(jobId: string, token: string, stage: ResultStage = "final"): ResultFile[] {
  return [
    {
      name: resultFilename(jobId, stage, "all_results.zip"),
      kind: "archive",
      description: "",
      size: "",
      href: apiUrl(
        `/jobs/${jobPathSegment(jobId)}/download?token=${encodeURIComponent(token)}${stage === "final" ? "" : `&stage=${stage}`}`
      )
    },
    {
      name: resultFilename(jobId, stage, "alignment.fasta.gz"),
      kind: "alignment-gzip",
      description: "",
      size: "",
      href: apiUrl(
        `/jobs/${jobPathSegment(jobId)}/download/alignment/gz?token=${encodeURIComponent(token)}${stage === "final" ? "" : `&stage=${stage}`}`
      )
    },
    {
      name: resultFilename(jobId, stage, "alignment.fasta.gz.xz"),
      kind: "alignment-gzip-xz",
      description: "",
      size: "",
      href: apiUrl(
        `/jobs/${jobPathSegment(jobId)}/download/alignment/gz.xz?token=${encodeURIComponent(token)}${stage === "final" ? "" : `&stage=${stage}`}`
      )
    }
  ];
}
