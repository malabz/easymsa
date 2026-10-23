export function downloadStem(source: string) {
  const value = source.normalize("NFC").replace(/\.(?:fasta|fa|fna|aln|fas)(?:\.gz)?$/i, "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, "-").replace(/^[. -]+|[. -]+$/g, "");
  return (value || "easymsa").slice(0, 80);
}
export function resultFilename(source: string, stage: string | undefined, suffix: string) {
  return `${downloadStem(source)}-${stage || "alignment"}-${suffix}`;
}
