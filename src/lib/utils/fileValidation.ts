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

export const REALIGN_INPUT_EXTENSIONS = [".fa", ".fas", ".fasta", ".fna", ".aln"].flatMap(extension => [extension, `${extension}.gz`]);

export function validateInputFile(file: File, variant: "alignment" | "realignment" = "alignment", locale: "zh" | "en" = "en"): FileValidationResult {
  const errors: string[] = [];
  const allowed = variant === "realignment" ? REALIGN_INPUT_EXTENSIONS : ALLOWED_INPUT_EXTENSIONS;
  if (!allowed.some(extension => file.name.toLowerCase().endsWith(extension))) {
    errors.push(locale === "zh" ? "不支持此文件格式。" : "Unsupported file type.");
  }
  if (file.size === 0) errors.push(locale === "zh" ? "文件为空，请重新选择。" : "The file is empty. Choose another file.");
  if (file.size > MAX_INPUT_FILE_SIZE_BYTES) {
    errors.push(locale === "zh" ? "文件超过 100 MiB 大小限制。" : "File exceeds the 100 MiB size limit.");
  }
  return { valid: errors.length === 0, errors };
}
