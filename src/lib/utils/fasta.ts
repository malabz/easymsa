export type FastaValidationResult = {
  valid: boolean;
  sequenceCount: number;
  characterCount: number;
  errors: string[];
};

export type ParsedFastaRecord = {
  id: string;
  sequence: string;
};

export type FastaParseResult = FastaValidationResult & {
  records: ParsedFastaRecord[];
};

export const MAX_FASTA_CHARACTERS = 200_000;

export function estimateFastaSequenceCount(input: string): number {
  return input
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith(">")).length;
}

export function parseFasta(input: string, minSequences = 2): FastaParseResult {
  const characterCount = input.length;
  const trimmed = input.trim();
  const errors: string[] = [];
  const parsedRecords: ParsedFastaRecord[] = [];

  if (!trimmed) {
    errors.push("Input is empty.");
  }

  if (characterCount > MAX_FASTA_CHARACTERS) {
    errors.push("Input exceeds 200,000 characters.");
  }

  if (trimmed && !trimmed.includes(">")) {
    errors.push("FASTA headers must begin with >.");
  }

  const records = trimmed
    .split(/\n(?=>)/)
    .map((record) => record.trim())
    .filter(Boolean);

  const sequenceCount = estimateFastaSequenceCount(trimmed);

  if (trimmed && sequenceCount < minSequences) {
    errors.push(
      minSequences === 1
        ? "At least one sequence is required."
        : "At least two sequences are required."
    );
  }

  for (const [recordIndex, record] of records.entries()) {
    const lines = record
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines[0]?.startsWith(">")) {
      errors.push("Every record must start with a FASTA header.");
      continue;
    }

    if (lines.length < 2) {
      errors.push(`Record ${lines[0]} has no sequence content.`);
      continue;
    }

    const sequence = lines.slice(1).join("").replace(/\s/g, "");
    if (!sequence) {
      errors.push(`Record ${lines[0]} has no sequence content.`);
      continue;
    }

    parsedRecords.push({
      id: lines[0].replace(/^>\s*/, "").trim() || `sequence_${recordIndex + 1}`,
      sequence
    });
  }

  return {
    valid: errors.length === 0,
    sequenceCount,
    characterCount,
    errors: Array.from(new Set(errors)),
    records: parsedRecords
  };
}

export function validateFasta(input: string): FastaValidationResult {
  const { valid, sequenceCount, characterCount, errors } = parseFasta(input, 2);

  return {
    valid,
    sequenceCount,
    characterCount,
    errors
  };
}
