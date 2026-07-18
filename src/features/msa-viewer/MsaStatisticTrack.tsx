import type { VirtualItem } from "@tanstack/react-virtual";
import { cn } from "../../lib/utils/cn";
import type {
  CellSelection,
  ColumnRange,
  ColumnStats,
  MsaTrackId,
  MsaViewSettings
} from "./types";

const TRACK_COLORS: Record<MsaTrackId, string> = {
  conservation: "bg-teal-700",
  gap: "bg-rose-500",
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
    return column.entropy;
  }
  return column.conservation;
}

export function MsaStatisticTrack({
  columns,
  onSelect,
  selectedRange,
  selection,
  settings,
  totalWidth,
  track,
  virtualColumns
}: {
  columns: ColumnStats[];
  onSelect: (selection: CellSelection, extendRange?: boolean) => void;
  selectedRange: ColumnRange | null;
  selection: CellSelection | null;
  settings: MsaViewSettings;
  totalWidth: number;
  track: MsaTrackId;
  virtualColumns: VirtualItem[];
}) {
  return (
    <div
      className="relative shrink-0"
      style={{ height: settings.cellHeight, width: totalWidth }}
    >
      {virtualColumns.map((virtualColumn) => {
        const column = columns[virtualColumn.index];
        if (!column) {
          return null;
        }
        const value = trackValue(column, track);
        const selected = selection?.position === column.position;
        const inSelectedRange = selectedRange
          ? column.position >= selectedRange.start && column.position <= selectedRange.end
          : false;
        const height = Math.max(2, Math.round(settings.cellHeight * value));

        return (
          <button
            aria-label={`${track} position ${column.position}: ${Math.round(value * 100)}%`}
            className={cn(
              "absolute left-0 top-0 flex items-end justify-center border-b border-slate-200 bg-white outline-none transition hover:bg-slate-100",
              selected
                ? "bg-teal-50 ring-1 ring-teal-400"
                : inSelectedRange
                  ? "bg-teal-50/70"
                  : ""
            )}
            data-msa-cell="true"
            key={`${track}-${column.position}`}
            onClick={(event) =>
              onSelect(
                { sequenceId: `track:${track}`, position: column.position },
                event.shiftKey
              )
            }
            type="button"
            style={{
              height: settings.cellHeight,
              transform: `translateX(${virtualColumn.start}px)`,
              width: settings.cellWidth
            }}
          >
            <span
              className={cn("block w-full rounded-sm", TRACK_COLORS[track])}
              style={{ height, opacity: 0.2 + value * 0.75 }}
            />
          </button>
        );
      })}
    </div>
  );
}
