// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { filteredColumnPositionView, identityColumnPositionView } from './columnStatsStore';
import { resolveSequenceExport, sequenceExportText, type SequenceExportSnapshot } from './viewerWorkflowModel';
import { createSequenceExport, sequenceFastaChunks } from './sequenceExportProtocol';
const rows = [{ id: 'sample_1 中文 description', sequence: 'AC-GTU' }, { id: 'sample_2 another description', sequence: '-CAGT-' }];
const fixture: SequenceExportSnapshot = { all: rows, displayed: rows, selected: [rows[1]], positions: filteredColumnPositionView([1, 3, 6]), length: 6, range: { start: 2, end: 5 }, source: 'test', initialRows: 'displayed', initialColumns: 'filtered' };
describe('chunked sequence export', () => {
  it.each(['all', 'filtered', 'interval'] as const)('matches existing FASTA and mapping for %s columns', async columns => {
    const selection = resolveSequenceExport(fixture, 'displayed', columns);
    const expected = sequenceExportText(selection);
    const blob = createSequenceExport(selection);
    if (expected.mapping) {
      const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
      expect(strFromU8(files['alignment.fasta'])).toBe(expected.fasta);
      expect(strFromU8(files['columns.tsv'])).toBe(expected.mapping);
    } else expect(await blob.text()).toBe(expected.fasta);
  });
  it('keeps output chunks bounded for a long sequence and reports completion', async () => {
    const longRows = [{ id: 'long', sequence: 'ACGT'.repeat(100_000) }];
    const selection = resolveSequenceExport({ ...fixture, all: longRows, length: 400_000, positions: identityColumnPositionView(400_000) }, 'all', 'all');
    const chunks = Array.from(sequenceFastaChunks(selection));
    expect(Math.max(...chunks.map(chunk => chunk.length))).toBeLessThanOrEqual(65_536);
    const progress: number[] = []; const blob = createSequenceExport(selection, value => progress.push(value));
    expect((await blob.text()).length).toBe(400_007); expect(progress[progress.length - 1]).toBe(1);
    expect(progress.every((value, i) => i === 0 || value >= progress[i - 1])).toBe(true);
  });
});
