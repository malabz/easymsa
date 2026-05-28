export type FastaValidationResult = {
  valid: boolean;
  sequenceCount: number;
  characterCount: number;
  errors: string[];
};

export const MAX_FASTA_CHARACTERS = 200_000;

export function estimateFastaSequenceCount(input: string): number {
  return input
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith(">")).length;
}

export function validateFasta(input: string): FastaValidationResult {
  const characterCount = input.length;
  const trimmed = input.trim();
  const errors: string[] = [];

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

  if (trimmed && sequenceCount < 2) {
    errors.push("At least two sequences are required.");
  }

  for (const record of records) {
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
    }
  }

  return {
    valid: errors.length === 0,
    sequenceCount,
    characterCount,
    errors: Array.from(new Set(errors))
  };
}
