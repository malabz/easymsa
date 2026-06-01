import { apiUrl, parseApiError } from "./client";
import type { MSAResult } from "../types/msa";
import type { ResultFile, ResultSummary } from "../types/result";

type ServerResultSummary = {
  jobId: string;
  summary: {
    alignment?: {
      sequenceCount?: number;
      alignmentLength?: number;
      gapPercentage?: number;
      averageIdentity?: number;
    };
    outputSizeMB?: number;
  };
};

type ServerAlignmentPreview = {
  jobId: string;
  truncated: boolean;
  sequenceCount: number | null;
  alignmentLength: number | null;
  sequences: MSAResult["sequences"];
  message?: string;
};

function jobPathSegment(jobId: string) {
  return encodeURIComponent(jobId);
}

function consensusFromSequences(sequences: MSAResult["sequences"], length: number | null) {
  if (!sequences.length || !length) {
    return "";
  }

  const consensus: string[] = [];

  for (let index = 0; index < length; index += 1) {
    const counts = new Map<string, number>();

    for (const sequence of sequences) {
      const base = sequence.sequence[index] ?? "-";
      counts.set(base, (counts.get(base) ?? 0) + 1);
    }

    consensus.push(
      Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-"
    );
  }

  return consensus.join("");
}

function adaptServerSummary(payload: ServerResultSummary): ResultSummary {
  const alignment = payload.summary.alignment ?? {};

  return {
    jobId: payload.jobId,
    metrics: {
      sequenceCount: alignment.sequenceCount ?? 0,
      alignmentLength: alignment.alignmentLength ?? 0,
      averageIdentity: alignment.averageIdentity ?? null,
      gapPercentage: alignment.gapPercentage ?? null,
      outputSizeMB: payload.summary.outputSizeMB ?? null
    }
  };
}

function adaptServerAlignment(payload: ServerAlignmentPreview): MSAResult {
  return {
    jobId: payload.jobId,
    truncated: payload.truncated,
    message: payload.message,
    sequenceCount: payload.sequenceCount,
    alignmentLength: payload.alignmentLength,
    sequences: payload.sequences,
    consensus: consensusFromSequences(payload.sequences, payload.alignmentLength)
  };
}

export async function getResultSummary(
  jobId: string,
  token: string
): Promise<ResultSummary> {
  const response = await fetch(
    apiUrl(
      `/jobs/${jobPathSegment(jobId)}/results/summary?token=${encodeURIComponent(token)}`
    )
  );

  if (!response.ok) {
    throw await parseApiError(response, "Failed to load result summary");
  }

  return adaptServerSummary(await response.json());
}

export async function getAlignmentResult(
  jobId: string,
  token: string
): Promise<MSAResult> {
  const response = await fetch(
    apiUrl(
      `/jobs/${jobPathSegment(jobId)}/results/alignment?token=${encodeURIComponent(token)}`
    )
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
    }
  ];
}
