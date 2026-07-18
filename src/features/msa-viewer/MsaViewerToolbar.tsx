import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Eye,
  ImageDown,
  Loader2,
  LocateFixed,
  PanelRightOpen,
  Search,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "../../components/common/Button";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { MotifMatch, MsaTrackId, ViewerState } from "./types";

const selectClass =
  "h-9 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";
const inputClass =
  "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

function replaceCount(template: string, count: number) {
  return template.replace("{count}", count.toLocaleString());
}

function CompactIconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-teal-400 hover:text-teal-800 disabled:opacity-40"
      title={label}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function MsaViewerToolbar({
  alignmentLength,
  canExport,
  canExportSelectedRows,
  hiddenCount,
  isSearchingMotif,
  jumpPosition,
  motifMatchCount,
  motifMatches,
  motifMatchesTruncated,
  onExportConsensusRange,
  onExportImage,
  onExportSelectedRange,
  onExportSelectedRows,
  onExportVisible,
  onJump,
  onJumpPositionChange,
  onMotifNavigate,
  onMotifSelect,
  onOpenInspector,
  onPatch,
  onShowAll,
  onToggleTrack,
  onZoom,
  selectedRowCount,
  state,
  totalSequenceCount,
  visibleColumnCount,
  visibleSequenceCount
}: {
  alignmentLength: number;
  canExport: boolean;
  canExportSelectedRows: boolean;
  hiddenCount: number;
  isSearchingMotif: boolean;
  jumpPosition: string;
  motifMatchCount: number;
  motifMatches: MotifMatch[];
  motifMatchesTruncated: boolean;
  onExportConsensusRange: () => void;
  onExportImage: () => void;
  onExportSelectedRange: () => void;
  onExportSelectedRows: () => void;
  onExportVisible: () => void;
  onJump: () => void;
  onJumpPositionChange: (value: string) => void;
  onMotifNavigate: (delta: number) => void;
  onMotifSelect: (index: number) => void;
  onOpenInspector: () => void;
  onPatch: (patch: Partial<ViewerState>) => void;
  onShowAll: () => void;
  onToggleTrack: (track: MsaTrackId) => void;
  onZoom: (nextZoom: number) => void;
  selectedRowCount: number;
  state: ViewerState;
  totalSequenceCount: number;
  visibleColumnCount: number;
  visibleSequenceCount: number;
}) {
  const { dictionary: d } = useLanguage();
  const t = d.results.viewer.stageTwo;
  const motifResult = motifMatchCount
    ? t.motifResult
        .replace("{current}", String(state.activeMotifIndex + 1))
        .replace("{total}", motifMatchCount.toLocaleString())
    : d.results.viewer.motifMatchCount.replace("{count}", "0");
  const motifListStart = Math.max(
    0,
    Math.min(state.activeMotifIndex - 100, Math.max(0, motifMatches.length - 200))
  );
  const motifList = motifMatches.slice(motifListStart, motifListStart + 200);

  return (
    <div className="sticky top-2 z-40 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-40 flex-1 sm:max-w-64">
          <span className="sr-only">{d.results.viewer.search}</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className={`${inputClass} w-full pl-9`}
            onChange={(event) => onPatch({ search: event.target.value })}
            placeholder={d.results.viewer.searchPlaceholder}
            type="search"
            value={state.search}
          />
        </label>

        <label className="relative min-w-44 flex-1 sm:max-w-72">
          <span className="sr-only">{d.results.viewer.motifSearch}</span>
          {isSearchingMotif ? (
            <Loader2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 animate-spin text-teal-600" />
          ) : (
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          )}
          <input
            className={`${inputClass} w-full pl-9`}
            onChange={(event) =>
              onPatch({ motifQuery: event.target.value, activeMotifIndex: 0 })
            }
            placeholder={d.results.viewer.motifPlaceholder}
            spellCheck={false}
            type="search"
            value={state.motifQuery}
          />
        </label>

        <div className="inline-flex items-center gap-1">
          <CompactIconButton
            disabled={!motifMatchCount}
            label={t.previousMotif}
            onClick={() => onMotifNavigate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </CompactIconButton>
          <CompactIconButton
            disabled={!motifMatchCount}
            label={t.nextMotif}
            onClick={() => onMotifNavigate(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </CompactIconButton>
          <span className="min-w-24 text-center text-xs text-slate-500" aria-live="polite">
            {isSearchingMotif ? t.searchingMotif : motifResult}
          </span>
          <select
            aria-label={t.motifHits}
            className={`${selectClass} max-w-48`}
            disabled={!motifMatches.length}
            onChange={(event) => onMotifSelect(Number(event.target.value))}
            value={motifMatches.length ? state.activeMotifIndex : ""}
          >
            {!motifMatches.length ? <option value="">{t.motifHits}</option> : null}
            {motifList.map((match, offset) => {
              const index = motifListStart + offset;
              return (
                <option key={`${match.sequenceId}-${match.start}-${index}`} value={index}>
                  {index + 1}. {match.sequenceId}:{match.start}
                </option>
              );
            })}
          </select>
        </div>

        {motifMatchesTruncated ? (
          <span className="text-xs text-amber-700">
            {t.motifStoredLimit.replace("{count}", motifMatches.length.toLocaleString())}
          </span>
        ) : null}

        <div className="inline-flex items-center gap-1">
          <CompactIconButton
            disabled={state.zoomLevel <= 0.25}
            label={d.results.viewer.zoomOut}
            onClick={() => onZoom(state.zoomLevel - 0.25)}
          >
            <ZoomOut className="h-4 w-4" />
          </CompactIconButton>
          <CompactIconButton
            label={d.results.viewer.resetZoom}
            onClick={() => onZoom(1)}
          >
            <span className="text-[11px] font-semibold">{state.zoomLevel.toFixed(1)}×</span>
          </CompactIconButton>
          <CompactIconButton
            disabled={state.zoomLevel >= 2.5}
            label={d.results.viewer.zoomIn}
            onClick={() => onZoom(state.zoomLevel + 0.25)}
          >
            <ZoomIn className="h-4 w-4" />
          </CompactIconButton>
        </div>

        <Button className="xl:hidden" onClick={onOpenInspector} size="sm" variant="outline">
          <PanelRightOpen className="h-4 w-4" />
          {t.inspector}
        </Button>

        <details className="group basis-full">
          <summary className="mt-1 inline-flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950">
            <SlidersHorizontal className="h-4 w-4" />
            {t.advanced}
            <span className="text-xs font-normal text-slate-400">
              {d.results.viewer.visibleColumns
                .replace("{shown}", visibleColumnCount.toLocaleString())
                .replace("{total}", alignmentLength.toLocaleString())}
            </span>
          </summary>

          <div className="mt-3 grid gap-4 border-t border-slate-200 pt-4 lg:grid-cols-4">
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {d.results.viewer.toolGroups.view}
              </legend>
              <select
                aria-label={d.results.viewer.colorScheme}
                className={`${selectClass} w-full`}
                onChange={(event) =>
                  onPatch({ colorScheme: event.target.value as ViewerState["colorScheme"] })
                }
                value={state.colorScheme}
              >
                <option value="nucleotide">{d.results.viewer.colorSchemes.nucleotide}</option>
                <option value="purinePyrimidine">{d.results.viewer.colorSchemes.purinePyrimidine}</option>
                <option value="conservation">{d.results.viewer.colorSchemes.conservation}</option>
              </select>
              <select
                aria-label={t.coordinateMode}
                className={`${selectClass} w-full`}
                disabled={!state.referenceSequenceId}
                onChange={(event) =>
                  onPatch({ coordinateMode: event.target.value as ViewerState["coordinateMode"] })
                }
                value={state.coordinateMode}
              >
                <option value="alignment">{t.alignmentPosition}</option>
                <option value="reference">{t.referencePosition}</option>
              </select>
              <select
                aria-label={t.consensusMode}
                className={`${selectClass} w-full`}
                onChange={(event) =>
                  onPatch({ consensusMode: event.target.value as ViewerState["consensusMode"] })
                }
                value={state.consensusMode}
              >
                <option value="majority">{t.majorityConsensus}</option>
                <option value="iupac">{t.iupacConsensus}</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  checked={state.differenceMode}
                  disabled={!state.referenceSequenceId}
                  onChange={(event) => onPatch({ differenceMode: event.target.checked })}
                  type="checkbox"
                />
                {t.differenceMode}
              </label>
              <button
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-teal-800"
                onClick={() =>
                  onPatch({ density: state.density === "compact" ? "comfortable" : "compact" })
                }
                type="button"
              >
                <Columns3 className="h-4 w-4" />
                {d.results.viewer.density[state.density]}
              </button>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.analysisTracks}
              </legend>
              {(["conservation", "gap", "coverage", "entropy"] as MsaTrackId[]).map((track) => (
                <label className="flex items-center gap-2 text-sm text-slate-700" key={track}>
                  <input
                    checked={state.activeTracks.includes(track)}
                    onChange={() => onToggleTrack(track)}
                    type="checkbox"
                  />
                  {t.tracks[track]}
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {d.results.viewer.toolGroups.sequences}
              </legend>
              <select
                aria-label={d.results.viewer.sortBy}
                className={`${selectClass} w-full`}
                onChange={(event) =>
                  onPatch({ sortMode: event.target.value as ViewerState["sortMode"] })
                }
                value={state.sortMode}
              >
                <option value="original">{d.results.viewer.sort.original}</option>
                <option value="name">{d.results.viewer.sort.name}</option>
                <option value="length">{d.results.viewer.sort.length}</option>
              </select>
              <select
                aria-label={d.results.viewer.columnFilter}
                className={`${selectClass} w-full`}
                onChange={(event) =>
                  onPatch({ columnFilter: event.target.value as ViewerState["columnFilter"] })
                }
                value={state.columnFilter}
              >
                <option value="all">{d.results.viewer.columnFilters.all}</option>
                <option value="variable">{d.results.viewer.columnFilters.variable}</option>
                <option value="conserved">{d.results.viewer.columnFilters.conserved}</option>
                <option value="lowGap">{d.results.viewer.columnFilters.lowGap}</option>
              </select>
              <div className="flex gap-1">
                <input
                  aria-label={d.results.viewer.jumpTo}
                  className={`${inputClass} min-w-0 flex-1`}
                  inputMode="numeric"
                  max={alignmentLength}
                  min={1}
                  onChange={(event) => onJumpPositionChange(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && onJump()}
                  placeholder={d.results.viewer.jumpPlaceholder}
                  type="number"
                  value={jumpPosition}
                />
                <CompactIconButton label={d.results.viewer.jumpTo} onClick={onJump}>
                  <LocateFixed className="h-4 w-4" />
                </CompactIconButton>
              </div>
              <p className="text-xs text-slate-500">
                {d.results.viewer.sequenceCount
                  .replace("{shown}", visibleSequenceCount.toLocaleString())
                  .replace("{total}", totalSequenceCount.toLocaleString())}
              </p>
              <Button disabled={!hiddenCount} onClick={onShowAll} size="sm" variant="ghost">
                <Eye className="h-4 w-4" />
                {d.results.viewer.showAll}
              </Button>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {d.results.viewer.toolGroups.export}
              </legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button disabled={!canExport} onClick={onExportImage} size="sm" variant="outline">
                  <ImageDown className="h-4 w-4" />
                  {d.results.viewer.imageExport.button}
                </Button>
                <Button disabled={!canExport} onClick={onExportVisible} size="sm" variant="outline">
                  <Download className="h-4 w-4" />
                  {d.results.viewer.exportVisible}
                </Button>
                <Button disabled={!state.selectedRange} onClick={onExportSelectedRange} size="sm" variant="outline">
                  <Download className="h-4 w-4" />
                  {d.results.viewer.exportSelectedRange}
                </Button>
                <Button disabled={!state.selectedRange} onClick={onExportConsensusRange} size="sm" variant="outline">
                  <Download className="h-4 w-4" />
                  {d.results.viewer.exportConsensusRange}
                </Button>
                <Button disabled={!canExportSelectedRows} onClick={onExportSelectedRows} size="sm" variant="outline">
                  <Download className="h-4 w-4" />
                  {t.exportSelectedRows}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                {replaceCount(t.selectedRows, selectedRowCount)}
              </p>
            </fieldset>
          </div>
        </details>
      </div>
    </div>
  );
}
