import { useLanguage } from "../../lib/i18n/useLanguage";
import type { ColumnStatsStoreV2 } from './types';
import { frequencyLetters } from './frequencyLogo';
export function MsaFrequencyLogo({ columns, store, width, cellWidth, rna = false } : {
  columns: Array<{ position: number; virtualColumn: { start: number } }>;
  store: ColumnStatsStoreV2 | null; width: number; cellWidth: number; rna?: boolean;
}) {
  const { dictionary: d } = useLanguage();
  const t = d.viewerWorkflow;
  return <svg width={width} height={48} role="img" aria-label={`${t.logo}, 0–100%`} className="block overflow-hidden">
    {store && columns.map(({position, virtualColumn}) => {
      let bottom = 46;
      const letters = frequencyLetters(store, position, rna);
      return <g key={position}><title>{`${position} · ${letters.map(l => `${l.base}: ${l.count}/${store.totalRows} (${(l.frequency * 100).toFixed(1)}%)`).join(', ')} · ${t.gapCount}: ${store.gapCounts[position - 1]} · ${t.ambiguousCount}: ${store.ambiguityCounts[position - 1]} · ${t.otherCount}: ${store.unknownCounts[position - 1]}`}</title>
        {letters.map(letter => {
          const height = 44 * letter.frequency; bottom -= height;
          // The viewBox hugs the capital's ink box, so each glyph fills its
          // share of the stack without being cropped at the sides.
          return <svg key={letter.base} x={virtualColumn.start} y={bottom} width={cellWidth} height={height} viewBox="0 -18.6 20 18.6" preserveAspectRatio="none">
            <text x="10" y="0" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="26" fill={letter.color}>{letter.base}</text>
          </svg>;
        })}
      </g>;
    })}
  </svg>;
}
