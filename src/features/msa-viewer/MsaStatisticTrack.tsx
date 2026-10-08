import { conservationBar, conservationScaleRange, formatConservation } from "./conservationDisplay";
import type { VirtualItem } from "@tanstack/react-virtual";
import { cn } from "../../lib/utils/cn";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type {
  CellSelection,
  ColumnRange,
  ColumnStats,
  MsaTrackId,
  MsaViewSettings
} from "./types";

const TRACK_COLORS: Record<MsaTrackId, string> = {
  conservation: "bg-teal-700",
  gap: "bg-slate-400",
  coverage: "bg-sky-600",
  entropy: "bg-violet-600"
};

export function trackValue(column: ColumnStats, track: MsaTrackId) {
  if (track === "gap") {
    return column.gapFraction;
  }
  if (track === "coverage") {
    return column.coverage;
  }
  if (track === "entropy") {
    return column.hasInformativeBases === false
      ? null
      : column.normalizedEntropy ?? column.entropy;
  }
  return column.hasInformativeBases === false ? null : column.conservation;
}

export function MsaStatisticTrack({
  renderColumns,
  onSelect,
  selectedRange,
  selection,
  settings,
  totalWidth,
  track,
}: {
  renderColumns: Array<{
    virtualColumn: VirtualItem;
    position: number;
    stats: ColumnStats | null;
  }>;
  onSelect: (selection: CellSelection, extendRange?: boolean) => void;
  selectedRange: ColumnRange | null;
  selection: CellSelection | null;
  settings: MsaViewSettings;
  totalWidth: number;
  track: MsaTrackId;
}) {
  const { locale, dictionary: d } = useLanguage();
  return (
    <div
      className="relative shrink-0"
      style={{ height: settings.cellHeight, width: totalWidth }}
    >
      {renderColumns.map(({ virtualColumn, stats: column }) => {
        if (!column) {
          return null;
        }
        const value = trackValue(column, track);
        const selected = selection?.position === column.position;
        const inSelectedRange = selectedRange
          ? column.position >= selectedRange.start && column.position <= selectedRange.end
          : false;
        const bar = track === "conservation"
          ? conservationBar(value, settings.conservationScale ?? "high", settings.cellHeight)
          : { height: value === null ? 0 : Math.max(2, Math.round(settings.cellHeight * value)), belowRange: false, opacity: value === null ? 0 : 0.2 + value * 0.75 };
        const actualValue = value === null ? d.results.viewer.scienceV2.unavailable : formatConservation(value);
        const belowHint = bar.belowRange ? (locale === "zh" ? "；低于 80%" : "; below 80%") : "";
        const label = `${d.results.viewer.stageTwo.tracks[track]} ${d.results.viewer.position} ${column.position}: ${actualValue}${belowHint}`;

        return (
          <button
            aria-label={label}
            title={label}
            data-msa-conservation-scale={track === "conservation" ? conservationScaleRange(settings.conservationScale ?? "high").label : undefined}
            data-msa-track={track}
            className={cn(
              "absolute left-0 top-0 flex items-end justify-center border-b border-slate-200 bg-white outline-none transition hover:bg-slate-100",
              selected
                ? "bg-teal-50 ring-1 ring-teal-400"
                : inSelectedRange
                  ? "bg-teal-50/70"
                  : ""
            )}
            data-msa-cell="true"
            data-msa-track-position={column.position}
            key={`${track}-${column.position}`}
            onClick={(event) =>
              onSelect(
                { rowKey: `track:${track}`, position: column.position },
                event.shiftKey
              )
            }
            tabIndex={-1}
            type="button"
            style={{
              height: settings.cellHeight,
              transform: `translateX(${virtualColumn.start}px)`,
              width: settings.cellWidth
            }}
          >
            <span
              className={cn("block w-full", bar.belowRange ? "bg-amber-600" : TRACK_COLORS[track])}
              data-msa-below-range={bar.belowRange || undefined}
              style={{ height: bar.height, opacity: bar.opacity }}
            />
          </button>
        );
      })}
    </div>
  );
}
