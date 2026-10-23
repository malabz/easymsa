import { describe, expect, it } from 'vitest';
import { calculateMinimap, calculateMinimapPair, type MinimapInput } from './minimapData';
import { calculateMsaAnalysisStore } from './analysis';
import { filteredColumnPositionView } from './columnStatsStore';
const rows = [
  { id: 'a', rowKey: 'a', sequence: 'ACGT-NR' },
  { id: 'b', rowKey: 'b', sequence: 'ACU--GT' },
  { id: 'c', rowKey: 'c', sequence: 'TGGAN--' }
];
describe('shared overview generation', () => {
  it.each(['nucleotide', 'conservation', 'neutral'] as const)('preserves exact %s image pixels for both layouts', scheme => {
    const input: MinimapInput = { rows, positions: filteredColumnPositionView([1, 2, 4, 6, 7]), scheme, store: calculateMsaAnalysisStore(rows, 7).columnStore };
    const pair = calculateMinimapPair(input);
    expect(pair.horizontal).toEqual(calculateMinimap({ ...input, layout: 'horizontal', width: 2048, height: 18 }));
    expect(pair.vertical).toEqual(calculateMinimap(input));
  });
  it('keeps comparison scope and row order', () => {
    const input: MinimapInput = { rows: [rows[2], rows[0], rows[1]], reference: rows[0], differenceMode: true, scopeRowKeys: ['a', 'c'], positions: filteredColumnPositionView([2, 3, 7]), scheme: 'nucleotide', store: null };
    const pair = calculateMinimapPair(input);
    expect(pair.horizontal).toEqual(calculateMinimap({ ...input, layout: 'horizontal', width: 2048, height: 18 }));
    expect(pair.vertical).toEqual(calculateMinimap(input));
  });
});
