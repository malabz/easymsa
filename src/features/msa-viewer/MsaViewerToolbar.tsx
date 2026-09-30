import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  Loader2,
  LocateFixed,
  Minimize2,
  PanelRightOpen,
  RotateCcw,
  Search,
  Settings2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode
} from "react";
import { Button } from "../../components/common/Button";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { MsaSettingsDock } from "./MsaSettingsDock";
import {
  MsaStatusChips,
  type MsaStatusChipItem
} from "./MsaStatusChips";
import type {
  AnalysisScope,
  MotifMatch,
  MsaTrackId,
  ViewerState
} from "./types";

const selectClass =
  "h-11 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";
const inputClass =
  "h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

function formatCount(template: string, count: number) {
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
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-teal-400 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-40"
      title={label}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

function useCompactSettingsSheet() {
  const read = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 1023px)").matches;
  const [matches, setMatches] = useState(read);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(max-width: 1023px)");
    const update = () => setMatches(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return matches;
}

function motifHitLabel(match: MotifMatch, index: number, coordinatesTemplate: string) {
  const alignmentStart = match.alignmentStart ?? match.start;
  const alignmentEnd =
    match.alignmentEnd ?? match.positions[match.positions.length - 1] ?? match.start;
  const sequenceStart = match.sequenceStart ?? 1;
  const sequenceEnd = match.sequenceEnd ?? sequenceStart;
  const coordinates = coordinatesTemplate
    .replace("{strand}", match.strand ?? "+")
    .replace("{alignment}", `${alignmentStart}-${alignmentEnd}`)
    .replace("{sequence}", `${sequenceStart}-${sequenceEnd}`);
  return `${index + 1}. ${match.sequenceId} · ${coordinates}`;
}

export type MsaViewerToolbarProps = {
  actualScopeRowCount?: number;
  alignmentLength: number;
  analysisDisabled?: boolean;
  canExport: boolean;
  canExportSelectedRows: boolean;
  canUndoHide?: boolean;
  hiddenCount: number;
  isSearchingMotif: boolean;
  jumpPosition: string;
  motifMatchCount: number;
  motifMatches: MotifMatch[];
  motifMatchesTruncated: boolean;
  motifValidationError?: string | null;
  neutralReason?: string | null;
  onClearColumnFilter?: () => void;
  onClearReference?: () => void;
  onClearSelectedRange?: () => void;
  onExportConsensusRange: () => void;
  onExportImage: () => void;
  onExportSelectedRange: () => void;
  onExportSelectedRows: () => void;
  onExportVisible: () => void;
  onHideSelected?: () => void;
  onJump: () => void;
  onJumpPositionChange: (value: string) => void;
  onMotifNavigate: (delta: number) => void;
  onMotifSelect: (index: number) => void;
  onOpenInspector: () => void;
  onOpenQc?: () => void;
  onPatch: (patch: Partial<ViewerState>) => void;
  onPinSelected?: () => void;
  onResetView?: () => void;
  onSelectAllVisible?: () => void;
  onShowAll: () => void;
  onToggleTrack: (track: MsaTrackId) => void;
  onToggleWorkspace?: () => void;
  onUndoHide?: () => void;
  onUnpinSelected?: () => void;
  onZoom: (nextZoom: number) => void;
  referenceLabel?: string | null;
  selectedRowCount: number;
  settingsPresentation?: "auto" | "dock" | "sheet";
  state: ViewerState;
  totalSequenceCount: number;
  visibleColumnCount: number;
  visibleSequenceCount: number;
};

export function MsaViewerToolbar({
  actualScopeRowCount,
  alignmentLength,
  analysisDisabled = false,
  canExport,
  canExportSelectedRows,
  canUndoHide,
  hiddenCount,
  isSearchingMotif,
  jumpPosition,
  motifMatchCount,
  motifMatches,
  motifMatchesTruncated,
  motifValidationError,
  neutralReason,
  onClearColumnFilter,
  onClearReference,
  onClearSelectedRange,
  onExportConsensusRange,
  onExportImage,
  onExportSelectedRange,
  onExportSelectedRows,
  onExportVisible,
  onHideSelected,
  onJump,
  onJumpPositionChange,
  onMotifNavigate,
  onMotifSelect,
  onOpenInspector,
  onOpenQc,
  onPatch,
  onPinSelected,
  onResetView,
  onSelectAllVisible,
  onShowAll,
  onToggleTrack,
  onToggleWorkspace,
  onUndoHide,
  onUnpinSelected,
  onZoom,
  referenceLabel,
  selectedRowCount,
  settingsPresentation = "auto",
  state,
  totalSequenceCount,
  visibleColumnCount,
  visibleSequenceCount
}: MsaViewerToolbarProps) {
  const { dictionary: d } = useLanguage();
  const t = d.results.viewer.stageTwo;
  const compactSettingsSheet = useCompactSettingsSheet();
  const settingsMode = settingsPresentation === "auto"
    ? compactSettingsSheet
      ? "sheet"
      : "dock"
    : settingsPresentation;
  const scopeRows =
    actualScopeRowCount ??
    (state.analysisScope === "all"
      ? totalSequenceCount
      : state.analysisScope === "visible"
        ? visibleSequenceCount
        : selectedRowCount);
  const motifResult = motifMatchCount
    ? t.motifResult
        .replace("{current}", String(Math.min(state.activeMotifIndex + 1, motifMatchCount)))
        .replace("{total}", motifMatchCount.toLocaleString())
    : d.results.viewer.motifMatchCount.replace("{count}", "0");
  const motifListStart = Math.max(
    0,
    Math.min(state.activeMotifIndex - 100, Math.max(0, motifMatches.length - 200))
  );
  const motifList = motifMatches.slice(motifListStart, motifListStart + 200);
  const scopeLabels: Record<AnalysisScope, string> = t.analysisScopes;

  const clearReference = () => {
    if (onClearReference) {
      onClearReference();
      return;
    }
    onPatch({
      coordinateMode: "alignment",
      differenceMode: false,
      referenceRowKey: null
    });
  };
  const clearRange = () => {
    if (onClearSelectedRange) {
      onClearSelectedRange();
      return;
    }
    onPatch({ selectedRange: null, selection: null });
  };
  const clearColumnFilter = () => {
    if (onClearColumnFilter) {
      onClearColumnFilter();
      return;
    }
    onPatch({ columnFilter: "all" });
  };
  const resetView = () => {
    if (onResetView) {
      onResetView();
      return;
    }
    onPatch({
      activeTracks: ["conservation", "gap"],
      analysisScope: "all",
      columnFilter: "all",
      differenceMode: false,
      hiddenRowKeys: new Set(),
      motifQuery: "",
      pinnedRowKeys: new Set(),
      referenceRowKey: null,
      search: "",
      selectedRange: null,
      selectedRowKeys: new Set(),
      selection: null,
      sortMode: "original",
      viewMode: "detail",
      zoomLevel: 1
    });
  };

  const chips: MsaStatusChipItem[] = analysisDisabled
    ? []
    : [
        {
          id: "scope",
          label: t.scopeChip
            .replace("{scope}", scopeLabels[state.analysisScope])
            .replace("{count}", scopeRows.toLocaleString()),
          onClear:
            state.analysisScope === "all"
              ? undefined
              : () => onPatch({ analysisScope: "all" }),
          clearLabel: t.clearScope,
          tone: state.analysisScope === "all" ? "default" : "info"
        }
      ];

  if (!analysisDisabled && state.referenceRowKey) {
    chips.push({
      id: "reference",
      label: t.referenceChip.replace("{value}", referenceLabel ?? state.referenceRowKey),
      onClear: clearReference,
      clearLabel: t.clearReference,
      tone: "info"
    });
  }
  if (!analysisDisabled && state.differenceMode) {
    chips.push({
      id: "difference",
      label: t.differenceChip,
      onClear: () => onPatch({ differenceMode: false }),
      clearLabel: t.disableDifference,
      tone: "info"
    });
  }
  if (!analysisDisabled && state.columnFilter !== "all") {
    chips.push({
      id: "column-filter",
      label: t.columnFilterChip.replace("{value}", d.results.viewer.columnFilters[state.columnFilter]),
      onClear: clearColumnFilter,
      clearLabel: t.clearColumnFilter,
      tone: "warning"
    });
  }
  if (hiddenCount) {
    chips.push({
      id: "hidden",
      label: formatCount(t.hiddenChip, hiddenCount),
      onClear: onShowAll,
      clearLabel: d.results.viewer.showAll,
      tone: "warning"
    });
  }
  if (selectedRowCount) {
    chips.push({
      id: "selected-rows",
      label: formatCount(t.selectedRowsChip, selectedRowCount),
      onClear: () =>
        onPatch({
          selectedRowKeys: new Set(),
          analysisScope: state.analysisScope === "selected" ? "all" : state.analysisScope
        }),
      clearLabel: t.clearSelectedRows,
      tone: "info"
    });
  }
  if (state.selectedRange) {
    const range = state.selectedRange.start === state.selectedRange.end
      ? String(state.selectedRange.start)
      : `${state.selectedRange.start}-${state.selectedRange.end}`;
    chips.push({
      id: "selected-range",
      label: t.rangeChip.replace("{range}", range),
      onClear: clearRange,
      clearLabel: d.results.viewer.clearSelection,
      tone: "info"
    });
  }
  if (!analysisDisabled) {
    state.activeTracks.forEach((track) => {
      chips.push({
        id: `track-${track}`,
        label: t.trackChip.replace("{value}", t.tracks[track]),
        onClear: () => onToggleTrack(track),
        clearLabel: t.hideTrack.replace("{value}", t.tracks[track])
      });
    });
  }

  const compactCommandTools = settingsMode === "sheet" ? (
    <div className="grid gap-3">
      <fieldset className="space-y-3 rounded-lg bg-slate-50 p-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.settingsGroups.location}
        </legend>
        {!analysisDisabled ? (
          <>
            <label className="block space-y-1 text-xs font-medium text-slate-600">
              <span>{d.results.viewer.motifSearch}</span>
              <input
                aria-invalid={Boolean(motifValidationError)}
                className={`${inputClass} w-full`}
                onChange={(event) => onPatch({ motifQuery: event.target.value, activeMotifIndex: 0 })}
                placeholder={d.results.viewer.motifPlaceholder}
                spellCheck={false}
                type="search"
                value={state.motifQuery}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label={t.motifMatchMode}
                className={`${selectClass} w-full`}
                onChange={(event) => onPatch({ activeMotifIndex: 0, motifMatchMode: event.target.value as ViewerState["motifMatchMode"] })}
                value={state.motifMatchMode}
              >
                <option value="strict">{t.motifMatchModes.strict}</option>
                <option value="possible">{t.motifMatchModes.possible}</option>
              </select>
              <select
                aria-label={t.motifStrandMode}
                className={`${selectClass} w-full`}
                onChange={(event) => onPatch({ activeMotifIndex: 0, motifStrandMode: event.target.value as ViewerState["motifStrandMode"] })}
                value={state.motifStrandMode}
              >
                <option value="forward">{t.motifStrandModes.forward}</option>
                <option value="both">{t.motifStrandModes.both}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button className="min-h-11 flex-1" disabled={!motifMatchCount} onClick={() => onMotifNavigate(-1)} size="sm" variant="outline">
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                {t.previousMotif}
              </Button>
              <Button className="min-h-11 flex-1" disabled={!motifMatchCount} onClick={() => onMotifNavigate(1)} size="sm" variant="outline">
                {t.nextMotif}
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : null}
        <div className="flex gap-2">
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
          <Button className="min-h-11 min-w-11" onClick={onJump} size="sm" variant="outline">
            <LocateFixed aria-hidden="true" className="h-4 w-4" />
            {d.results.viewer.jumpTo}
          </Button>
        </div>
      </fieldset>

      {!analysisDisabled ? (
        <fieldset className="space-y-3 rounded-lg bg-slate-50 p-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.settingsGroups.qc}
          </legend>
          <select
            aria-label={t.analysisScope}
            className={`${selectClass} w-full`}
            onChange={(event) => onPatch({ analysisScope: event.target.value as AnalysisScope })}
            value={state.analysisScope}
          >
            <option value="all">{t.analysisScopes.all}</option>
            <option value="visible">{t.analysisScopes.visible}</option>
            <option disabled={!selectedRowCount} value="selected">{t.analysisScopes.selected}</option>
          </select>
          <Button
            className="min-h-11 w-full"
            onClick={() => {
              onPatch({ settingsOpen: false });
              if (onOpenQc) onOpenQc();
              else onPatch({ qcPanelOpen: true });
            }}
            size="sm"
            variant="outline"
          >
            <Activity aria-hidden="true" className="h-4 w-4" />
            {t.qc}
          </Button>
        </fieldset>
      ) : null}

      <fieldset className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.settingsGroups.workspace}
        </legend>
        <Button
          className="min-h-11"
          onClick={() => {
            onPatch({ settingsOpen: false });
            if (onToggleWorkspace) onToggleWorkspace();
            else onPatch({ immersive: !state.immersive });
          }}
          size="sm"
          variant="outline"
        >
          {state.immersive ? <Minimize2 aria-hidden="true" className="h-4 w-4" /> : <Expand aria-hidden="true" className="h-4 w-4" />}
          {state.immersive ? t.exitWorkspace : t.expandWorkspace}
        </Button>
        <Button className="min-h-11" onClick={resetView} size="sm" variant="outline">
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          {t.resetView}
        </Button>
      </fieldset>
    </div>
  ) : undefined;

  return (
    <section
      className="overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur"
      data-msa-toolbar="true"
    >
      <div
        aria-label={t.commandBar}
        className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto p-3 lg:flex-wrap lg:overflow-visible"
        data-msa-command-bar="true"
        role="toolbar"
      >
        <label className={`relative flex-1 ${settingsMode === "sheet" ? "min-w-28" : "min-w-40 sm:max-w-64"}`}>
          <span className="sr-only">{d.results.viewer.search}</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            className={`${inputClass} w-full pl-9`}
            onChange={(event) => onPatch({ search: event.target.value })}
            placeholder={d.results.viewer.searchPlaceholder}
            type="search"
            value={state.search}
          />
        </label>

        {!analysisDisabled ? (
          <div className={`${settingsMode === "sheet" ? "hidden" : "flex"} min-w-[18rem] flex-[2_1_32rem] flex-wrap items-center gap-1.5`}>
          <label className="relative min-w-44 flex-1">
            <span className="sr-only">{d.results.viewer.motifSearch}</span>
            {isSearchingMotif ? (
              <Loader2 aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 animate-spin text-teal-600" />
            ) : (
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            )}
            <input
              aria-invalid={Boolean(motifValidationError)}
              className={`${inputClass} w-full pl-9`}
              disabled={analysisDisabled}
              onChange={(event) => onPatch({ motifQuery: event.target.value, activeMotifIndex: 0 })}
              placeholder={d.results.viewer.motifPlaceholder}
              spellCheck={false}
              type="search"
              value={state.motifQuery}
            />
          </label>
          <select
            aria-label={t.motifMatchMode}
            className={`${selectClass} max-w-32`}
            disabled={analysisDisabled}
            onChange={(event) => onPatch({ activeMotifIndex: 0, motifMatchMode: event.target.value as ViewerState["motifMatchMode"] })}
            value={state.motifMatchMode}
          >
            <option value="strict">{t.motifMatchModes.strict}</option>
            <option value="possible">{t.motifMatchModes.possible}</option>
          </select>
          <select
            aria-label={t.motifStrandMode}
            className={`${selectClass} max-w-32`}
            disabled={analysisDisabled}
            onChange={(event) => onPatch({ activeMotifIndex: 0, motifStrandMode: event.target.value as ViewerState["motifStrandMode"] })}
            value={state.motifStrandMode}
          >
            <option value="forward">{t.motifStrandModes.forward}</option>
            <option value="both">{t.motifStrandModes.both}</option>
          </select>
          <CompactIconButton disabled={!motifMatchCount} label={t.previousMotif} onClick={() => onMotifNavigate(-1)}>
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </CompactIconButton>
          <CompactIconButton disabled={!motifMatchCount} label={t.nextMotif} onClick={() => onMotifNavigate(1)}>
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </CompactIconButton>
          </div>
        ) : null}

        <div className={`${settingsMode === "sheet" ? "hidden" : "flex"} items-center gap-1`}>
          <input
            aria-label={d.results.viewer.jumpTo}
            className={`${inputClass} w-24`}
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
            <LocateFixed aria-hidden="true" className="h-4 w-4" />
          </CompactIconButton>
        </div>

        <div className="inline-flex items-center gap-1">
          <CompactIconButton disabled={state.zoomLevel <= 0.25} label={d.results.viewer.zoomOut} onClick={() => onZoom(state.zoomLevel - 0.25)}>
            <ZoomOut aria-hidden="true" className="h-4 w-4" />
          </CompactIconButton>
          <CompactIconButton label={d.results.viewer.resetZoom} onClick={() => onZoom(1)}>
            <span className="text-[11px] font-semibold">{state.zoomLevel.toFixed(1)}×</span>
          </CompactIconButton>
          <CompactIconButton disabled={state.zoomLevel >= 2.5} label={d.results.viewer.zoomIn} onClick={() => onZoom(state.zoomLevel + 0.25)}>
            <ZoomIn aria-hidden="true" className="h-4 w-4" />
          </CompactIconButton>
        </div>

        {!analysisDisabled ? (
          <select
            aria-label={t.analysisScope}
            className={`${selectClass} ${settingsMode === "sheet" ? "hidden" : "block"}`}
            onChange={(event) => onPatch({ analysisScope: event.target.value as AnalysisScope })}
            value={state.analysisScope}
          >
            <option value="all">{t.analysisScopes.all}</option>
            <option value="visible">{t.analysisScopes.visible}</option>
            <option disabled={!selectedRowCount} value="selected">{t.analysisScopes.selected}</option>
          </select>
        ) : null}

        <Button aria-label={t.inspector} className="min-h-11 min-w-11" onClick={onOpenInspector} size="sm" variant="outline">
          <PanelRightOpen aria-hidden="true" className="h-4 w-4" />
          <span className="hidden xl:inline">{t.inspector}</span>
        </Button>
        {!analysisDisabled && settingsMode !== "sheet" ? (
          <Button
            aria-label={t.qc}
            aria-pressed={state.qcPanelOpen}
            className="min-h-11 min-w-11"
            onClick={() => {
              if (onOpenQc) onOpenQc();
              else onPatch({ qcPanelOpen: !state.qcPanelOpen });
            }}
            size="sm"
            variant="outline"
          >
            <Activity aria-hidden="true" className="h-4 w-4" />
            <span className="hidden xl:inline">{t.qc}</span>
          </Button>
        ) : null}
        <Button
          aria-label={t.settings}
          aria-expanded={state.settingsOpen}
          className="min-h-11 min-w-11"
          onClick={(event) => {
            event.currentTarget.focus({ preventScroll: true });
            onPatch({ settingsOpen: !state.settingsOpen });
          }}
          size="sm"
          variant="outline"
        >
          <Settings2 aria-hidden="true" className="h-4 w-4" />
          <span className={settingsMode === "sheet" ? "hidden sm:inline" : "hidden xl:inline"}>
            {settingsMode === "sheet" ? t.moreTools : t.settings}
          </span>
        </Button>
        {settingsMode !== "sheet" ? <Button aria-label={d.results.viewer.imageExport.button} className="min-h-11 min-w-11" disabled={!canExport} onClick={onExportImage} size="sm" variant="outline">
          <Download aria-hidden="true" className="h-4 w-4" />
          <span className="hidden xl:inline">{t.exportWorkspace}</span>
        </Button> : null}
        <Button
          aria-label={state.immersive ? t.exitWorkspace : t.expandWorkspace}
          aria-pressed={state.immersive}
          className="min-h-11 min-w-11"
          onClick={() => {
            if (onToggleWorkspace) onToggleWorkspace();
            else onPatch({ immersive: !state.immersive });
          }}
          size="sm"
          variant="outline"
        >
          {state.immersive ? <Minimize2 aria-hidden="true" className="h-4 w-4" /> : <Expand aria-hidden="true" className="h-4 w-4" />}
          <span className="hidden 2xl:inline">{state.immersive ? t.exitWorkspace : t.expandWorkspace}</span>
        </Button>
        {settingsMode !== "sheet" ? <Button aria-label={t.resetView} className="min-h-11 min-w-11" onClick={resetView} size="sm" variant="ghost">
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          <span className="hidden 2xl:inline">{t.resetView}</span>
        </Button> : null}
      </div>

      {(analysisDisabled || state.motifQuery.trim() || isSearchingMotif || motifValidationError || motifMatchCount > 0) ? (
      <div className="px-3 pb-2" data-msa-motif-feedback="true">
        {analysisDisabled ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900" role="status">
            {neutralReason ?? d.results.viewer.scienceV2.neutralDescription}
          </p>
        ) : motifValidationError ? (
          <p className="text-xs font-medium text-rose-700" role="alert">{motifValidationError}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span aria-live="polite" data-msa-motif-current={motifMatchCount ? state.activeMotifIndex + 1 : 0} data-msa-motif-status="true" data-msa-motif-total={motifMatchCount}>
              {isSearchingMotif ? t.searchingMotif : motifResult}
            </span>
            <select
              aria-label={t.motifHits}
              className={`${selectClass} max-w-full flex-1 sm:max-w-[34rem]`}
              disabled={!motifMatches.length}
              onChange={(event) => onMotifSelect(Number(event.target.value))}
              value={motifMatches.length ? state.activeMotifIndex : ""}
            >
              {!motifMatches.length ? <option value="">{t.motifHits}</option> : null}
              {motifList.map((match, offset) => {
                const index = motifListStart + offset;
                return <option key={`${match.rowKey}-${match.strand}-${match.alignmentStart}-${index}`} value={index}>{motifHitLabel(match, index, t.motifCoordinates)}</option>;
              })}
            </select>
            {motifMatchesTruncated ? (
              <span className="text-amber-700">{t.motifStoredLimit.replace("{stored}", motifMatches.length.toLocaleString()).replace("{total}", motifMatchCount.toLocaleString())}</span>
            ) : null}
          </div>
        )}
      </div>
      ) : null}

      <MsaStatusChips items={chips} label={t.statusChips} />

      <MsaSettingsDock
        alignmentLength={alignmentLength}
        analysisDisabled={analysisDisabled}
        canExport={canExport}
        canExportSelectedRows={canExportSelectedRows}
        canUndoHide={canUndoHide ?? state.lastHiddenRowKeys.length > 0}
        commandTools={compactCommandTools}
        hiddenCount={hiddenCount}
        isOpen={state.settingsOpen}
        onClose={() => onPatch({ settingsOpen: false })}
        onExportConsensusRange={onExportConsensusRange}
        onExportImage={onExportImage}
        onExportSelectedRange={onExportSelectedRange}
        onExportSelectedRows={onExportSelectedRows}
        onExportVisible={onExportVisible}
        onHideSelected={onHideSelected}
        onPatch={onPatch}
        onPinSelected={onPinSelected}
        onSelectAllVisible={onSelectAllVisible}
        onShowAll={onShowAll}
        onToggleTrack={onToggleTrack}
        onUndoHide={onUndoHide}
        onUnpinSelected={onUnpinSelected}
        presentation={settingsMode}
        selectedRowCount={selectedRowCount}
        state={state}
        totalSequenceCount={totalSequenceCount}
        visibleColumnCount={visibleColumnCount}
        visibleSequenceCount={visibleSequenceCount}
      />
    </section>
  );
}
