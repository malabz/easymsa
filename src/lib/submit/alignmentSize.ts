export type AlignmentSize = { rows: number; minColumns: number; maxColumns: number; cells: number };
export function measureAlignmentText(input: string): AlignmentSize | null {
  let rows = 0, cells = 0, current = -1, minColumns = Infinity, maxColumns = 0;
  const finish = () => { if (current >= 0) { rows++; cells += current; minColumns = Math.min(minColumns, current); maxColumns = Math.max(maxColumns, current); } };
  for (const line of input.split(/\r?\n/)) {
    if (line.trimStart().startsWith(">")) { finish(); current = 0; }
    else if (current >= 0) current += line.replace(/\s/g, "").length;
  }
  finish();
  return rows ? { rows, cells, minColumns, maxColumns } : null;
}
/** This is a bounded preview, not the server's input validation. */
export async function readAlignmentSize(file: File, signal: AbortSignal): Promise<AlignmentSize | null> {
  let stream: ReadableStream<Uint8Array> = file.stream();
  if (/\.gz$/i.test(file.name)) stream = stream.pipeThrough(new DecompressionStream("gzip"));
  const reader = stream.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  const cancel = () => { void reader.cancel(); }; signal.addEventListener("abort", cancel, { once: true });
  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 4 * 1024 * 1024) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    if (signal.aborted) return null;
    return measureAlignmentText(await new Blob(chunks as BlobPart[]).text());
  } finally { signal.removeEventListener("abort", cancel); reader.releaseLock(); }
}
