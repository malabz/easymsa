import type { ColumnStatsStoreV2 } from './types';
export const LOGO_COLORS = ['#19877d', '#438cc0', '#bb9038', '#ca7384'];
export const LOGO_DEFINITION = 'Canonical base count / total rows in analysis scope; gaps and ambiguous symbols retain denominator weight.';
export function frequencyLetters(store: ColumnStatsStoreV2, position: number, rna = false) {
  const index = position - 1;
  if (index < 0 || index >= store.length || !store.totalRows) return [];
  return ['A', 'C', 'G', rna ? 'U' : 'T'].map((base, i) => ({
    base, count: store.nucleotideCounts[index * 4 + i], color: LOGO_COLORS[i],
    frequency: store.nucleotideCounts[index * 4 + i] / store.totalRows
  })).filter(letter => letter.count > 0).sort((a, b) => a.count - b.count || a.base.localeCompare(b.base));
}
