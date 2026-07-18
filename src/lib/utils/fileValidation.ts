export type FileValidationResult = {
  valid: boolean;
  errors: string[];
};

export const MAX_INPUT_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export const ALLOWED_INPUT_EXTENSIONS = [
  ".fasta",
  ".fa",
  ".fna",
  ".ffn",
  ".faa",
  ".fas",
  ".aln",
  ".txt",
  ".fasta.gz",
  ".fa.gz",
  ".fna.gz",
  ".ffn.gz",
  ".faa.gz",
  ".fas.gz",
  ".aln.gz",
  ".txt.gz",
  ".fasta.xz",
  ".fa.xz",
  ".fna.xz",
  ".ffn.xz",
  ".faa.xz",
  ".fas.xz",
  ".aln.xz",
  ".txt.xz",
  ".fasta.bz2",
  ".fa.bz2",
  ".fna.bz2",
  ".ffn.bz2",
  ".faa.bz2",
  ".fas.bz2",
  ".aln.bz2",
  ".txt.bz2",
  ".zip",
  ".tar",
  ".tar.gz",
  ".tgz",
  ".tar.xz",
  ".txz",
  ".tar.bz2",
  ".tbz2"
] as const;

export function validateInputFile(file: File): FileValidationResult {
  const errors: string[] = [];
  const name = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_INPUT_EXTENSIONS.some((extension) =>
    name.endsWith(extension)
  );

  if (!hasAllowedExtension) {
    errors.push("Unsupported file type.");
  }

  if (file.size > MAX_INPUT_FILE_SIZE_BYTES) {
    errors.push("File exceeds the 100 MB size limit.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
