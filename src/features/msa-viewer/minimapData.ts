import { classifyDifference } from "./analysis";
import { differenceColorStyle } from "./differenceColors";
import { rowKeyForSequence } from "./alignmentModel";
import type { MSASequence } from '../../lib/types/msa';
import { msaCellColorStyle, type MSAColorScheme } from '../msa-export/exportColors';
import { columnColorContextAtPosition, positionAt } from './columnStatsStore';
import type { ColumnPositionView, ColumnStatsStoreV2 } from './types';
export type MinimapInput = {
  rows: MSASequence[]; positions: ColumnPositionView; scheme: MSAColorScheme;
  store: ColumnStatsStoreV2 | null; width?: number; height?: number;
  layout?: 'vertical' | 'horizontal';
  reference?: MSASequence | null; differenceMode?: boolean; scopeRowKeys?: string[];
};
export type MinimapImage = { width: number; height: number; pixels: Uint8ClampedArray };
/** Bins average every loaded, visible cell. Geometry is independent of scrolling. */
export function calculateMinimap({rows, positions, scheme, store, width = 80, height = 512, layout = 'vertical', reference, differenceMode, scopeRowKeys}: MinimapInput): MinimapImage {
  const w = Math.max(1, Math.min(layout === 'horizontal' ? 2048 : 88, width, positions.length));
  const h = Math.max(1, Math.min(layout === 'horizontal' ? 24 : 512, height, rows.length));
  const totals = new Float64Array(w * h * 4);
  const palette = new Map<string, number[]>();
  const scope = scopeRowKeys ? new Set(scopeRowKeys) : null;
  for (let r = 0; r < rows.length; r++) {
    const y = Math.min(h - 1, Math.floor(r * h / rows.length));
    for (let c = 0; c < positions.length; c++) {
      const p = positionAt(positions, c)!;
      const base = rows[r].sequence[p - 1] ?? '-';
      const context = scheme === 'conservation' && store ? columnColorContextAtPosition(store, p) ?? undefined : undefined;
      const hex = differenceMode && reference && (!scope || scope.has(rowKeyForSequence(rows[r],r))) ? differenceColorStyle(classifyDifference(base,reference.sequence[p-1]??"")).background : msaCellColorStyle(base, scheme, context).background;
      let rgb = palette.get(hex);
      if (!rgb) { rgb = /^#[\da-f]{6}$/i.test(hex) ? [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)) : [255,255,255]; palette.set(hex,rgb); }
      const x = Math.min(w - 1, Math.floor(c * w / positions.length));
      const i = (y * w + x) * 4;
      totals[i] += rgb[0]; totals[i+1] += rgb[1]; totals[i+2] += rgb[2]; totals[i+3]++;
    }
  }
  const pixels = new Uint8ClampedArray(w * h * 4);
  for(let i=0;i<pixels.length;i+=4) {
    const n = totals[i+3];
    pixels[i] = n ? totals[i]/n : 255; pixels[i+1] = n ? totals[i+1]/n : 255; pixels[i+2] = n ? totals[i+2]/n : 255; pixels[i+3] = 255;
  }
  return { width:w, height:h, pixels };
}
