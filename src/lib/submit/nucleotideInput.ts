import { MAX_FASTA_CHARACTERS, parseFasta } from "../utils/fasta";

export type InvalidNucleotide = { record: number; position: number; characters: string[] };
/** Submission policy only. Generic FASTA parsing and local viewing remain unrestricted. */
export function validateNucleotideSubmission(text: string, maxCharacters = MAX_FASTA_CHARACTERS) {
  const normalizedLines=text.replace(/^\uFEFF/, "").split(/\r?\n/).map(line=>line.trim());
  const { records: _records, ...parsed } = parseFasta(normalizedLines.join("\n"), 2, maxCharacters);
  const emptyHeader=normalizedLines.some(line=>line.startsWith(">")&&!line.slice(1).trim());
  let record = 0, position = 0;
  let invalid: InvalidNucleotide | null = null;
  for (const raw of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith(">")) { record++; position = 0; continue; }
    if (!record) continue;
    for (const character of line) {
      if (/\s/.test(character)) continue;
      position++;
      if (!/^[ACGTURYSWKMBDHVN.\-]$/i.test(character)) {
        if (!invalid) invalid = { record, position, characters: [] };
        if (invalid.record === record && !invalid.characters.includes(character) && invalid.characters.length < 12) invalid.characters.push(character);
      }
    }
    if (invalid) break;
  }
  return { ...parsed, characterCount:text.length, valid: parsed.valid && !invalid && !emptyHeader && text.length<=maxCharacters, invalid };
}

export function nucleotideMessage(issue: InvalidNucleotide, locale: "zh" | "en") {
  const characters = issue.characters.map(value => JSON.stringify(value)).join(locale === "zh" ? "、" : ", ");
  return locale === "zh"
    ? `第 ${issue.record} 条序列包含不支持的字符 ${characters}（首个位置 ${issue.position}）；仅支持 DNA / RNA 核酸序列，输入未被替换。`
    : `Sequence ${issue.record} contains unsupported characters ${characters} (first position ${issue.position}). Only DNA / RNA nucleotides are supported; your input was not changed.`;
}

export const canCheckInputFile = (file: File) => file.size <= 2 * 1024 * 1024 && /\.(?:fa|fas|fasta|fna|faa)$/i.test(file.name);
