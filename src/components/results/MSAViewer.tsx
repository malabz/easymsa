import {
  ArrowDownAZ,
  Columns3,
  Download,
  Eye,
  EyeOff,
  ImageDown,
  ListFilter,
  LocateFixed,
  MousePointer2,
  Palette,
  RotateCcw,
  Search,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { type KeyboardEvent, type ReactNode, useMemo, useRef, useState } from "react";
import { EmptyState } from "../common/EmptyState";
import { ExportDialog } from "../../features/msa-export/ExportDialog";
import { useMsaExport } from "../../features/msa-export/useMsaExport";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { MSAResult } from "../../lib/types/msa";
import { cn } from "../../lib/utils/cn";
import {
  msaCellColorClass,
  MSAColorLegend,
  type MSAColorScheme
} from "./MSAColorLegend";

type Density = "comfortable" | "compact";
type SortMode = "original" | "name" | "length";
type ColumnFilter = "all" | "variable" | "conserved" | "lowGap";

type ViewSettings = {
  cellWidth: number;
  cellHeight: number;
  rowHeight: number;
  fontSize: number;
  labelWidth: number;
  markerEvery: number;
  showCharacters: boolean;
  cellGap: number;
};

type CellSelection = {
  sequenceId: string;
  position: number;
};

type ColumnRange = {
  start: number;
  end: number;
};

type ConservationColumn = {
  position: number;
  conservation: number;
  gapFraction: number;
  dominantBase: string;
};

type MotifMatch = {
  sequenceId: string;
  start: number;
  positions: number[];
};

type RangeStats = {
  length: number;
  averageConservation: number;
  averageGapFraction: number;
  variableColumns: number;
  consensusSegment: string;
};

function ToolGroup({
  title,
  children,
  className
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <h3 className="text-xs font-semibold uppercase text-slate-500">
        {title}
      </h3>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </section>
  );
}

const DETAIL_ZOOM_THRESHOLD = 0.7;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function getViewSettings(zoomLevel: number, density: Density): ViewSettings {
  const compact = density === "compact";
  const showCharacters = zoomLevel >= DETAIL_ZOOM_THRESHOLD;
  const baseCellWidth = compact ? 14 : 20;
  const baseCellHeight = compact ? 20 : 24;
  const rowPadding = compact ? 10 : 14;
  const globalCellSize = Math.max(3, Math.round(12 * zoomLevel));

  return {
    cellWidth: showCharacters
      ? Math.round(baseCellWidth * zoomLevel)
      : globalCellSize,
    cellHeight: showCharacters
      ? Math.round(baseCellHeight * zoomLevel)
      : globalCellSize,
    rowHeight: showCharacters
      ? Math.round(baseCellHeight * zoomLevel + rowPadding)
      : Math.max(6, globalCellSize + 2),
    fontSize: Math.max(9, Math.round((compact ? 10 : 11) * zoomLevel)),
    labelWidth: Math.round((compact ? 160 : 192) * Math.min(Math.max(zoomLevel, 0.8), 1.2)),
    markerEvery: zoomLevel < 0.35 ? 100 : zoomLevel < 0.7 ? 50 : zoomLevel < 0.95 ? 20 : 10,
    showCharacters,
    cellGap: showCharacters ? 2 : 0
  };
}

function cellClass(
  base: string,
  showCharacters: boolean,
  colorScheme: MSAColorScheme,
  conservation?: ConservationColumn
) {
  return cn(
    msaCellColorClass(base, colorScheme, conservation),
    showCharacters ? "" : "text-transparent"
  );
}

function normalizedMotif(value: string) {
  return value.replace(/[\s-]+/g, "").toUpperCase();
}

function findMotifMatches(sequenceId: string, sequence: string, motif: string): MotifMatch[] {
  const query = normalizedMotif(motif);
  if (!query) {
    return [];
  }

  const ungapped: Array<{ base: string; position: number }> = [];
  sequence.split("").forEach((base, index) => {
    if (base && base !== "-") {
      ungapped.push({ base: base.toUpperCase(), position: index + 1 });
    }
  });

  const searchable = ungapped.map((item) => item.base).join("");
  const matches: MotifMatch[] = [];
  let start = searchable.indexOf(query);

  while (start >= 0) {
    matches.push({
      sequenceId,
      start: ungapped[start]?.position ?? 1,
      positions: ungapped.slice(start, start + query.length).map((item) => item.position)
    });
    start = searchable.indexOf(query, start + 1);
  }

  return matches;
}

function SequenceCells({
  sequence,
  sequenceId,
  positions,
  settings,
  colorScheme,
  conservationColumns,
  selection,
  selectedRange,
  motifPositions,
  onSelect
}: {
  sequence: string;
  sequenceId: string;
  positions: number[];
  settings: ViewSettings;
  colorScheme: MSAColorScheme;
  conservationColumns: ConservationColumn[];
  selection: CellSelection | null;
  selectedRange: ColumnRange | null;
  motifPositions: Set<number> | undefined;
  onSelect: (selection: CellSelection, extendRange?: boolean) => void;
}) {
  return (
    <div
      className="flex min-w-max"
      style={{ gap: settings.cellGap }}
    >
      {positions.map((position) => {
        const base = sequence[position - 1] ?? "";
        const selectedRow = selection?.sequenceId === sequenceId;
        const selectedColumn = selection?.position === position;
        const selectedCell = selectedRow && selectedColumn;
        const inSelectedRange = selectedRange
          ? position >= selectedRange.start && position <= selectedRange.end
          : false;
        const motifHit = motifPositions?.has(position) ?? false;

        return (
        <button
          aria-label={`${sequenceId} position ${position} ${base || "empty"}`}
          className={cn(
            "inline-flex shrink-0 items-center justify-center font-mono font-semibold outline-none transition",
            settings.showCharacters ? "rounded border" : "border-0",
            cellClass(
              base,
              settings.showCharacters,
              colorScheme,
              conservationColumns[position - 1]
            ),
            selectedCell
              ? "ring-2 ring-teal-700 ring-offset-1"
              : inSelectedRange
                ? "ring-1 ring-teal-500"
              : selectedRow || selectedColumn
                ? "brightness-95 ring-1 ring-teal-300"
                : motifHit
                  ? "ring-2 ring-amber-500 ring-offset-1"
                : "hover:ring-1 hover:ring-slate-400"
          )}
          data-msa-cell="true"
          key={`${position}-${base}`}
          onClick={(event) => onSelect({ sequenceId, position }, event.shiftKey)}
          type="button"
          style={{
            height: settings.cellHeight,
            width: settings.cellWidth,
            fontSize: settings.fontSize
          }}
        >
          {settings.showCharacters ? base : ""}
        </button>
        );
      })}
    </div>
  );
}

function CoordinateRuler({
  positions,
  alignmentLength,
  settings,
  selectedRange
}: {
  positions: number[];
  alignmentLength: number;
  settings: ViewSettings;
  selectedRange: ColumnRange | null;
}) {
  return (
    <div className="flex min-w-max" style={{ gap: settings.cellGap }}>
      {positions.map((position) => {
        const showMarker =
          position === 1 ||
          position === alignmentLength ||
          position % settings.markerEvery === 0;
        const inSelectedRange = selectedRange
          ? position >= selectedRange.start && position <= selectedRange.end
          : false;

        return (
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center border-b border-slate-200 font-mono text-[10px]",
              inSelectedRange ? "bg-teal-50" : "",
              showMarker ? "text-slate-700" : "text-transparent"
            )}
            key={position}
            style={{
              height: settings.cellHeight,
              width: settings.cellWidth,
              fontSize: Math.max(9, settings.fontSize - 2)
            }}
          >
            {showMarker ? position : "."}
          </span>
        );
      })}
    </div>
  );
}

