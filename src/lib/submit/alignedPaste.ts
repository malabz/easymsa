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
  for (let index = 0; index < parsed.records.length; index++) {
    const record = parsed.records[index];
    const id = record.id.split(/\s+/)[0];
    if (!id) return fail("REALIGN_INVALID_ID");
    if (ids.has(id)) return fail("REALIGN_DUPLICATE_ID");
    ids.add(id);
    const sequence = record.sequence.toUpperCase();
    if (!/^[ACGTU-]+$/.test(sequence)) {
      let firstPosition = 0;
      const badChars: string[] = [];
      for (let i = 0; i < record.sequence.length; i++) {
        const ch = record.sequence[i];
        if (!/^[ACGTU-]$/i.test(ch)) {
          if (!firstPosition) firstPosition = i + 1;
          if (!badChars.includes(ch) && badChars.length < 12) badChars.push(ch);
        }
      }
      const charsText = badChars.map(char => JSON.stringify(char)).join(locale === "zh" ? "、" : ", ");
      return {
        valid: false,
        message: locale === "zh"
          ? `第 ${index + 1} 条序列包含不支持的字符 ${charsText}（首个位置 ${firstPosition}）；仅支持 A、C、G、T/U 和缺口（-）。`
          : `Sequence ${index + 1} contains unsupported characters ${charsText} (first position ${firstPosition}). Use only A, C, G, T/U and gaps (-).`
      };
    }
    if (!sequence.replace(/-/g, "")) return fail("REALIGN_EMPTY_SEQUENCE");
    if (length !== undefined && length !== sequence.length) return fail("REALIGN_UNALIGNED_INPUT");
    length = sequence.length;
    hasT ||= sequence.includes("T"); hasU ||= sequence.includes("U");
  }
  return hasT && hasU ? fail("REALIGN_MIXED_ALPHABET") : { valid: true, message: null };
}
