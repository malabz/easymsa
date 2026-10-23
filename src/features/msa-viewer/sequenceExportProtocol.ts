import { drainTask } from "./cooperativeTask";
import { Zip, ZipDeflate } from 'fflate';
import type { MSASequence } from '../../lib/types/msa';
import { positionAt } from './columnStatsStore';
import type { ColumnPositionView } from './types';

export type SequenceExportRequest = {
  rows: MSASequence[]; positions: ColumnPositionView; offset: number;
  length: number; start: number; end: number; contiguous: boolean;
};
const BLOCK = 64 * 1024;
/** Bounded chunks avoid a second alignment-sized string before encoding. */
export function* sequenceFastaChunks(request: SequenceExportRequest): Generator<Uint8Array> {
  const encoder = new TextEncoder();
  for (const row of request.rows) {
    yield encoder.encode(`>${row.id}\n`);
    for (let i = 0; i < request.length; i += BLOCK) {
      const end = Math.min(i + BLOCK, request.length);
      let text: string;
      if (request.contiguous) text = row.sequence.slice(request.start - 1 + i, request.start - 1 + end);
      else {
        const characters = new Array<string>(end - i);
        for (let j = i; j < end; j++) characters[j - i] = row.sequence[(positionAt(request.positions, j)! + request.offset) - 1] ?? '';
        text = characters.join('');
      }
      yield encoder.encode(text);
    }
    yield encoder.encode('\n');
  }
}
export function* sequenceMappingChunks(request: SequenceExportRequest): Generator<Uint8Array> {
  const encoder = new TextEncoder();
  yield encoder.encode('export_column\toriginal_alignment_column\n');
  for (let i = 0; i < request.length; i += 4096) {
    const lines: string[] = [];
    for (let j = i; j < Math.min(i + 4096, request.length); j++) lines.push(`${j + 1}\t${positionAt(request.positions, j)! + request.offset}\n`);
    yield encoder.encode(lines.join(''));
  }
}
/** Runs in the shared data Worker; cancelling discards the iterator while retaining shared alignment data. */
export function* createSequenceExportCooperative(request: SequenceExportRequest, onProgress?: (value: number) => void) {
  const chunks: Uint8Array[] = [];
  let processed = 0;
  let previous = -1;
  const progress = (bytes: number) => {
    processed += bytes;
    const percent = Math.min(99, Math.floor(processed / Math.max(1, request.rows.length * request.length) * 100));
    if (percent !== previous) { previous = percent; onProgress?.(percent / 100); }
  };
  if (request.contiguous) {
    for (const chunk of sequenceFastaChunks(request)) { chunks.push(chunk); progress(chunk.length); yield; }
  } else {
    const zip = new Zip((error, chunk) => { if (error) throw error; chunks.push(chunk); });
    const fasta = new ZipDeflate('alignment.fasta', { level: 3 }); zip.add(fasta);
    for (const chunk of sequenceFastaChunks(request)) { fasta.push(chunk); progress(chunk.length); yield; }
    fasta.push(new Uint8Array(), true);
    const mapping = new ZipDeflate('columns.tsv', { level: 3 }); zip.add(mapping);
    for (const chunk of sequenceMappingChunks(request)) { mapping.push(chunk); yield; }
    mapping.push(new Uint8Array(), true); zip.end();
  }
  onProgress?.(1);
  return new Blob(chunks as BlobPart[], { type: request.contiguous ? 'text/plain;charset=utf-8' : 'application/zip' });
}

export function createSequenceExport(...args: Parameters<typeof createSequenceExportCooperative>) { return drainTask(createSequenceExportCooperative(...args)); }