function ConservationTrack({
  columns,
  settings,
  selection,
  selectedRange,
  onSelect
}: {
  columns: ConservationColumn[];
  settings: ViewSettings;
  selection: CellSelection | null;
  selectedRange: ColumnRange | null;
  onSelect: (selection: CellSelection, extendRange?: boolean) => void;
}) {
  return (
    <div className="flex min-w-max" style={{ gap: settings.cellGap }}>
      {columns.map((column) => {
        const selected = selection?.position === column.position;
        const inSelectedRange = selectedRange
          ? column.position >= selectedRange.start && column.position <= selectedRange.end
          : false;
        const height = Math.max(2, Math.round(settings.cellHeight * column.conservation));
        const opacity = 0.18 + column.conservation * 0.72;

        return (
          <button
            aria-label={`conservation position ${column.position}`}
            className={cn(
              "flex shrink-0 items-end justify-center border-b border-slate-200 outline-none transition hover:bg-slate-100",
              selected
                ? "bg-teal-50 ring-1 ring-teal-400"
                : inSelectedRange
                  ? "bg-teal-50/70"
                  : "bg-white"
            )}
            data-msa-cell="true"
            key={column.position}
            onClick={(event) =>
              onSelect({
                sequenceId: "conservation",
                position: column.position
              }, event.shiftKey)
            }
            title={`pos ${column.position}: ${Math.round(column.conservation * 100)}% ${column.dominantBase || ""}`}
            type="button"
            style={{
              height: settings.cellHeight,
              width: settings.cellWidth
            }}
          >
            <span
              className={cn(
                "block w-full rounded-sm",
                column.gapFraction > 0.5 ? "bg-slate-400" : "bg-teal-700"
              )}
              style={{
                height,
                opacity
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

export function MSAViewer({ alignment }: { alignment: MSAResult }) {
  const { dictionary: d } = useLanguage();
  const [search, setSearch] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [density, setDensity] = useState<Density>("comfortable");
  const [sortMode, setSortMode] = useState<SortMode>("original");
  const [colorScheme, setColorScheme] = useState<MSAColorScheme>("nucleotide");
  const [columnFilter, setColumnFilter] = useState<ColumnFilter>("all");
  const [motifQuery, setMotifQuery] = useState("");
  const [jumpPosition, setJumpPosition] = useState("");
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [selectedRange, setSelectedRange] = useState<ColumnRange | null>(null);
  const [hiddenSequenceIds, setHiddenSequenceIds] = useState<Set<string>>(
    () => new Set()
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const viewSettings = useMemo(
    () => getViewSettings(zoomLevel, density),
    [density, zoomLevel]
  );

  const displayedSequences = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? alignment.sequences.filter((sequence) =>
          sequence.id.toLowerCase().includes(query)
        )
      : alignment.sequences;
    const visible = filtered.filter(
      (sequence) => !hiddenSequenceIds.has(sequence.id)
    );

    if (sortMode === "name") {
      return [...visible].sort((a, b) => a.id.localeCompare(b.id));
    }
    if (sortMode === "length") {
      return [...visible].sort(
        (a, b) => b.sequence.length - a.sequence.length || a.id.localeCompare(b.id)
      );
    }

    return visible;
  }, [alignment.sequences, hiddenSequenceIds, search, sortMode]);

  const countText = d.results.viewer.sequenceCount
    .replace("{shown}", displayedSequences.length.toLocaleString())
    .replace("{total}", alignment.sequences.length.toLocaleString());
  const hiddenCount = hiddenSequenceIds.size;

  const lengthText = d.results.viewer.alignmentLength.replace(
    "{length}",
    (
      alignment.alignmentLength ??
      Math.max(0, ...alignment.sequences.map((sequence) => sequence.sequence.length))
    ).toLocaleString()
  );
  const alignmentLength =
    alignment.alignmentLength ??
    Math.max(0, ...alignment.sequences.map((sequence) => sequence.sequence.length));
  const canUseViewerControls = alignmentLength > 0 && alignment.sequences.length > 0;
  const conservationColumns = useMemo<ConservationColumn[]>(() => {
    return Array.from({ length: alignmentLength }, (_, index) => {
      const counts = new Map<string, number>();
      let observed = 0;
      let gaps = 0;

      for (const sequence of alignment.sequences) {
        const base = sequence.sequence[index] ?? "";
        if (!base) {
          gaps += 1;
          continue;
        }
        if (base === "-") {
          gaps += 1;
        }
        if (base && base !== "-") {
          observed += 1;
          counts.set(base, (counts.get(base) ?? 0) + 1);
        }
      }

      const [dominantBase = "", dominantCount = 0] =
        Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? [];

      return {
        position: index + 1,
        conservation: observed > 0 ? dominantCount / observed : 0,
        gapFraction: alignment.sequences.length > 0 ? gaps / alignment.sequences.length : 0,
        dominantBase
      };
    });
  }, [alignment.sequences, alignmentLength]);
  const visiblePositions = useMemo(() => {
    return conservationColumns
      .filter((column) => {
        if (columnFilter === "variable") {
          return column.conservation > 0 && column.conservation < 1;
        }
        if (columnFilter === "conserved") {
          return column.conservation >= 0.8 && column.gapFraction < 0.5;
        }
        if (columnFilter === "lowGap") {
          return column.gapFraction <= 0.5;
        }
        return true;
      })
      .map((column) => column.position);
  }, [columnFilter, conservationColumns]);
  const visibleConservationColumns = useMemo(
    () => visiblePositions.map((position) => conservationColumns[position - 1]).filter(Boolean),
    [conservationColumns, visiblePositions]
  );
  const visibleColumnText = d.results.viewer.visibleColumns
    .replace("{shown}", visiblePositions.length.toLocaleString())
    .replace("{total}", alignmentLength.toLocaleString());
  const navigationRowIds = useMemo(
    () => [
      "conservation",
      ...displayedSequences.map((sequence) => sequence.id),
      d.results.viewer.consensus
    ],
    [d.results.viewer.consensus, displayedSequences]
  );
  const selectedSequence = selection
    ? alignment.sequences.find((sequence) => sequence.id === selection.sequenceId)
    : null;
  const selectedBase =
    selectedSequence && selection
      ? selectedSequence.sequence[selection.position - 1] ?? ""
      : selection?.sequenceId === d.results.viewer.consensus
        ? alignment.consensus[selection.position - 1] ?? ""
      : selection?.sequenceId === "conservation"
        ? conservationColumns[selection.position - 1]?.dominantBase ?? ""
      : "";
  const selectedColumnStats = selection
    ? conservationColumns[selection.position - 1]
    : null;
  const selectedRangeText = selectedRange
    ? selectedRange.start === selectedRange.end
      ? String(selectedRange.start)
      : `${selectedRange.start}-${selectedRange.end}`
    : "";
  const selectedRangeStats = useMemo<RangeStats | null>(() => {
    if (!selectedRange) {
      return null;
    }

    const rangeColumns = conservationColumns.slice(
      selectedRange.start - 1,
      selectedRange.end
    );
    if (!rangeColumns.length) {
      return null;
    }

    const averageConservation =
      rangeColumns.reduce((sum, column) => sum + column.conservation, 0) /
      rangeColumns.length;
    const averageGapFraction =
      rangeColumns.reduce((sum, column) => sum + column.gapFraction, 0) /
      rangeColumns.length;
    const variableColumns = rangeColumns.filter(
      (column) => column.conservation > 0 && column.conservation < 1
    ).length;

    return {
      length: rangeColumns.length,
      averageConservation,
      averageGapFraction,
      variableColumns,
      consensusSegment: alignment.consensus.slice(selectedRange.start - 1, selectedRange.end)
    };
  }, [alignment.consensus, conservationColumns, selectedRange]);
  const columnSummary = useMemo(() => {
    if (!selection) {
      return "";
    }

    const counts = new Map<string, number>();
    for (const sequence of alignment.sequences) {
      const base = sequence.sequence[selection.position - 1] ?? "";
      const key = base || d.results.viewer.emptyCell;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([base, count]) => `${base}:${count}`)
      .join("  ");
  }, [alignment.sequences, d.results.viewer.emptyCell, selection]);
  const motifMatches = useMemo(() => {
    const query = normalizedMotif(motifQuery);
    if (!query) {
      return [];
    }

    return displayedSequences.flatMap((sequence) =>
      findMotifMatches(sequence.id, sequence.sequence, query)
    );
  }, [displayedSequences, motifQuery]);
  const motifPositionMap = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const match of motifMatches) {
      const positions = map.get(match.sequenceId) ?? new Set<number>();
      match.positions.forEach((position) => positions.add(position));
      map.set(match.sequenceId, positions);
    }
    return map;
  }, [motifMatches]);
  const imageExport = useMsaExport(alignment, getExportViewerState);

  function getExportViewerState() {
    const viewport = scrollRef.current
      ? {
          scrollLeft: scrollRef.current.scrollLeft,
          scrollTop: scrollRef.current.scrollTop,
          clientWidth: scrollRef.current.clientWidth,
          clientHeight: scrollRef.current.clientHeight
        }
      : null;

    return {
      sequences: displayedSequences,
      visiblePositions,
      conservationColumns,
      colorScheme,
      selectedRange,
      viewSettings,
      viewport,
      alignmentLength
    };
  }

  function hideSequence(sequenceId: string) {
    setHiddenSequenceIds((current) => {
      const next = new Set(current);
      next.add(sequenceId);
      return next;
    });
    setSelection((current) =>
      current?.sequenceId === sequenceId ? null : current
    );
  }

  function showAllSequences() {
    setHiddenSequenceIds(new Set());
  }

  function exportVisibleFasta() {
    if (!displayedSequences.length) {
      return;
    }

    const fasta = displayedSequences
      .map((sequence) => {
        const visibleSequence = visiblePositions
          .map((position) => sequence.sequence[position - 1] ?? "")
          .join("");
        return `>${sequence.id}\n${visibleSequence}`;
      })
      .join("\n");
    const blob = new Blob([`${fasta}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "easymsa-visible-alignment.fasta";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportSelectedRangeFasta() {
    if (!displayedSequences.length || !selectedRange) {
      return;
    }

    const fasta = displayedSequences
      .map((sequence) => {
        const segment = sequence.sequence.slice(selectedRange.start - 1, selectedRange.end);
        return `>${sequence.id}:${selectedRange.start}-${selectedRange.end}\n${segment}`;
      })
      .join("\n");
    const blob = new Blob([`${fasta}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `easymsa-visible-region-${selectedRange.start}-${selectedRange.end}.fasta`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportConsensusRangeFasta() {
    if (!selectedRange || !selectedRangeStats) {
      return;
    }

    const fasta = `>${alignment.jobId || "easymsa"}:consensus:${selectedRange.start}-${selectedRange.end}\n${selectedRangeStats.consensusSegment}`;
    const blob = new Blob([`${fasta}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `easymsa-consensus-region-${selectedRange.start}-${selectedRange.end}.fasta`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleSelect(nextSelection: CellSelection, extendRange = false) {
    if (extendRange && (selectedRange || selection)) {
      const anchor = selectedRange?.start ?? selection?.position ?? nextSelection.position;
      setSelectedRange({
        start: Math.min(anchor, nextSelection.position),
        end: Math.max(anchor, nextSelection.position)
      });
    } else {
      setSelectedRange({
        start: nextSelection.position,
        end: nextSelection.position
      });
    }
    setSelection(nextSelection);
  }

  function moveSelection(deltaRow: number, deltaColumn: number, extendRange = false) {
    if (!visiblePositions.length || !navigationRowIds.length) {
      return;
    }

    const currentPosition = selection?.position ?? visiblePositions[0];
    const exactColumnIndex = visiblePositions.indexOf(currentPosition);
    const fallbackColumnIndex = visiblePositions.findIndex(
      (position) => position >= currentPosition
    );
    const currentColumnIndex =
      exactColumnIndex >= 0
        ? exactColumnIndex
        : fallbackColumnIndex >= 0
          ? fallbackColumnIndex
          : visiblePositions.length - 1;
    const currentRowIndex = Math.max(
      0,
      navigationRowIds.indexOf(selection?.sequenceId ?? navigationRowIds[1] ?? navigationRowIds[0])
    );

    const nextColumnIndex = Math.min(
      visiblePositions.length - 1,
      Math.max(0, currentColumnIndex + deltaColumn)
    );
    const nextRowIndex = Math.min(
      navigationRowIds.length - 1,
      Math.max(0, currentRowIndex + deltaRow)
    );
    const nextSelection = {
      sequenceId: navigationRowIds[nextRowIndex],
      position: visiblePositions[nextColumnIndex]
    };

    handleSelect(nextSelection, extendRange);
    scrollToAlignmentPosition(nextSelection.position);
  }

  function handleMatrixKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target !== event.currentTarget && !target.closest("[data-msa-cell='true']")) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelection(0, -1, event.shiftKey);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveSelection(0, 1, event.shiftKey);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1, 0, event.shiftKey);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1, 0, event.shiftKey);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveSelection(0, -visiblePositions.length, event.shiftKey);
    } else if (event.key === "End") {
      event.preventDefault();
      moveSelection(0, visiblePositions.length, event.shiftKey);
    }
  }

  function jumpToFirstMotifMatch() {
    const first = motifMatches[0];
    if (!first) {
      return;
    }

    setSelection({
      sequenceId: first.sequenceId,
      position: first.start
    });
    setSelectedRange({
      start: Math.min(...first.positions),
      end: Math.max(...first.positions)
    });

    scrollToAlignmentPosition(first.start);
  }

  function changeZoom(delta: number) {
    setZoomLevel((current) => clampZoom(current + delta));
  }

  function resetZoom() {
    setZoomLevel(1);
  }

  function toggleDensity() {
    setDensity((current) =>
      current === "comfortable" ? "compact" : "comfortable"
    );
  }

  function jumpToPosition() {
    if (!scrollRef.current || !alignmentLength) {
      return;
    }

    const parsed = Number.parseInt(jumpPosition, 10);
    const position = Number.isNaN(parsed)
      ? 1
      : Math.min(alignmentLength, Math.max(1, parsed));

    scrollToAlignmentPosition(position);
    setJumpPosition(String(position));
  }

  function scrollToAlignmentPosition(position: number) {
    if (!scrollRef.current) {
      return;
    }

    const visibleIndex = visiblePositions.findIndex((visiblePosition) => visiblePosition >= position);
    const columnIndex = visibleIndex >= 0 ? visibleIndex : Math.max(0, visiblePositions.length - 1);
    scrollRef.current.scrollLeft = Math.max(
      0,
      columnIndex * (viewSettings.cellWidth + viewSettings.cellGap)
    );
  }

  if (alignment.truncated) {
    return (
      <EmptyState
        message={
          alignment.message ??
          "Alignment is too large for preview. Download the result archive instead."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-y border-slate-200 py-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(22rem,1.35fr)_minmax(14rem,0.9fr)_minmax(14rem,0.95fr)_minmax(14rem,0.95fr)_minmax(14rem,1fr)]">
          <ToolGroup title={d.results.viewer.toolGroups.search} className="xl:col-span-1">
            <div className="relative min-w-60 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label={d.results.viewer.search}
                className="h-10 w-full rounded-md border border-slate-300 bg-white/80 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={d.results.viewer.searchPlaceholder}
                value={search}
              />
            </div>
            <div className="relative min-w-60 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label={d.results.viewer.motifSearch}
                className="h-10 w-full rounded-md border border-slate-300 bg-white/80 pl-9 pr-3 font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                onChange={(event) => setMotifQuery(event.target.value)}
                placeholder={d.results.viewer.motifPlaceholder}
                value={motifQuery}
              />
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white/70 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40"
              disabled={motifMatches.length === 0}
              onClick={jumpToFirstMotifMatch}
              title={d.results.viewer.firstMotifMatch}
              type="button"
            >
              <LocateFixed className="h-4 w-4" />
              {d.results.viewer.firstMotifMatch}
            </button>
            {normalizedMotif(motifQuery) ? (
              <span className="rounded-md bg-white/70 px-3 py-2 text-sm text-slate-600">
                {d.results.viewer.motifMatchCount.replace(
                  "{count}",
                  motifMatches.length.toLocaleString()
                )}
              </span>
            ) : null}
          </ToolGroup>

          {canUseViewerControls ? (
            <>
              <ToolGroup title={d.results.viewer.toolGroups.view}>
                <div className="inline-flex h-10 overflow-hidden rounded-md border border-slate-200 bg-white/70">
                  <button
                    aria-label={d.results.viewer.zoomOut}
                    className="inline-flex w-10 items-center justify-center text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40"
                    disabled={zoomLevel <= MIN_ZOOM}
                    onClick={() => changeZoom(-ZOOM_STEP)}
                    title={d.results.viewer.zoomOut}
                    type="button"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={d.results.viewer.resetZoom}
                    className="inline-flex min-w-16 items-center justify-center gap-1 border-x border-slate-200 px-3 font-mono text-xs text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                    onClick={resetZoom}
                    title={d.results.viewer.resetZoom}
                    type="button"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {zoomLevel.toFixed(1)}x
                  </button>
                  <button
                    aria-label={d.results.viewer.zoomIn}
                    className="inline-flex w-10 items-center justify-center text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40"
                    disabled={zoomLevel >= MAX_ZOOM}
                    onClick={() => changeZoom(ZOOM_STEP)}
                    title={d.results.viewer.zoomIn}
                    type="button"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
                <button
                  aria-label={d.results.viewer.toggleDensity}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white/70 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                  onClick={toggleDensity}
                  title={d.results.viewer.toggleDensity}
                  type="button"
                >
                  <Columns3 className="h-4 w-4" />
                  {d.results.viewer.density[density]}
                </button>
                <div className="inline-flex h-10 items-center overflow-hidden rounded-md border border-slate-200 bg-white/70">
                  <span className="inline-flex h-full items-center border-r border-slate-200 px-3 text-slate-500">
                    <Palette className="h-4 w-4" />
                  </span>
                  <select
                    aria-label={d.results.viewer.colorScheme}
                    className="h-full bg-transparent px-3 text-sm font-medium text-slate-700 outline-none"
                    onChange={(event) => setColorScheme(event.target.value as MSAColorScheme)}
                    value={colorScheme}
                  >
                    <option value="nucleotide">
                      {d.results.viewer.colorSchemes.nucleotide}
                    </option>
                    <option value="purinePyrimidine">
                      {d.results.viewer.colorSchemes.purinePyrimidine}
                    </option>
                    <option value="conservation">
                      {d.results.viewer.colorSchemes.conservation}
                    </option>
                  </select>
                </div>
                <span className="rounded-md bg-white/70 px-3 py-2 text-sm text-slate-600">
                  {viewSettings.showCharacters
                    ? d.results.viewer.detailMode
                    : d.results.viewer.overviewMode}
                </span>
                <span className="rounded-md bg-white/70 px-3 py-2 text-sm text-slate-600">
                  {lengthText}
                </span>
              </ToolGroup>

              <ToolGroup title={d.results.viewer.toolGroups.columns}>
                <div className="inline-flex h-10 items-center overflow-hidden rounded-md border border-slate-200 bg-white/70">
                  <span className="inline-flex h-full items-center border-r border-slate-200 px-3 text-slate-500">
                    <ListFilter className="h-4 w-4" />
                  </span>
                  <select
                    aria-label={d.results.viewer.columnFilter}
                    className="h-full bg-transparent px-3 text-sm font-medium text-slate-700 outline-none"
                    onChange={(event) => setColumnFilter(event.target.value as ColumnFilter)}
                    value={columnFilter}
                  >
                    <option value="all">{d.results.viewer.columnFilters.all}</option>
                    <option value="variable">{d.results.viewer.columnFilters.variable}</option>
                    <option value="conserved">{d.results.viewer.columnFilters.conserved}</option>
                    <option value="lowGap">{d.results.viewer.columnFilters.lowGap}</option>
                  </select>
                </div>
                <div className="inline-flex h-10 overflow-hidden rounded-md border border-slate-200 bg-white/70">
                  <input
                    aria-label={d.results.viewer.jumpTo}
                    className="w-24 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    inputMode="numeric"
                    min={1}
                    max={alignmentLength}
                    onChange={(event) => setJumpPosition(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        jumpToPosition();
                      }
                    }}
                    placeholder={d.results.viewer.jumpPlaceholder}
                    type="number"
                    value={jumpPosition}
                  />
                  <button
                    aria-label={d.results.viewer.jumpTo}
                    className="inline-flex w-10 items-center justify-center border-l border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                    onClick={jumpToPosition}
                    title={d.results.viewer.jumpTo}
                    type="button"
                  >
                    <LocateFixed className="h-4 w-4" />
                  </button>
                </div>
                <span className="rounded-md bg-white/70 px-3 py-2 text-sm text-slate-600">
                  {visibleColumnText}
                </span>
                {selectedRange ? (
                  <span className="rounded-md bg-white/70 px-3 py-2 text-sm text-slate-600">
                    {d.results.viewer.selectedRange.replace("{range}", selectedRangeText)}
                  </span>
                ) : null}
              </ToolGroup>

              <ToolGroup title={d.results.viewer.toolGroups.sequences}>
                <div className="inline-flex h-10 items-center overflow-hidden rounded-md border border-slate-200 bg-white/70">
                  <span className="inline-flex h-full items-center border-r border-slate-200 px-3 text-slate-500">
                    <ArrowDownAZ className="h-4 w-4" />
                  </span>
                  <select
                    aria-label={d.results.viewer.sortBy}
                    className="h-full bg-transparent px-3 text-sm font-medium text-slate-700 outline-none"
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                    value={sortMode}
                  >
                    <option value="original">{d.results.viewer.sort.original}</option>
                    <option value="name">{d.results.viewer.sort.name}</option>
                    <option value="length">{d.results.viewer.sort.length}</option>
                  </select>
                </div>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white/70 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40"
                  disabled={hiddenCount === 0}
                  onClick={showAllSequences}
                  title={d.results.viewer.showAll}
                  type="button"
                >
                  <Eye className="h-4 w-4" />
                  {d.results.viewer.showAll}
                </button>
                <span className="rounded-md bg-white/70 px-3 py-2 text-sm text-slate-600">
                  {countText}
                </span>
                {hiddenCount > 0 ? (
                  <span className="rounded-md bg-white/70 px-3 py-2 text-sm text-slate-600">
                    {d.results.viewer.hiddenCount.replace(
                      "{count}",
                      hiddenCount.toLocaleString()
                    )}
                  </span>
                ) : null}
              </ToolGroup>

              <ToolGroup title={d.results.viewer.toolGroups.export}>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white/70 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40"
                  disabled={displayedSequences.length === 0 || visiblePositions.length === 0}
                  onClick={imageExport.openDialog}
                  title={d.results.viewer.imageExport.button}
                  type="button"
                >
                  <ImageDown className="h-4 w-4" />
                  {d.results.viewer.imageExport.button}
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white/70 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40"
                  disabled={displayedSequences.length === 0 || visiblePositions.length === 0}
                  onClick={exportVisibleFasta}
                  title={d.results.viewer.exportVisible}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  {d.results.viewer.exportVisible}
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white/70 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40"
                  disabled={!selectedRange || displayedSequences.length === 0}
                  onClick={exportSelectedRangeFasta}
                  title={d.results.viewer.exportSelectedRange}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  {d.results.viewer.exportSelectedRange}
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white/70 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40"
                  disabled={!selectedRangeStats}
                  onClick={exportConsensusRangeFasta}
                  title={d.results.viewer.exportConsensusRange}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  {d.results.viewer.exportConsensusRange}
                </button>
              </ToolGroup>
            </>
          ) : null}
        </div>
      </div>

      {displayedSequences.length === 0 ? (
        <EmptyState message={d.results.viewer.noMatches} />
      ) : visiblePositions.length === 0 ? (
        <EmptyState message={d.results.viewer.noColumns} />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white/75 shadow-none">
          <div
            aria-label={d.results.viewer.matrixNavigation}
            className="max-h-[34rem] overflow-auto rounded-lg outline-none focus:ring-2 focus:ring-teal-100"
            onKeyDown={handleMatrixKeyDown}
            ref={scrollRef}
            tabIndex={0}
          >
            <div className="min-w-max">
              <div
                className="grid border-b border-slate-200 bg-slate-50/90"
                style={{
                  gridTemplateColumns: `${viewSettings.labelWidth}px 1fr`
                }}
              >
                <div
                  className="sticky left-0 z-20 flex items-center border-r border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500"
                  style={{ height: viewSettings.rowHeight }}
                >
                  {d.results.viewer.position}
                </div>
                <div className="flex items-center px-3">
                  <CoordinateRuler
                    positions={visiblePositions}
                    alignmentLength={alignmentLength}
                    settings={viewSettings}
                    selectedRange={selectedRange}
                  />
                </div>
              </div>
              <div
                className="grid border-b border-slate-200 bg-white"
                style={{
                  gridTemplateColumns: `${viewSettings.labelWidth}px 1fr`
                }}
              >
                <div
                  className="sticky left-0 z-10 flex items-center border-r border-slate-200 bg-white px-3 text-xs font-medium text-slate-500"
                  style={{ height: viewSettings.rowHeight }}
                >
                  {d.results.viewer.conservation}
                </div>
                <div
                  className="flex items-center px-3"
                  style={{ height: viewSettings.rowHeight }}
                >
                  <ConservationTrack
                    columns={visibleConservationColumns}
                    settings={viewSettings}
                    selection={selection}
                    selectedRange={selectedRange}
                    onSelect={handleSelect}
                  />
                </div>
              </div>
              {displayedSequences.map((sequence) => (
                <div
                  key={sequence.id}
                  className="grid border-b border-slate-100 last:border-b-0"
                  style={{
                    gridTemplateColumns: `${viewSettings.labelWidth}px 1fr`
                  }}
                >
                  <div
                    className={cn(
                      "sticky left-0 z-10 flex items-center justify-between gap-2 border-r border-slate-200 px-3 font-mono text-xs font-medium text-slate-700",
                      selection?.sequenceId === sequence.id ? "bg-teal-50 text-teal-950" : "bg-white"
                    )}
                    style={{ height: viewSettings.rowHeight }}
                  >
                    <span className="truncate">{sequence.id}</span>
                    <button
                      aria-label={`${d.results.viewer.hideSequence} ${sequence.id}`}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => hideSequence(sequence.id)}
                      title={d.results.viewer.hideSequence}
                      type="button"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div
                    className="flex items-center px-3"
                    style={{ height: viewSettings.rowHeight }}
                  >
                    <SequenceCells
                      sequence={sequence.sequence}
                      sequenceId={sequence.id}
                      positions={visiblePositions}
                      settings={viewSettings}
                      colorScheme={colorScheme}
                      conservationColumns={conservationColumns}
                      selection={selection}
                      selectedRange={selectedRange}
                      motifPositions={motifPositionMap.get(sequence.id)}
                      onSelect={handleSelect}
                    />
                  </div>
                </div>
              ))}
              <div
                className="grid border-t border-slate-300 bg-teal-50/70"
                style={{
                  gridTemplateColumns: `${viewSettings.labelWidth}px 1fr`
                }}
              >
                <div
                  className="sticky left-0 z-10 flex items-center border-r border-slate-200 bg-teal-50 px-3 font-mono text-xs font-semibold text-teal-900"
                  style={{ height: viewSettings.rowHeight + 4 }}
                >
                  {d.results.viewer.consensus}
                </div>
                <div
                  className="flex items-center px-3"
                  style={{ height: viewSettings.rowHeight + 4 }}
                >
                  <SequenceCells
                    sequence={alignment.consensus}
                    sequenceId={d.results.viewer.consensus}
                    positions={visiblePositions}
                    settings={viewSettings}
                    colorScheme={colorScheme}
                    conservationColumns={conservationColumns}
                    selection={selection}
                    selectedRange={selectedRange}
                    motifPositions={undefined}
                    onSelect={handleSelect}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-700 sm:flex-row sm:items-center sm:justify-between">
            {selection ? (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-900">
                    <MousePointer2 className="h-3.5 w-3.5 text-teal-700" />
                    {d.results.viewer.selectedCell}
                  </span>
                  <span>
                    {d.results.viewer.selectedSequence}:{" "}
                    <span className="font-mono text-slate-950">{selection.sequenceId}</span>
                  </span>
                  <span>
                    {d.results.viewer.selectedPosition}:{" "}
                    <span className="font-mono text-slate-950">{selection.position}</span>
                  </span>
                  <span>
                    {d.results.viewer.selectedRangeLabel}:{" "}
                    <span className="font-mono text-slate-950">{selectedRangeText}</span>
                  </span>
                  <span>
                    {d.results.viewer.selectedBase}:{" "}
                    <span className="font-mono text-slate-950">
                      {selectedBase || d.results.viewer.emptyCell}
                    </span>
                  </span>
                  <span>
                    {d.results.viewer.columnSummary}:{" "}
                    <span className="font-mono text-slate-950">{columnSummary}</span>
                  </span>
                  {selectedColumnStats ? (
                    <>
                      <span>
                        {d.results.viewer.columnConservation}:{" "}
                        <span className="font-mono text-slate-950">
                          {Math.round(selectedColumnStats.conservation * 100)}%
                        </span>
                      </span>
                      <span>
                        {d.results.viewer.columnGap}:{" "}
                        <span className="font-mono text-slate-950">
                          {Math.round(selectedColumnStats.gapFraction * 100)}%
                        </span>
                      </span>
                      <span>
                        {d.results.viewer.dominantBase}:{" "}
                        <span className="font-mono text-slate-950">
                          {selectedColumnStats.dominantBase || d.results.viewer.emptyCell}
                        </span>
                      </span>
                    </>
                  ) : null}
                  {selectedRangeStats ? (
                    <>
                      <span>
                        {d.results.viewer.rangeLength}:{" "}
                        <span className="font-mono text-slate-950">
                          {selectedRangeStats.length.toLocaleString()}
                        </span>
                      </span>
                      <span>
                        {d.results.viewer.rangeConservation}:{" "}
                        <span className="font-mono text-slate-950">
                          {Math.round(selectedRangeStats.averageConservation * 100)}%
                        </span>
                      </span>
                      <span>
                        {d.results.viewer.rangeGap}:{" "}
                        <span className="font-mono text-slate-950">
                          {Math.round(selectedRangeStats.averageGapFraction * 100)}%
                        </span>
                      </span>
                      <span>
                        {d.results.viewer.rangeVariableColumns}:{" "}
                        <span className="font-mono text-slate-950">
                          {selectedRangeStats.variableColumns.toLocaleString()}
                        </span>
                      </span>
                      <span>
                        {d.results.viewer.rangeConsensus}:{" "}
                        <span className="inline-block max-w-64 truncate align-bottom font-mono text-slate-950">
                          {selectedRangeStats.consensusSegment || d.results.viewer.emptyCell}
                        </span>
                      </span>
                    </>
                  ) : null}
                </div>
                <button
                  className="inline-flex items-center gap-1 font-medium text-slate-500 transition hover:text-slate-950"
                  onClick={() => {
                    setSelection(null);
                    setSelectedRange(null);
                  }}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                  {d.results.viewer.clearSelection}
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-2 text-slate-600">
                <MousePointer2 className="h-3.5 w-3.5 text-teal-700" />
                {d.results.viewer.noSelection}
              </span>
            )}
          </div>
        </div>
      )}

      <ExportDialog
        error={imageExport.error}
        hasSelection={imageExport.hasSelection}
        isExporting={imageExport.isExporting}
        isOpen={imageExport.isOpen}
        layout={imageExport.layout}
        onClose={imageExport.closeDialog}
        onExport={imageExport.runExport}
        onUpdate={imageExport.updateOptions}
        options={imageExport.options}
      />
      <MSAColorLegend scheme={colorScheme} />
    </div>
  );
}
