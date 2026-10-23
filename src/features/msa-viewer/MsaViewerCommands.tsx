import { NamedDownload } from "../../components/common/NamedDownload";
import { ChevronLeft, ChevronRight, Download, LocateFixed, Search, Settings2, SlidersHorizontal, BarChart3, ZoomIn, ZoomOut, Columns2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { viewerText } from "../../lib/i18n/viewerWorkflow";
import type { MsaViewerToolbarProps } from "./MsaViewerToolbar";
import { refinementText } from "../../lib/i18n/refinements";
import type { ViewerState } from "./types";
import { usePopupBoundary } from "../../components/common/usePopupBoundary";

export function MsaViewerToolbar(p: MsaViewerToolbarProps) {
  const { dictionary: d, locale } = useLanguage(); const w = d.viewerWorkflow, t = d.results.viewer.stageTwo;
  const [mode, setMode] = useState<"name" | "motif" | "position">(() => p.state.motifQuery ? "motif" : "name"), [page, setPage] = useState(0);
  const namePopup = useRef<HTMLDetailsElement>(null), toolbar = useRef<HTMLElement>(null);
  usePopupBoundary(toolbar);
  const s = p.state; const query = p.nameQuery ?? s.search;
  // Saved view data can arrive after the toolbar's first render.
  useEffect(() => { if (s.motifQuery) setMode("motif"); }, [s.motifQuery]);
  const results = p.nameResults ?? []; const pages = Math.max(1, Math.ceil(results.length / 50));
  useEffect(() => setPage(old => Math.min(old, pages - 1)), [pages]);
  useEffect(() => { setPage(0); if (namePopup.current) namePopup.current.open = Boolean(query.trim()); }, [query]);
  useEffect(() => {
    const outside = (event: PointerEvent) => toolbar.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach(menu => { if (!menu.contains(event.target as Node) && !(event.target as Element).closest(".msa-search-input")) menu.open = false; });
    document.addEventListener("pointerdown", outside); return () => document.removeEventListener("pointerdown", outside);
  }, []);
  function closeMenu(element: HTMLElement) { const menu = element.closest("details"); if (menu) { menu.open = false; menu.querySelector<HTMLElement>("summary")?.focus(); } }
  const label = mode === "name" ? d.results.viewer.search : mode === "motif" ? d.results.viewer.motifSearch : d.results.viewer.jumpTo;
  const searchValue = mode === "name" ? query : mode === "motif" ? s.motifQuery : p.jumpPosition;
  return <section data-msa-toolbar="true" ref={toolbar}>
    <div className="msa-command" data-msa-command-bar="true" role="toolbar" aria-label={t.commandBar}>
      <div className="msa-search"><Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
        <select aria-label={w.searchType} value={mode} onChange={e => setMode(e.target.value as typeof mode)}><option value="name">{w.nameSearch}</option>{!p.analysisDisabled && <option value="motif">{w.motifSearch}</option>}<option value="position">{w.positionSearch}</option></select>
        <input className="msa-search-input" aria-label={label} placeholder={mode === "name" ? w.namePlaceholder : mode === "motif" ? d.results.viewer.motifPlaceholder : d.results.viewer.jumpPlaceholder}
          type="search" inputMode={mode === "position" ? "numeric" : undefined} spellCheck={false} value={searchValue}
          aria-invalid={mode === "position" ? Boolean(p.jumpError) : mode === "motif" && Boolean(p.motifValidationError)}
          aria-describedby={mode === "position" ? "msa-position-feedback" : undefined}
          onFocus={() => { if (mode === "name" && namePopup.current && query.trim()) namePopup.current.open = true; }}
          onChange={e => { if (mode === "name") p.onNameQueryChange ? p.onNameQueryChange(e.target.value) : p.onPatch({ search: e.target.value }); else if (mode === "motif") p.onPatch({ motifQuery: e.target.value, activeMotifIndex: 0 }); else p.onJumpPositionChange(e.target.value); }}
          onKeyDown={e => { if (e.key === "Enter") { if (mode === "position") p.onJump(); else if (mode === "name" && results[0]) { p.onLocateName?.(results[0].key); if (namePopup.current) namePopup.current.open = false; } } }} />
        {mode === "name" && <details className="msa-search-options" data-msa-popup="true" ref={namePopup}><summary aria-label={w.nameResults.replace("{count}", String(results.length))}><ChevronRight size={16}/></summary><div className="msa-popup msa-name-results"><button type="button" className="msa-popup-dismiss" onClick={e => closeMenu(e.currentTarget)}>{w.close}</button>
          <p>{viewerText(w.nameResults, { count: results.length })}</p><label><input type="checkbox" checked={p.nameFilterEnabled ?? Boolean(s.search)} disabled={!query.trim()} onChange={e => p.onNameFilterChange?.(e.target.checked)} />{w.nameFilter}</label>
          {results.slice(page * 50, (page + 1) * 50).map(row => <button key={row.key} type="button" title={row.label} onClick={e => { closeMenu(e.currentTarget); p.onLocateName?.(row.key); }}><span className="min-w-0 truncate flex-1">{row.label}</span><span>{!row.visible && <small className="block text-slate-500">{w.notDisplayed}</small>}{row.visible ? w.locate : w.showLocate}</span></button>)}
          {!results.length && <p>{w.noMatches}</p>}
          {pages > 1 && <div className="msa-pagination"><button type="button" disabled={!page} onClick={() => setPage(page - 1)}>{w.previous}</button><span>{viewerText(w.searchPage, { page: page + 1, pages })}</span><button type="button" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>{w.next}</button></div>}
        </div></details>}
        {mode === "position" && <button type="button" className="msa-command-action" aria-label={d.results.viewer.jumpTo} onClick={p.onJump}><LocateFixed size={16}/></button>}
        {mode === "motif" && <details className="msa-search-options" data-msa-popup="true"><summary aria-label={w.moreOptions}><SlidersHorizontal size={16}/></summary><div className="msa-popup"><button type="button" className="msa-popup-dismiss" onClick={e => closeMenu(e.currentTarget)}>{w.close}</button>
          <label>{t.motifMatchMode}<select aria-label={t.motifMatchMode} value={s.motifMatchMode} onChange={e => p.onPatch({ motifMatchMode: e.target.value as ViewerState["motifMatchMode"], activeMotifIndex: 0 })}><option value="strict">{t.motifMatchModes.strict}</option><option value="possible">{t.motifMatchModes.possible}</option></select></label>
          <label>{t.motifStrandMode}<select aria-label={t.motifStrandMode} value={s.motifStrandMode} onChange={e => p.onPatch({ motifStrandMode: e.target.value as ViewerState["motifStrandMode"], activeMotifIndex: 0 })}><option value="forward">{t.motifStrandModes.forward}</option><option value="both">{t.motifStrandModes.both}</option></select></label>
          <select className="w-full" aria-label={t.motifHits} disabled={!p.motifMatches.length} value={p.motifMatches.length ? s.activeMotifIndex : ""} onChange={e => p.onMotifSelect(Number(e.target.value))}>
            {!p.motifMatches.length && <option value="">{t.motifHits}</option>}
            {p.motifMatches.slice(Math.max(0, s.activeMotifIndex - 100), Math.max(200, s.activeMotifIndex + 100)).map((match, offset) => { const index = Math.max(0, s.activeMotifIndex - 100) + offset; return <option key={index} value={index}>{index + 1}. {match.sequenceId} · {match.strand} · {w.alignmentPosition} {match.alignmentStart}–{match.alignmentEnd}</option>; })}
          </select>
          {p.motifMatches[s.activeMotifIndex] && <details><summary>{w.details}</summary><p>{w.nameSearch}: {p.motifMatches[s.activeMotifIndex].sequenceId}</p><p>{w.sequencePosition}: {p.motifMatches[s.activeMotifIndex].sequenceStart}–{p.motifMatches[s.activeMotifIndex].sequenceEnd}</p></details>}
          {p.motifMatchesTruncated && <p>{t.motifStoredLimit.replace("{stored}", String(p.motifMatches.length)).replace("{total}", String(p.motifMatchCount))}</p>}
        </div></details>}
      </div>
      {mode === "motif" && <div className="msa-motif-nav"><button type="button" aria-label={t.previousMotif} disabled={!p.motifMatches.length} onClick={() => p.onMotifNavigate(-1)}><ChevronLeft size={16}/></button><span className="msa-motif-count" aria-live="polite" data-msa-motif-status="true" data-msa-motif-current={p.motifMatches.length ? s.activeMotifIndex + 1 : 0} data-msa-motif-total={p.motifMatchCount}>{p.isSearchingMotif ? t.searchingMotif : `${p.motifMatches.length ? s.activeMotifIndex + 1 : 0} / ${p.motifMatchCount}`}</span><button type="button" aria-label={t.nextMotif} disabled={!p.motifMatches.length} onClick={() => p.onMotifNavigate(1)}><ChevronRight size={16}/></button></div>}
      <div className="msa-zoom"><button type="button" aria-label={d.results.viewer.zoomOut} onClick={() => p.onZoom(s.zoomLevel - .1)}><ZoomOut size={17}/></button><span>{s.zoomLevel.toFixed(1)}×</span><button type="button" aria-label={d.results.viewer.zoomIn} onClick={() => p.onZoom(s.zoomLevel + .1)}><ZoomIn size={17}/></button></div>
      {!p.analysisDisabled && <button type="button" className="msa-command-action" aria-label={w.compare} aria-expanded={Boolean(p.comparisonOpen)} onClick={p.onOpenComparison}><Columns2 size={16}/>{w.compare}</button>}
      <button type="button" className="msa-command-action" aria-label={w.check} aria-expanded={s.inspectorOpen || s.qcPanelOpen} onClick={() => { if (s.inspectorOpen || s.qcPanelOpen) p.onPatch({ inspectorOpen: false, qcPanelOpen: false }); else p.onOpenInspector(); }}><BarChart3 size={16}/>{w.check}</button>
      <button type="button" className="msa-command-action" aria-label={w.display} aria-expanded={s.settingsOpen} onClick={() => p.onPatch({ settingsOpen: !s.settingsOpen, inspectorOpen: false, qcPanelOpen: false })}><Settings2 size={16}/>{w.display}</button>
      <details className="msa-export-menu" data-msa-popup="true"><summary className="msa-command-action"><Download size={16}/>{w.export}</summary><div className="msa-popup"><button type="button" className="msa-popup-dismiss" onClick={e => closeMenu(e.currentTarget)}>{w.close}</button>
        {[[w.downloadSequences, p.canExport, p.onExportVisible], [w.exportImage, p.canExportImage ?? p.canExport, p.onExportImage], [w.exportSelectedRows, p.canExportSelectedRows, p.onExportSelectedRows], [w.exportSelection, Boolean(s.selectedRange), p.onExportSelectedRange], ...(!p.analysisDisabled ? [[w.exportConsensus, Boolean(s.selectedRange), p.onExportConsensusRange]] : []), [w.saveView, true, p.onSaveView]].map(([text, enabled, callback]) => <button key={String(text)} type="button" disabled={!enabled || !callback} title={!enabled ? w.selectFirst : undefined} onClick={e => { closeMenu(e.currentTarget); (callback as () => void)(); }}>{text as string}</button>)}
        {p.fullResultHref && <NamedDownload href={p.fullResultHref} name={p.fullResultName ?? 'easymsa-full-results.zip'} label={w.downloadFull}/>}
      </div></details>
    </div>
    {mode === "position" && <div className="msa-search-feedback" id="msa-position-feedback"><span>{viewerText(w.positionHint, { mode: s.coordinateMode === "reference" ? w.referencePosition : w.alignmentPosition, max: p.positionMaximum ?? p.alignmentLength })}</span>{p.jumpError && <span role="alert" className="text-rose-700">{p.jumpError}</span>}{p.onRevealPosition && <button type="button" onClick={p.onRevealPosition}>{w.revealPosition}</button>}</div>}
    {mode === "motif" && p.motifValidationError && <p role="alert" className="msa-search-feedback text-rose-700">{p.motifValidationError}</p>}
    {mode !== "motif" && s.motifQuery.trim() && <div className="msa-search-feedback" role="status"><button type="button" onClick={() => setMode("motif")}>{w.motifSearch}: {s.motifQuery} · {p.motifMatchCount}</button><button type="button" onClick={() => p.onPatch({motifQuery: "", activeMotifIndex: 0})}>{refinementText[locale].clearSearch}</button></div>}
    {p.analysisDisabled && p.neutralReason && <p role="status" className="msa-search-feedback">{p.neutralReason}</p>}
  </section>;
}
