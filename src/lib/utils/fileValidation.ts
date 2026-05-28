export type FileValidationResult = {
  valid: boolean;
  errors: string[];
};

export const MAX_INPUT_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export const ALLOWED_INPUT_EXTENSIONS = [
  ".fasta",
  ".fa",
  ".fna",
  ".zip",
  ".gz",
  ".tar.gz",
  ".tgz"
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
