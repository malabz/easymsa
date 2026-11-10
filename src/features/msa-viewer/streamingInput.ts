import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { parseApiError, EasyMsaApiError } from "../../lib/api/client";
import type { MSASequence, MSAResult } from "../../lib/types/msa";
import { buildAlignmentDescriptor, canonicalAlignmentSourceKey, normalizeAlignmentSequence, withStableRowKeys } from "./alignmentModel";
import { MsaInputError, type InputProgress, type MsaInputWorkerRequest } from "./inputWorkerProtocol";

/** Incremental FASTA reader. At most one unfinished line and one row are joined. */
export async function readAlignmentStream(request: MsaInputWorkerRequest, progress?: (value: InputProgress) => void): Promise<MSAResult> {
  const { payload } = request;
  let stream: ReadableStream<Uint8Array>;
  let total: number | undefined;
  if (payload.kind === "file") {
    total = payload.file.size;
    // Fixed slices also work in browsers whose Blob.stream() uses tiny chunks.
    let offset = 0;
    stream = new ReadableStream({ async pull(controller) {
      if (offset >= payload.file.size) { controller.close(); return; }
      const end = Math.min(offset + 1024 * 1024, payload.file.size);
      controller.enqueue(new Uint8Array(await payload.file.slice(offset, end).arrayBuffer()));
      offset = end;
    } });
  } else if (payload.kind === "url") {
    let response: Response;
    try { response = await fetch(payload.url); }
    catch { throw new EasyMsaApiError({ code: "NETWORK_FAILURE", message: "Check your connection and retry." }); }
    if (!response.ok) throw await parseApiError(response, "The alignment could not be read.");
    if (!response.body) throw new MsaInputError("INPUT_EMPTY");
    stream = response.body;
    // Content-Length describes compressed bytes when Content-Encoding is set.
    if (!response.headers.get("content-encoding")) total = Number(response.headers.get("content-length")) || undefined;
  } else {
    const blob = new Blob([payload.kind === "text" ? payload.text : payload.bytes]);
    stream = blob.stream(); total = blob.size;
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const rawHash = request.sourceKind === "local-file" ? sha256.create() : null;
  const canonicalHash = sha256.create();
  const encoder = new TextEncoder();
  canonicalHash.update(encoder.encode('{"schema":"easymsa-canonical-alignment-v1","rows":['));
  const sequences: MSASequence[] = [];
  let header: string | null = null, parts: string[] = [], pending = "", bytes = 0, hadText = false, hadDot = false;
  const finishRow = () => {
    if (header === null) return;
    const original = parts.join("");
    if (!original) throw new MsaInputError("INPUT_INVALID_FASTA");
    hadDot ||= original.includes(".");
    const sequence = normalizeAlignmentSequence(original);
    const id = header || `sequence_${sequences.length + 1}`;
    // Exactly the canonical-v1 JSON bytes, including escaping and duplicate titles.
    canonicalHash.update(encoder.encode((sequences.length ? "," : "") + JSON.stringify([id, sequence])));
    sequences.push({ id, sequence }); parts = [];
  };
  const line = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const firstLine = !hadText;
    hadText = true;
    // Match the existing local parser's column-zero record separators. Server
    // artifacts previously used the lenient reader, which also trims headers.
    if (trimmed.startsWith(">") && (firstLine || value.startsWith(">") || request.sourceKind === "job")) { finishRow(); header = trimmed.slice(1).trim(); }
    else {
      if (header === null || (request.sourceKind === "job" && /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))) throw new MsaInputError("INPUT_INVALID_FASTA");
      parts.push(trimmed.replace(/\s/g, ""));
    }
  };
  const reader = stream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength; rawHash?.update(value);
      let decoded: string;
      try { decoded = decoder.decode(value, { stream: true }); }
      catch { throw new MsaInputError("INPUT_DECODE_FAILED"); }
      pending += decoded;
      let start = 0, end: number;
      while ((end = pending.indexOf("\n", start)) !== -1) { line(pending.slice(start, end)); start = end + 1; }
      pending = pending.slice(start);
      progress?.({ stage: "parsing", bytes, total });
    }
    try { pending += decoder.decode(); } catch { throw new MsaInputError("INPUT_DECODE_FAILED"); }
    line(pending); finishRow();
  } catch (error) {
    if (error instanceof MsaInputError) throw error;
    if (payload.kind === "url") throw new EasyMsaApiError({ code: "NETWORK_FAILURE", message: "The connection was interrupted. Retry loading the alignment." });
    throw error;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  if (!hadText) throw new MsaInputError("INPUT_EMPTY");
  if (!sequences.length) throw new MsaInputError("INPUT_INVALID_FASTA");
  progress?.({ stage: "preparing", bytes, total });
  canonicalHash.update(encoder.encode("]}"));
  // Keep pre-existing workspace identities in older non-WebCrypto webviews.
  const alignmentSha256 = globalThis.crypto?.subtle ? bytesToHex(canonicalHash.digest()) : undefined;
  const sourceKey = alignmentSha256 ? `sha256:${alignmentSha256}` : canonicalAlignmentSourceKey(sequences);
  const descriptor = buildAlignmentDescriptor(sequences, {
    sourceKind: request.sourceKind, sourceName: request.sourceName, sourceKey,
    declaredAlphabet: request.declaredAlphabet, alignmentSha256,
    rawSha256: rawHash && alignmentSha256 ? bytesToHex(rawHash.digest()) : undefined
  });
  if (hadDot) {
    const duplicate = descriptor.warnings.indexOf("duplicate_headers");
    descriptor.warnings.splice(duplicate < 0 ? descriptor.warnings.length : duplicate, 0, "dot_gap_normalized");
  }
  return { jobId: request.sourceName, truncated: false, sequences: withStableRowKeys(sequences, sourceKey),
    alignmentLength: descriptor.alignmentLength, sequenceCount: sequences.length, descriptor };
}
