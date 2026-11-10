import { z } from "zod";
import {
  buildAlignmentDescriptor,
  canonicalAlignmentSource,
  canonicalAlignmentSourceKey,
  sha256Hex,
  withStableRowKeys
} from "../../features/msa-viewer/alignmentModel";
import type { MSAResult } from "../types/msa";

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
    header: z.string().optional(),
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

export async function adaptServerAlignment(
  rawPayload: unknown
): Promise<MSAResult> {
  const parsed = ServerAlignmentPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new ServerAlignmentPayloadError();
  }
  const payload = { ...parsed.data, sequences: parsed.data.sequences.map(row => ({
    id: row.header ?? row.id, sequence: row.sequence
  })) };
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
