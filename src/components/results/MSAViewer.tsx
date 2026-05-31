import { Columns3, LocateFixed, RotateCcw, Search, ZoomIn, ZoomOut } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { EmptyState } from "../common/EmptyState";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { MSAResult } from "../../lib/types/msa";
import { cn } from "../../lib/utils/cn";
import { baseClass, MSAColorLegend } from "./MSAColorLegend";

type Density = "comfortable" | "compact";

type ViewSettings = {
  cellWidth: number;
  cellHeight: number;
  rowHeight: number;
  fontSize: number;
  labelWidth: number;
  markerEvery: number;
};

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.1;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function getViewSettings(zoomLevel: number, density: Density): ViewSettings {
  const compact = density === "compact";
  const baseCellWidth = compact ? 14 : 20;
  const baseCellHeight = compact ? 20 : 24;
  const rowPadding = compact ? 10 : 14;

  return {
    cellWidth: Math.round(baseCellWidth * zoomLevel),
    cellHeight: Math.round(baseCellHeight * zoomLevel),
    rowHeight: Math.round(baseCellHeight * zoomLevel + rowPadding),
    fontSize: Math.max(9, Math.round((compact ? 10 : 11) * zoomLevel)),
    labelWidth: Math.round((compact ? 160 : 192) * Math.min(zoomLevel, 1.2)),
    markerEvery: zoomLevel < 0.95 ? 20 : 10
  };
}

function SequenceCells({
  sequence,
  settings
}: {
  sequence: string;
  settings: ViewSettings;
}) {
  return (
    <div className="flex min-w-max gap-0.5">
      {sequence.split("").map((base, index) => (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded border font-mono font-semibold",
            baseClass(base)
          )}
          key={`${base}-${index}`}
          style={{
            height: settings.cellHeight,
            width: settings.cellWidth,
            fontSize: settings.fontSize
          }}
        >
          {base}
        </span>
      ))}
    </div>
  );
}

function CoordinateRuler({
  length,
  settings
}: {
  length: number;
  settings: ViewSettings;
}) {
  return (
    <div className="flex min-w-max gap-0.5">
      {Array.from({ length }, (_, index) => {
        const position = index + 1;
        const showMarker =
          position === 1 ||
          position === length ||
          position % settings.markerEvery === 0;

        return (
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center border-b border-slate-200 font-mono text-[10px]",
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

export function MSAViewer({ alignment }: { alignment: MSAResult }) {
  const { dictionary: d } = useLanguage();
  const [search, setSearch] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [density, setDensity] = useState<Density>("comfortable");
  const [jumpPosition, setJumpPosition] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const viewSettings = useMemo(
    () => getViewSettings(zoomLevel, density),
    [density, zoomLevel]
  );

  const filteredSequences = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return alignment.sequences;
    }

    return alignment.sequences.filter((sequence) =>
      sequence.id.toLowerCase().includes(query)
    );
  }, [alignment.sequences, search]);

  const countText = d.results.viewer.sequenceCount
    .replace("{shown}", filteredSequences.length.toLocaleString())
    .replace("{total}", alignment.sequences.length.toLocaleString());

  const lengthText = d.results.viewer.alignmentLength.replace(
    "{length}",
    (alignment.alignmentLength ?? 0).toLocaleString()
  );
  const alignmentLength =
    alignment.alignmentLength ?? alignment.sequences[0]?.sequence.length ?? 0;
  const canUseViewerControls = alignmentLength > 0 && alignment.sequences.length > 0;

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

    scrollRef.current.scrollLeft = Math.max(
      0,
      (position - 1) * (viewSettings.cellWidth + 2)
    );
    setJumpPosition(String(position));
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
      <div className="flex flex-col gap-3 border-y border-slate-200 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label={d.results.viewer.search}
            className="h-10 w-full rounded-md border border-slate-300 bg-white/80 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={d.results.viewer.searchPlaceholder}
            value={search}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {canUseViewerControls ? (
            <>
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
            </>
          ) : null}
          <span className="rounded-md bg-white/70 px-3 py-2">{countText}</span>
          <span className="rounded-md bg-white/70 px-3 py-2">{lengthText}</span>
        </div>
      </div>

      {filteredSequences.length === 0 ? (
        <EmptyState message={d.results.viewer.noMatches} />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white/75 shadow-none">
          <div className="max-h-[34rem] overflow-auto rounded-lg" ref={scrollRef}>
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
                    length={alignmentLength}
                    settings={viewSettings}
                  />
                </div>
              </div>
              {filteredSequences.map((sequence) => (
                <div
                  key={sequence.id}
                  className="grid border-b border-slate-100 last:border-b-0"
                  style={{
                    gridTemplateColumns: `${viewSettings.labelWidth}px 1fr`
                  }}
                >
                  <div
                    className="sticky left-0 z-10 flex items-center border-r border-slate-200 bg-white px-3 font-mono text-xs font-medium text-slate-700"
                    style={{ height: viewSettings.rowHeight }}
                  >
                    <span className="truncate">{sequence.id}</span>
                  </div>
                  <div
                    className="flex items-center px-3"
                    style={{ height: viewSettings.rowHeight }}
                  >
                    <SequenceCells
                      sequence={sequence.sequence}
                      settings={viewSettings}
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
                    settings={viewSettings}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <MSAColorLegend />
    </div>
  );
}
