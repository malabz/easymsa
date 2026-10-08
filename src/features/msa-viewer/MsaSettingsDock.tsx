import {
  Columns3,
  Download,
  Eye,
  ImageDown,
  Pin,
  PinOff,
  Rows3,
  Undo2
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../../components/common/Button";
import { OverlayDialog } from "../../components/common/OverlayDialog";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { MsaTrackId, ViewerState } from "./types";

const selectClass =
  "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

export type MsaSettingsDockProps = {
  alignmentLength: number;
  commandTools?: ReactNode;
  analysisDisabled?: boolean;
  canExport: boolean;
  canExportSelectedRows: boolean;
  canUndoHide?: boolean;
  hiddenCount: number;
  isOpen: boolean;
  onClose: () => void;
  onExportConsensusRange: () => void;
  onExportImage: () => void;
  onExportSelectedRange: () => void;
  onExportSelectedRows: () => void;
  onExportVisible: () => void;
  onHideSelected?: () => void;
  onPatch: (patch: Partial<ViewerState>) => void;
  onPinSelected?: () => void;
  onSelectAllVisible?: () => void;
  onShowAll: () => void;
  onToggleTrack: (track: MsaTrackId) => void;
  onUndoHide?: () => void;
  onUnpinSelected?: () => void;
  presentation?: "dock" | "sheet" | "content";
  workspaceActions?: ReactNode;
  selectedRowCount: number;
  state: ViewerState;
  totalSequenceCount: number;
  visibleColumnCount: number;
  visibleSequenceCount: number;
};

function SettingsContent({
  alignmentLength,
  analysisDisabled = false,
  canExport,
  canExportSelectedRows,
  canUndoHide,
  hiddenCount,
  onExportConsensusRange,
  onExportImage,
  onExportSelectedRange,
  onExportSelectedRows,
  onExportVisible,
  onHideSelected,
  onPatch,
  onPinSelected,
  onSelectAllVisible,
  onShowAll,
  onToggleTrack,
  onUndoHide,
  onUnpinSelected,
  selectedRowCount,
  state,
  totalSequenceCount,
  visibleColumnCount,
  visibleSequenceCount
}: Omit<MsaSettingsDockProps, "isOpen" | "onClose" | "presentation">) {
  const { locale, dictionary: d } = useLanguage();
  const t = d.results.viewer.stageTwo;
  const groupClass = "msa-view-group";


  return (
    <div className="msa-view-settings">
      <details className={groupClass} open>
        <summary>{t.settingsGroups.view}</summary><div>
        <label className="block space-y-1 text-xs font-medium text-slate-600">
          <span>{t.viewMode}</span>
          <select
            aria-label={t.viewMode}
            className={selectClass}
            onChange={(event) =>
              onPatch({ viewMode: event.target.value as ViewerState["viewMode"] })
            }
            value={state.viewMode}
          >
            <option value="detail">{d.results.viewer.detailMode}</option>
            <option value="overview">{d.results.viewer.overviewMode}</option>
          </select>
        </label>
        <label className="block space-y-1 text-xs font-medium text-slate-600">
          <span>{t.labelWidth}: {state.labelWidth}px</span>
          <input
            aria-label={t.labelWidth}
            className="h-11 w-full accent-teal-700"
            max={360}
            min={104}
            onChange={(event) => onPatch({ labelWidth: Number(event.target.value) })}
            step={8}
            type="range"
            value={state.labelWidth}
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input
            checked={!state.minimapCollapsed}
            onChange={(event) => onPatch({ minimapCollapsed: !event.target.checked })}
            type="checkbox"
          />
          {t.minimap}
        </label>
        <label className="grid min-h-11 grid-cols-[auto_1fr] items-start gap-x-2 text-sm text-slate-700">
          <input
            checked={state.rangeSelectionMode}
            className="mt-1"
            onChange={(event) => onPatch({ rangeSelectionMode: event.target.checked })}
            type="checkbox"
          />
          <span>
            <span className="block">{t.rangeSelectionMode}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">{t.rangeSelectionHint}</span>
          </span>
        </label>
        {!analysisDisabled ? <>
          <label className="block space-y-1 text-xs font-medium text-slate-600">
          <span>{d.results.viewer.colorScheme}</span>
          <select
            aria-label={d.results.viewer.colorScheme}
            className={selectClass}
            onChange={(event) =>
              onPatch({ colorScheme: event.target.value as ViewerState["colorScheme"] })
            }
            value={state.colorScheme}
          >
            <option value="nucleotide">{d.results.viewer.colorSchemes.nucleotide}</option>
            <option value="purinePyrimidine">{d.results.viewer.colorSchemes.purinePyrimidine}</option>
            <option value="conservation">{d.results.viewer.colorSchemes.conservation}</option>
          </select>
          </label>
          <label className="block space-y-1 text-xs font-medium text-slate-600">
          <span>{t.coordinateMode}</span>
          <select
            aria-label={t.coordinateMode}
            className={selectClass}
            disabled={!state.referenceRowKey}
            onChange={(event) =>
              onPatch({ coordinateMode: event.target.value as ViewerState["coordinateMode"] })
            }
            value={state.coordinateMode}
          >
            <option value="alignment">{t.alignmentPosition}</option>
            <option value="reference">{t.referencePosition}</option>
          </select>
          </label>
          <label className="block space-y-1 text-xs font-medium text-slate-600">
          <span>{t.consensusMode}</span>
          <select
            aria-label={t.consensusMode}
            className={selectClass}
            onChange={(event) =>
              onPatch({ consensusMode: event.target.value as ViewerState["consensusMode"] })
            }
            value={state.consensusMode}
          >
            <option value="majority">{t.majorityConsensus}</option>
            <option value="iupac">{t.iupacConsensus}</option>
          </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input
            checked={state.differenceMode}
            disabled={!state.referenceRowKey}
            onChange={(event) => onPatch({ differenceMode: event.target.checked })}
            type="checkbox"
          />
          {t.differenceMode}
          </label>
        </> : (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            {d.results.viewer.scienceV2.neutralDescription}
          </p>
        )}
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-slate-700 hover:bg-white hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          onClick={() =>
            onPatch({ density: state.density === "compact" ? "comfortable" : "compact" })
          }
          type="button"
        >
          <Columns3 aria-hidden="true" className="h-4 w-4" />
          {d.results.viewer.density[state.density]}
        </button>
      </div></details>

      <details className={groupClass}>
        <summary>{t.settingsGroups.qc}</summary><div>
        {analysisDisabled ? (
          <p className="text-xs leading-5 text-slate-600">
            {d.results.viewer.scienceV2.neutralDescription}
          </p>
        ) : <>
          <label className="block space-y-1 text-xs font-medium text-slate-600">
            <span>{locale === "zh" ? "保守性显示" : "Conservation display"}</span>
            <select className={selectClass}
              aria-label={locale === "zh" ? "保守性显示" : "Conservation display"}
              value={state.conservationScale ?? "high"}
              onChange={(event) => onPatch({ conservationScale: event.target.value as ViewerState["conservationScale"] })}>
              <option value="high">{locale === "zh" ? "高保守区间（80–100%）" : "High conservation (80–100%)"}</option>
              <option value="full">{locale === "zh" ? "完整刻度（0–100%）" : "Full range (0–100%)"}</option>
            </select>
          </label>
          <p className="text-xs leading-5 text-slate-500">{state.conservationScale === "full"
            ? (locale === "zh" ? "按完整刻度显示各列保守性。" : "Show column conservation on the full scale.")
            : (locale === "zh" ? "放大高保守区域的差异；低于 80% 的列以琥珀色标记。" : "Magnify differences in conserved regions; columns below 80% are marked in amber.")}</p>
          {(["conservation", "gap", "coverage", "entropy"] as MsaTrackId[]).map(
          (track) => (
            <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700" key={track}>
              <input
                checked={state.activeTracks.includes(track)}
                onChange={() => onToggleTrack(track)}
                type="checkbox"
              />
              {t.tracks[track]}
            </label>
          )
        )}
          <label className="block space-y-1 text-xs font-medium text-slate-600">
          <span>{d.results.viewer.columnFilter}</span>
          <select
            aria-label={d.results.viewer.columnFilter}
            className={selectClass}
            onChange={(event) =>
              onPatch({ columnFilter: event.target.value as ViewerState["columnFilter"] })
            }
            value={state.columnFilter}
          >
            <option value="all">{d.results.viewer.columnFilters.all}</option>
            <option value="variable">{d.results.viewer.columnFilters.variable}</option>
            <option value="conserved">{d.results.viewer.columnFilters.conserved}</option>
            <option value="lowGap">{d.results.viewer.columnFilters.lowGap}</option>
            <option value="custom">{d.results.viewer.columnFilters.custom}</option>
          </select>
          </label>
          <p className="text-xs leading-5 text-slate-500">
          {d.results.viewer.visibleColumns
            .replace("{shown}", visibleColumnCount.toLocaleString())
            .replace("{total}", alignmentLength.toLocaleString())}
          </p>
        </>}
      </div></details>

      <details className={groupClass}>
        <summary>{t.settingsGroups.rows}</summary><div>
        <label className="block space-y-1 text-xs font-medium text-slate-600">
          <span>{d.results.viewer.sortBy}</span>
          <select
            aria-label={d.results.viewer.sortBy}
            className={selectClass}
            onChange={(event) =>
              onPatch({ sortMode: event.target.value as ViewerState["sortMode"] })
            }
            value={state.sortMode}
          >
            <option value="original">{d.results.viewer.sort.original}</option>
            <option value="name">{d.results.viewer.sort.name}</option>
            <option value="length">{d.results.viewer.sort.length}</option>
            {!analysisDisabled ? <>
              <option value="gap">{d.results.viewer.sort.gap}</option>
              <option value="ambiguity">{d.results.viewer.sort.ambiguity}</option>
              <option value="gc">{d.results.viewer.sort.gc}</option>
              <option value="identity">{d.results.viewer.sort.identity}</option>
            </> : null}
          </select>
        </label>
        <p className="text-xs leading-5 text-slate-500">
          {d.results.viewer.sequenceCount
            .replace("{shown}", visibleSequenceCount.toLocaleString())
            .replace("{total}", totalSequenceCount.toLocaleString())}
          {" · "}
          {t.selectedRows.replace("{count}", selectedRowCount.toLocaleString())}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button className="min-h-11" disabled={!onSelectAllVisible} onClick={onSelectAllVisible} size="sm" variant="outline">
            <Rows3 aria-hidden="true" className="h-4 w-4" />
            {t.selectAllVisible}
          </Button>
          {selectedRowCount > 0 && <>
          <Button className="min-h-11" disabled={!onHideSelected} onClick={onHideSelected} size="sm" variant="outline">
            <Eye aria-hidden="true" className="h-4 w-4" />
            {t.hideSelected}
          </Button>
          <Button className="min-h-11" disabled={!onPinSelected} onClick={onPinSelected} size="sm" variant="outline">
            <Pin aria-hidden="true" className="h-4 w-4" />
            {t.pinSelected}
          </Button>
          <Button className="min-h-11" disabled={!onUnpinSelected} onClick={onUnpinSelected} size="sm" variant="outline">
            <PinOff aria-hidden="true" className="h-4 w-4" />
            {t.unpinSelected}
          </Button>
          </>}
          <Button className="min-h-11" disabled={!hiddenCount} onClick={onShowAll} size="sm" variant="ghost">
            <Eye aria-hidden="true" className="h-4 w-4" />
            {d.results.viewer.showAll}
          </Button>
          <Button className="min-h-11" disabled={!canUndoHide || !onUndoHide} onClick={onUndoHide} size="sm" variant="ghost">
            <Undo2 aria-hidden="true" className="h-4 w-4" />
            {t.undoHide}
          </Button>
        </div>
      </div></details>


    </div>
  );
}

export function MsaSettingsDock(props: MsaSettingsDockProps) {
  const { dictionary: d } = useLanguage();
  const t = d.results.viewer.stageTwo;

  if (props.presentation === "content") return <div data-msa-settings-dock="true"><SettingsContent {...props} />{props.workspaceActions}</div>;

  if (props.presentation === "sheet") {
    return (
      <OverlayDialog
        bodyClassName="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
        closeLabel={t.closeSettings}
        description={props.analysisDisabled ? d.results.viewer.scienceV2.neutralDescription : t.settingsDescription}
        isOpen={props.isOpen}
        onClose={props.onClose}
        title={t.settings}
        variant="bottom-sheet"
      >
        {props.commandTools ? (
          <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
            {props.commandTools}
          </div>
        ) : null}
        <SettingsContent {...props} />
      </OverlayDialog>
    );
  }

  if (!props.isOpen) {
    return null;
  }

  return (
    <section
      aria-label={t.settings}
      className="border-t border-slate-200 bg-white px-3 py-3"
      data-msa-settings-dock="true"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{t.settings}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {props.analysisDisabled ? d.results.viewer.scienceV2.neutralDescription : t.settingsDescription}
          </p>
        </div>
        <Button className="min-h-11" onClick={props.onClose} size="sm" variant="ghost">
          {t.closeSettings}
        </Button>
      </div>
      {props.commandTools ? (
        <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
          {props.commandTools}
        </div>
      ) : null}
      <SettingsContent {...props} />
    </section>
  );
}
