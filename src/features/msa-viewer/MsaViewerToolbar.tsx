import { ChevronLeft, ChevronRight, Download, LocateFixed, Search, Settings2, SlidersHorizontal, BarChart3, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { AnalysisScope, MotifMatch, MsaTrackId, ViewerState } from "./types";

export type MsaViewerToolbarProps = {
  actualScopeRowCount?: number;
  fullResultHref?: string;
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


export function MsaViewerToolbar(p: MsaViewerToolbarProps) {
  const { dictionary: d, locale } = useLanguage();
  const zh = locale === "zh";
  const t = d.results.viewer.stageTwo;
  const [searchMode, setSearchMode] = useState<"name" | "motif" | "position">("name");
  const optionsRef = useRef<HTMLDetailsElement>(null);
  const toolbarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      toolbarRef.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach(menu => {
        if (!menu.contains(event.target as Node)) menu.open = false;
      });
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  const state = p.state;
  const searchLabel = searchMode === "name" ? d.results.viewer.search : searchMode === "motif" ? d.results.viewer.motifSearch : d.results.viewer.jumpTo;
  const value = searchMode === "name" ? state.search : searchMode === "motif" ? state.motifQuery : p.jumpPosition;
  const update = (value: string) => {
    if (searchMode === "name") p.onPatch({ search: value });
    else if (searchMode === "motif") p.onPatch({ motifQuery: value, activeMotifIndex: 0 });
    else p.onJumpPositionChange(value);
  };
  const closeMenu = (button: HTMLElement) => { const details = button.closest("details"); if (details) { details.open = false; details.querySelector<HTMLElement>("summary")?.focus(); } };
  return <section data-msa-toolbar="true" ref={toolbarRef}>
    <div className="msa-command" data-msa-command-bar="true" role="toolbar" aria-label={t.commandBar}>
      <div className="msa-search">
        <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
        <select aria-label={zh ? "搜索与定位类型" : "Search and navigation type"} value={searchMode}
          onChange={event => { setSearchMode(event.target.value as typeof searchMode); if (optionsRef.current) optionsRef.current.open = false; }}>
          <option value="name">{zh ? "序列名称" : "Sequence name"}</option>
          {!p.analysisDisabled && <option value="motif">{zh ? "序列片段" : "Sequence motif"}</option>}
          <option value="position">{zh ? "位置" : "Position"}</option>
        </select>
        <input className="msa-search-input" aria-label={searchLabel} placeholder={searchMode === "name" ? d.results.viewer.searchPlaceholder : searchMode === "motif" ? d.results.viewer.motifPlaceholder : d.results.viewer.jumpPlaceholder}
          type={searchMode === "position" ? "number" : "search"} spellCheck={false} value={value} min={searchMode === "position" ? 1 : undefined} max={searchMode === "position" ? p.alignmentLength : undefined}
          aria-invalid={searchMode === "motif" && Boolean(p.motifValidationError)}
          onChange={e => update(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { if (searchMode === "position") p.onJump(); else if (searchMode === "motif" && optionsRef.current) optionsRef.current.open = true; } }} />
        {searchMode === "position" && <button type="button" className="msa-command-action" aria-label={d.results.viewer.jumpTo} onClick={p.onJump}><LocateFixed size={16}/></button>}
        {searchMode === "motif" && <details className="msa-search-options" data-msa-popup="true" ref={optionsRef}>
          <summary aria-label={zh ? "片段搜索选项与结果" : "Motif options and results"}><SlidersHorizontal size={16}/></summary>
          <div className="msa-popup">
            <label>{t.motifMatchMode}<select aria-label={t.motifMatchMode} value={state.motifMatchMode} onChange={e => p.onPatch({motifMatchMode:e.target.value as ViewerState["motifMatchMode"],activeMotifIndex:0})}>
              <option value="strict">{t.motifMatchModes.strict}</option><option value="possible">{t.motifMatchModes.possible}</option>
            </select></label>
            <label>{t.motifStrandMode}<select aria-label={t.motifStrandMode} value={state.motifStrandMode} onChange={e => p.onPatch({motifStrandMode:e.target.value as ViewerState["motifStrandMode"],activeMotifIndex:0})}>
              <option value="forward">{t.motifStrandModes.forward}</option><option value="both">{t.motifStrandModes.both}</option>
            </select></label>
            {p.motifValidationError ? <p role="alert" className="text-rose-700">{p.motifValidationError}</p> : <>
              <div className="msa-motif-nav">
                <button type="button" aria-label={t.previousMotif} disabled={!p.motifMatchCount} onClick={() => p.onMotifNavigate(-1)}><ChevronLeft size={16}/></button>
                <span className="msa-motif-count" aria-live="polite" data-msa-motif-status="true" data-msa-motif-current={p.motifMatchCount ? state.activeMotifIndex + 1 : 0} data-msa-motif-total={p.motifMatchCount}>{p.isSearchingMotif ? t.searchingMotif : `${p.motifMatchCount ? state.activeMotifIndex + 1 : 0} / ${p.motifMatchCount}`}</span>
                <button type="button" aria-label={t.nextMotif} disabled={!p.motifMatchCount} onClick={() => p.onMotifNavigate(1)}><ChevronRight size={16}/></button>
              </div>
              <select className="w-full" aria-label={t.motifHits} disabled={!p.motifMatches.length} value={p.motifMatches.length ? state.activeMotifIndex : ""} onChange={e => p.onMotifSelect(Number(e.target.value))}>
                {!p.motifMatches.length && <option value="">{t.motifHits}</option>}
                {p.motifMatches.slice(Math.max(0,state.activeMotifIndex-100),Math.max(200,state.activeMotifIndex+100)).map((match,offset) => {
                  const index=Math.max(0,state.activeMotifIndex-100)+offset;
                  return <option key={index} value={index}>{index+1}. {match.sequenceId} · {match.strand} {zh ? "链" : "strand"} · {zh ? "比对" : "alignment"} {match.alignmentStart}-{match.alignmentEnd} · {zh ? "序列" : "sequence"} {match.sequenceStart}-{match.sequenceEnd}</option>;
                })}
              </select>
              {p.motifMatchesTruncated && <p className="text-amber-700">{t.motifStoredLimit.replace("{stored}",String(p.motifMatches.length)).replace("{total}",String(p.motifMatchCount))}</p>}
            </>}
          </div>
        </details>}
      </div>
      <div className="msa-command-spacer"/>
      <div className="msa-zoom">
        <button type="button" aria-label={d.results.viewer.zoomOut} onClick={() => p.onZoom(state.zoomLevel - .1)}><ZoomOut size={17}/></button>
        <span>{state.zoomLevel.toFixed(1)}×</span>
        <button type="button" aria-label={d.results.viewer.zoomIn} onClick={() => p.onZoom(state.zoomLevel + .1)}><ZoomIn size={17}/></button>
      </div>
      <button type="button" className="msa-command-action" aria-label={t.settings} aria-controls={state.settingsOpen ? "msa-shared-panel" : undefined} aria-expanded={state.settingsOpen}
        onClick={() => p.onPatch({settingsOpen:!state.settingsOpen,inspectorOpen:false,qcPanelOpen:false})}><Settings2 size={16}/>{zh ? "视图" : "View"}</button>
      <button type="button" className="msa-command-action" aria-label={t.inspector} aria-controls={state.inspectorOpen || state.qcPanelOpen ? "msa-shared-panel" : undefined} aria-expanded={state.inspectorOpen || state.qcPanelOpen}
        onClick={() => { if (state.inspectorOpen || state.qcPanelOpen) p.onPatch({inspectorOpen:false,qcPanelOpen:false}); else { p.onPatch({settingsOpen:false}); p.onOpenInspector(); } }}><BarChart3 size={16}/>{zh ? "分析" : "Analyze"}</button>
      <details className="msa-export-menu" data-msa-popup="true">
        <summary className="msa-command-action"><Download size={16}/>{d.results.tabs.downloads === "下载结果" ? "导出" : "Export"}</summary>
        <div className="msa-popup">
          {[
            [d.results.viewer.imageExport.button,p.canExport,p.onExportImage],
            [d.results.viewer.exportVisible,p.canExport,p.onExportVisible],
            [t.exportSelectedRows,p.canExportSelectedRows,p.onExportSelectedRows],
            [d.results.viewer.exportSelectedRange,!!state.selectedRange,p.onExportSelectedRange],
            ...(!p.analysisDisabled ? [[d.results.viewer.exportConsensusRange,!!state.selectedRange,p.onExportConsensusRange]] : [])
          ].map(([label,enabled,action]) => <button key={String(label)} type="button" disabled={!enabled} onClick={e => { closeMenu(e.currentTarget); (action as () => void)(); }}>{label as string}</button>)}
          {p.fullResultHref && <a href={p.fullResultHref} download>{zh ? "下载完整结果包" : "Download full result archive"}</a>}
        </div>
      </details>
    </div>
    {p.analysisDisabled && p.neutralReason && <p role="status" className="px-4 pb-2 text-xs text-slate-600">{p.neutralReason}</p>}
  </section>;
}
