import { apiUrl, parseApiError } from "./client";
import { z } from "zod";
import {
  buildAlignmentDescriptor,
  canonicalAlignmentSource,
  canonicalAlignmentSourceKey,
  sha256Hex,
  withStableRowKeys
} from "../../features/msa-viewer/alignmentModel";
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

const safeSequenceText = z.string().refine(
  (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value),
  { message: "Sequence contains unsupported control characters." }
);

export const ServerAlignmentPayloadSchema = z.object({
  jobId: z.string().trim().min(1),
  truncated: z.boolean(),
  sequenceCount: z.number().int().nonnegative().nullable(),
  alignmentLength: z.number().int().nonnegative().nullable(),
  sequences: z.array(z.object({
    id: z.string(),
    sequence: safeSequenceText
  })),
  message: z.string().optional()
}).strict();

export type ServerAlignmentPreview = z.infer<typeof ServerAlignmentPayloadSchema>;

export class ServerAlignmentPayloadError extends Error {
  readonly code = "INVALID_SERVER_ALIGNMENT_PAYLOAD" as const;

  constructor() {
    super("INVALID_SERVER_ALIGNMENT_PAYLOAD");
    this.name = "ServerAlignmentPayloadError";
  }
}

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

export async function adaptServerAlignment(
  rawPayload: unknown
): Promise<MSAResult> {
  const parsed = ServerAlignmentPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new ServerAlignmentPayloadError();
  }
  const payload = parsed.data;
  const canonicalSource = canonicalAlignmentSource(payload.sequences);
  let alignmentSha256: string | undefined;
  try {
    alignmentSha256 = await sha256Hex(canonicalSource);
  } catch {
    // Web Crypto is available in supported browsers. Keeping a deterministic
    // local key here lets neutral browsing continue in older test/webview
    // environments without mislabelling it as a SHA-256 provenance hash.
  }
  const sourceKey = alignmentSha256
    ? `sha256:${alignmentSha256}`
    : canonicalAlignmentSourceKey(payload.sequences);
  const sequences = withStableRowKeys(payload.sequences, sourceKey);
  const descriptor = buildAlignmentDescriptor(sequences, {
    sourceKind: "job",
    sourceName: payload.jobId,
    sourceKey,
    alignmentSha256,
    declaredDimensions: {
      sequenceCount: payload.sequenceCount,
      alignmentLength: payload.alignmentLength
    }
  });
  const observedSequenceCount = descriptor.observedDimensions.sequenceCount;
  const observedAlignmentLength = descriptor.observedDimensions.alignmentLength;
  if (
    (payload.sequenceCount !== null && payload.sequenceCount !== observedSequenceCount) ||
    (payload.alignmentLength !== null && payload.alignmentLength !== observedAlignmentLength)
  ) {
    descriptor.warnings.push("SERVER_DIMENSION_MISMATCH");
  }
  if (payload.truncated) {
    descriptor.warnings.push("preview_truncated");
  }

  return {
    jobId: payload.jobId,
    truncated: payload.truncated,
    message: payload.message,
    sequenceCount: observedSequenceCount,
    alignmentLength: observedAlignmentLength,
    sequences,
    descriptor
  };
}

export async function getResultSummary(
  jobId: string,
  token: string,
  signal?: AbortSignal
): Promise<ResultSummary> {
  const response = await fetch(
    apiUrl(
      `/jobs/${jobPathSegment(jobId)}/results/summary?token=${encodeURIComponent(token)}`
    ),
    { signal }
  );

  if (!response.ok) {
    throw await parseApiError(response, "Failed to load result summary");
  }

  return adaptServerSummary(await response.json());
}

export async function getAlignmentResult(
  jobId: string,
  token: string,
  signal?: AbortSignal
): Promise<MSAResult> {
  const response = await fetch(
    apiUrl(
      `/jobs/${jobPathSegment(jobId)}/results/alignment?token=${encodeURIComponent(token)}`
    ),
    { signal }
  );

  if (!response.ok) {
    throw await parseApiError(response, "Failed to load alignment result");
  }

  return adaptServerAlignment(await response.json());
}

export function getDownloadFiles(jobId: string, token: string): ResultFile[] {
  return [
    {
      name: "all_results.zip",
      description: "Compressed result archive from the EasyMSA server",
      size: "remote",
      href: apiUrl(
        `/jobs/${jobPathSegment(jobId)}/download?token=${encodeURIComponent(token)}`
      )
    },
    {
      name: "alignment.fasta.gz",
      description: "Gzip-compressed alignment FASTA",
      size: "remote",
      href: apiUrl(
        `/jobs/${jobPathSegment(jobId)}/download/alignment/gz?token=${encodeURIComponent(token)}`
      )
    },
    {
      name: "alignment.fasta.gz.xz",
      description: "Gzip alignment FASTA additionally compressed with xz",
      size: "remote",
      href: apiUrl(
        `/jobs/${jobPathSegment(jobId)}/download/alignment/gz.xz?token=${encodeURIComponent(token)}`
      )
    }
  ];
}
