import type { ColumnStatsStoreV2 } from './types';
import { frequencyLetters } from './frequencyLogo';
export function MsaFrequencyLogo({ columns, store, width, cellWidth, rna = false } : {
  columns: Array<{ position: number; virtualColumn: { start: number } }>;
  store: ColumnStatsStoreV2 | null; width: number; cellWidth: number; rna?: boolean;
}) {
  return <svg width={width} height={48} role="img" aria-label="Base frequency logo, 0–100%" className="block overflow-hidden">
    {store && columns.map(({position, virtualColumn}) => {
      let bottom = 46;
      const letters = frequencyLetters(store, position, rna);
      return <g key={position}><title>{`${position} · ${letters.map(l => `${l.base}: ${l.count}/${store.totalRows} (${(l.frequency * 100).toFixed(1)}%)`).join(', ')} · gap: ${store.gapCounts[position - 1]} · ambiguous: ${store.ambiguityCounts[position - 1]} · other: ${store.unknownCounts[position - 1]}`}</title>
        {letters.map(letter => {
          const height = 44 * letter.frequency; bottom -= height;
          return <svg key={letter.base} x={virtualColumn.start} y={bottom} width={cellWidth} height={height} viewBox="0 0 20 24" preserveAspectRatio="none">
            <text x="10" y="23" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="30" fill={letter.color}>{letter.base}</text>
          </svg>;
        })}
      </g>;
    })}
  </svg>;
}
