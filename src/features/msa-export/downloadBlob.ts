export function withFileExtension(filename: string, extension: string) {
  const cleanExtension = extension.startsWith(".") ? extension : `.${extension}`;
  const trimmed = filename.trim() || "msa-export";

  return trimmed.toLowerCase().endsWith(cleanExtension)
    ? trimmed
    : `${trimmed}${cleanExtension}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
