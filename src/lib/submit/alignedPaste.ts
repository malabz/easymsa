import { parseFasta } from "../utils/fasta";
import { apiErrorMessage } from "../i18n/apiErrors";

/** Lightweight early feedback. Larger text and compressed uploads remain server-validated. */
export function validateAlignedPaste(input: string, locale: "zh" | "en"): { valid: boolean; message: string | null } {
  const fail = (code: string) => ({ valid: false, message: apiErrorMessage({ code }, locale) });
  if (!input.trim()) return fail("INPUT_REQUIRED");
  if (input.length > 1024 * 1024) return { valid: true, message: null };
  if (input.split(/\r?\n/).some(line => /^>\s*$/.test(line.trim()))) return fail("REALIGN_INVALID_ID");
  const parsed = parseFasta(input, 2, Infinity);
  if (parsed.sequenceCount < 2) return fail("REALIGN_TOO_FEW_SEQUENCES");
  if (!parsed.valid || parsed.records.length !== parsed.sequenceCount) return fail("REALIGN_INVALID_FASTA");
  const ids = new Set<string>();
  let length: number | undefined;
  let hasT = false, hasU = false;
  for (const record of parsed.records) {
    const id = record.id.split(/\s+/)[0];
    if (!id) return fail("REALIGN_INVALID_ID");
    if (ids.has(id)) return fail("REALIGN_DUPLICATE_ID");
    ids.add(id);
    const sequence = record.sequence.toUpperCase();
    if (!/^[ACGTU-]+$/.test(sequence)) return fail("REALIGN_INVALID_BASE");
    if (!sequence.replace(/-/g, "")) return fail("REALIGN_EMPTY_SEQUENCE");
    if (length !== undefined && length !== sequence.length) return fail("REALIGN_UNALIGNED_INPUT");
    length = sequence.length;
    hasT ||= sequence.includes("T"); hasU ||= sequence.includes("U");
  }
  return hasT && hasU ? fail("REALIGN_MIXED_ALPHABET") : { valid: true, message: null };
}
