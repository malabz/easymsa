import { classifyDifference } from './analysis';
import { differenceColorStyle } from './differenceColors';
import { rowKeyForSequence } from './alignmentModel';
import type { MSASequence } from '../../lib/types/msa';
import { msaCellColorStyle, type MSAColorScheme } from '../msa-export/exportColors';
import { columnColorContextAtPosition, positionAt } from './columnStatsStore';
import type { ColumnPositionView, ColumnStatsStoreV2 } from './types';
export type MinimapInput = {
  rows: MSASequence[]; sourceRows?: MSASequence[]; positions: ColumnPositionView; scheme: MSAColorScheme;
  store: ColumnStatsStoreV2 | null; width?: number; height?: number;
  layout?: 'vertical' | 'horizontal';
  reference?: MSASequence | null; differenceMode?: boolean; scopeRowKeys?: string[];
};
export type MinimapImage = { width: number; height: number; pixels: Uint8ClampedArray };
export type MinimapPair = { horizontal: MinimapImage; vertical: MinimapImage };
type Size = { width: number; height: number; layout: 'vertical' | 'horizontal' };

/** Both overviews average exactly the same visible cells in one traversal. */
function calculateImages(input: MinimapInput, sizes: Size[]): MinimapImage[] {
  const { rows, positions, scheme, store, reference, differenceMode, scopeRowKeys } = input;
  const grids = sizes.map(size => {
    const width = Math.max(1, Math.min(size.layout === 'horizontal' ? 2048 : 88, size.width, positions.length));
    const height = Math.max(1, Math.min(size.layout === 'horizontal' ? 24 : 512, size.height, rows.length));
    return { width, height, totals: new Float64Array(width * height * 4),
      rowBins: Uint32Array.from(rows, (_, r) => Math.min(height - 1, Math.floor(r * height / rows.length))) };
  });
  const palette = new Map<string, number[]>();
  const scope = scopeRowKeys ? new Set(scopeRowKeys) : null;
  const compare = rows.map((row, r) => Boolean(differenceMode && reference && (!scope || scope.has(rowKeyForSequence(row, r)))));
  const fixedColors = new Map<string, number[]>();
  // Tile columns so row strings are read sequentially, while colour contexts and
  // bin coordinates are computed once per column rather than once per cell.
  for (let block = 0; block < positions.length; block += 256) {
    const columns = Array.from({ length: Math.min(256, positions.length - block) }, (_, i) => {
      const c = block + i; const position = positionAt(positions, c)!;
      return { position, bins: grids.map(grid => Math.min(grid.width - 1, Math.floor(c * grid.width / positions.length))),
        context: scheme === 'conservation' && store ? columnColorContextAtPosition(store, position) ?? undefined : undefined,
        ordinary: scheme === 'conservation' ? new Map<string, number[]>() : fixedColors,
        compared: new Map<string, number[]>() };
    });
    for (let r = 0; r < rows.length; r++) {
      const sequence = rows[r].sequence;
      const offsets = grids.map(grid => grid.rowBins[r] * grid.width);
      for (const column of columns) {
        const base = sequence[column.position - 1] ?? '-';
        const colors = compare[r] ? column.compared : column.ordinary;
        let rgb = colors.get(base);
        if (!rgb) {
          const hex = compare[r] && reference
            ? differenceColorStyle(classifyDifference(base, reference.sequence[column.position - 1] ?? '')).background
            : msaCellColorStyle(base, scheme, column.context).background;
          rgb = palette.get(hex);
          if (!rgb) { rgb = /^#[\da-f]{6}$/i.test(hex) ? [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) : [255, 255, 255]; palette.set(hex, rgb); }
          colors.set(base, rgb);
        }
        for (let g = 0; g < grids.length; g++) {
          const totals = grids[g].totals; const i = (offsets[g] + column.bins[g]) * 4;
          totals[i] += rgb[0]; totals[i + 1] += rgb[1]; totals[i + 2] += rgb[2]; totals[i + 3]++;
        }
      }
    }
  }
  return grids.map(({ width, height, totals }) => {
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      const n = totals[i + 3];
      pixels[i] = n ? totals[i] / n : 255; pixels[i + 1] = n ? totals[i + 1] / n : 255;
      pixels[i + 2] = n ? totals[i + 2] / n : 255; pixels[i + 3] = 255;
    }
    return { width, height, pixels };
  });
}
export function calculateMinimap(input: MinimapInput): MinimapImage {
  return calculateImages(input, [{ width: input.width ?? 80, height: input.height ?? 512, layout: input.layout ?? 'vertical' }])[0];
}
export function calculateMinimapPair(input: MinimapInput): MinimapPair {
  const [horizontal, vertical] = calculateImages(input, [
    { width: 2048, height: 18, layout: 'horizontal' },
    { width: input.width ?? 80, height: input.height ?? 512, layout: 'vertical' }
  ]);
  return { horizontal, vertical };
}
