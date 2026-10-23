import { useQcDistributions } from "./useQcDistributions";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisScope, RowQcStats } from "./types";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { viewerText } from "../../lib/i18n/viewerWorkflow";
import { OverlayDialog } from "../../components/common/OverlayDialog";
import { filterAndSortRowQc, rowDifferenceCount, rowQcGapFraction, rowQcIdentity, rowQcUngappedLength, type RowQcFilters, type RowQcSortKey } from "./qcModel";
import type { QcThresholds } from "./workspaceSnapshot";
import { ThresholdForm, type ThresholdField } from "./ThresholdForm";

export type MsaQcPanelLabels = Record<string, string>;
export type MsaQcPanelProps = {
  analysisScope: AnalysisScope; scopeRowCount: number; totalRowCount: number; totalColumnCount: number; filteredColumnCount: number;
  rows: RowQcStats[]; filters: RowQcFilters; sortKey: RowQcSortKey; sortDirection: "asc" | "desc"; thresholds: QcThresholds;
  labels?: Partial<MsaQcPanelLabels>; onFiltersChange: (filters: RowQcFilters) => void;
  onSortChange: (key: RowQcSortKey, direction: "asc" | "desc") => void; onThresholdsChange?: (thresholds: QcThresholds) => void;
  onColumnThresholdsChange?: (thresholds: QcThresholds["column"]) => void; onReviewRow?: (rowKey: string) => void;
  onSelectRows?: (keys: string[]) => void; onShowRows?: (keys: string[]) => void; onUndoDisplay?: () => void;
  rowLabels?: Map<string, string>; status?: string; onRetry?: () => void;
};
const PAGE_SIZE = 50;
const fraction = (value: number | null | undefined) => value == null ? "—" : `${(100 * value).toFixed(1)}%`;
export function MsaQcPanel(p: MsaQcPanelProps) {
  const { dictionary: d } = useLanguage(); const t = d.viewerWorkflow; const q = d.results.viewer.stageTwo.qcPanel;
  const ready = p.status !== "calculating" && p.status !== "error";
  const [section, setSection] = useState<"rules" | "filters" | "distributions" | null>(null);
  const sectionTrigger = useRef<HTMLButtonElement | null>(null);
  const tableTrigger = useRef<HTMLButtonElement | null>(null);
  const [name, setName] = useState(p.filters.name);
  useEffect(() => setName(p.filters.name), [p.filters.name]);
  useEffect(() => { if (name === p.filters.name) return; const timer = setTimeout(() => p.onFiltersChange({ ...p.filters, name }), 180); return () => clearTimeout(timer); }, [name, p.filters, p.onFiltersChange]);
  const [page, setPage] = useState(0), [expanded, setExpanded] = useState(false);
  const rows = useMemo(() => filterAndSortRowQc(p.rows.map(row => ({ ...row, sequenceId: p.rowLabels?.get(row.rowKey) ?? row.sequenceId })), { filters: p.filters, sortKey: p.sortKey, direction: p.sortDirection }), [p.rows, p.filters, p.sortKey, p.sortDirection, p.rowLabels]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)); const current = Math.min(page, pages - 1);
  useEffect(() => setPage(0), [p.filters, p.sortKey, p.sortDirection, p.rows]);
  const pageRows = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const fields: ThresholdField<RowQcFilters>[] = [
    { key: "minUngappedLength", label: t.lengthMin, integer: true }, { key: "maxUngappedLength", label: t.lengthMax, integer: true },
    { key: "maxGapFraction", label: t.gapFilter, percent: true }, { key: "maxAmbiguityFraction", label: t.ambiguityFilter, percent: true },
    { key: "minGcFraction", label: t.gcMin, percent: true }, { key: "maxGcFraction", label: t.gcMax, percent: true },
    { key: "minReferenceIdentity", label: t.identityFilter, percent: true }, { key: "maxDifferenceCount", label: t.differenceMax, integer: true }
  ];
  const rules: ThresholdField<QcThresholds["row"]>[] = [
    { key: "minUngappedLength", label: t.lengthRule, integer: true }, { key: "maxGapFraction", label: t.gapRule, percent: true },
    { key: "maxAmbiguityFraction", label: t.ambiguityRule, percent: true }, { key: "minGcFraction", label: t.gcMin, percent: true },
    { key: "maxGcFraction", label: t.gcMax, percent: true }, { key: "minReferenceIdentity", label: t.identityRule, percent: true }
  ];
  function reasons(row: RowQcStats) {
    const thresholds = p.thresholds.row; const result: string[] = [];
    const low = (actual: number | null | undefined, limit: number | null, label: string) => { if (limit != null && (actual == null || actual < limit)) result.push(label); };
    const high = (actual: number | null | undefined, limit: number | null, label: string) => { if (limit != null && (actual == null || actual > limit)) result.push(label); };
    low(rowQcUngappedLength(row), thresholds.minUngappedLength, `${q.length} < ${thresholds.minUngappedLength}`);
    high(rowQcGapFraction(row), thresholds.maxGapFraction, `${q.gap} > ${fraction(thresholds.maxGapFraction)}`);
    high(row.ambiguityFraction, thresholds.maxAmbiguityFraction, `${q.ambiguity} > ${fraction(thresholds.maxAmbiguityFraction)}`);
    low(row.gcFraction, thresholds.minGcFraction, `GC < ${fraction(thresholds.minGcFraction)}`);
    high(row.gcFraction, thresholds.maxGcFraction, `GC > ${fraction(thresholds.maxGcFraction)}`);
    low(rowQcIdentity(row), thresholds.minReferenceIdentity, `${q.identity} < ${fraction(thresholds.minReferenceIdentity)}`);
    return result.join(" · ") || t.noFlag;
  }
  const pagination = <div className="msa-pagination"><button type="button" disabled={!current} onClick={() => setPage(current - 1)}>{t.previous}</button><span>{viewerText(t.searchPage, { page: current + 1, pages })}</span><button type="button" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>{t.next}</button></div>;
  const target = p.rows.find(row => row.comparisonTarget)?.comparisonTarget;
  const distribution = useQcDistributions(rows, section === "distributions");
  return <section className="msa-qc-panel msa-panel-content" aria-label={t.checks} data-msa-qc-panel="true">
    <div className="msa-check-controls">
    <p>{d.results.viewer.stageTwo.analysisScopes[p.analysisScope]} · {viewerText(t.sequenceCount, { count: p.scopeRowCount })}</p>
    {ready && <strong className="block mt-2">{viewerText(t.checkCount, { count: rows.length })}</strong>}
    {target && <p>{q.comparisonTarget}: {target === "reference" ? q.explicitReference : t.consensus}</p>}
    {p.status === "error" ? <p role="alert">{t.failed} <button type="button" onClick={p.onRetry}>{t.retry}</button></p> : p.status === "calculating" ? <p role="status">{t.loading}</p> : null}
    <label>{q.search}<input type="search" value={name} onChange={e => setName(e.target.value)} /></label>
    <div className="grid grid-cols-2 gap-2"><label>{q.sort}<select aria-label={q.sort} value={p.sortKey} onChange={e => p.onSortChange(e.target.value as RowQcSortKey, p.sortDirection)}>
      {(["original", "name", "length", "gap", "ambiguity", "gc", "identity", "differences"] as const).map(key => <option key={key} value={key}>{key === "original" ? q.originalOrder : q[key]}</option>)}
    </select></label><label>{q.direction}<select aria-label={q.direction} value={p.sortDirection} onChange={e => p.onSortChange(p.sortKey, e.target.value as "asc" | "desc")}><option value="asc">{q.ascending}</option><option value="desc">{q.descending}</option></select></label></div>
    <div className="msa-qc-actions"><button type="button" disabled={!rows.length || !p.onSelectRows} onClick={() => p.onSelectRows?.(rows.map(row => row.rowKey))}>{t.selectMatches}</button><button type="button" disabled={!rows.length || !p.onShowRows} onClick={() => p.onShowRows?.(rows.map(row => row.rowKey))}>{t.showMatches}</button>{p.onUndoDisplay && <button type="button" onClick={p.onUndoDisplay}>{t.undoDisplay}</button>}</div>
    <div className="msa-qc-tools"><button type="button" onClick={e => { sectionTrigger.current = e.currentTarget; setSection("rules"); }}>{t.rules}</button><button type="button" onClick={e => { sectionTrigger.current = e.currentTarget; setSection("filters"); }}>{t.listFilters}</button><button type="button" onClick={e => { sectionTrigger.current = e.currentTarget; setSection("distributions"); }}>{t.distributions}</button><button type="button" ref={tableTrigger} onClick={() => setExpanded(true)}>{t.fullTable}</button></div>
    </div>
    {ready && !rows.length && <p role="status">{t.noMatches}</p>}
    <ol className="msa-check-list">{pageRows.map(row => <li key={row.rowKey}>
      <div className="flex items-center gap-2"><strong className="min-w-0 flex-1 truncate" title={row.sequenceId}>{row.sequenceId}</strong><button type="button" onClick={() => p.onReviewRow?.(row.rowKey)}>{t.locate}</button></div>
      <p>{q.length}: {rowQcUngappedLength(row)} · {q.gap}: {fraction(rowQcGapFraction(row))}</p><p>{q.ambiguity}: {fraction(row.ambiguityFraction)} · {q.identity}: {fraction(rowQcIdentity(row))}</p>
      <p className={reasons(row) === t.noFlag ? "text-slate-500" : "text-amber-800"} title={t.reasons}>{reasons(row)}</p>
    </li>)}</ol>
    {ready && pagination}
    <OverlayDialog returnFocusRef={sectionTrigger} isOpen={section !== null} title={section === "rules" ? t.rules : section === "filters" ? t.listFilters : t.distributions} closeLabel={t.close} onClose={() => setSection(null)} className="!max-w-lg">
      {section === "rules" && <><p>{t.rowRuleHint}</p><ThresholdForm value={p.thresholds.row} fields={rules} onApply={row => p.onThresholdsChange?.({ ...p.thresholds, row })}/></>}
      {section === "filters" && <><p>{t.filterHint}</p><ThresholdForm value={p.filters} fields={fields} onApply={value => p.onFiltersChange({ ...p.filters, ...value })}/></>}
      {section === "distributions" && <>
        {distribution.error ? <p role="alert">{t.failed} <button type="button" onClick={distribution.retry}>{t.retry}</button></p> : !distribution.result ? <p role="status">{t.loading}</p> : distribution.result.filter(item => item.count).map(item => {
          const format = (value: number) => item.key === "length" ? String(value) : fraction(value);
          const summary = viewerText(q.distributionSummary, {metric: q[item.key as "length"], count: item.count, min: format(item.min), median: format(item.median), max: format(item.max)});
          return <figure key={item.key} className="border-b border-slate-200 py-3"><figcaption className="text-sm text-slate-600">{summary}</figcaption><div role="img" aria-label={summary} className="mt-2 flex h-10 items-end gap-1">{item.bins.map((count, index) => <span key={index} className="flex-1 bg-teal-600" style={{height:count / Math.max(1, ...item.bins) * 100 + "%"}} />)}</div></figure>;
        })}
      </>}
    </OverlayDialog>
    <OverlayDialog returnFocusRef={tableTrigger} isOpen={expanded} title={t.fullTable} closeLabel={t.close} onClose={() => setExpanded(false)} className="!max-w-5xl">
      <div className="overflow-x-auto"><table className="msa-check-table"><thead><tr>{[q.name, q.length, q.gap, q.ambiguity, q.gc, q.identity, q.differences, t.reasons, t.locate].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{pageRows.map(row => <tr key={row.rowKey}>
        <td title={row.sequenceId}>{row.sequenceId}</td><td>{rowQcUngappedLength(row)}</td><td>{fraction(rowQcGapFraction(row))}</td><td>{fraction(row.ambiguityFraction)}</td><td>{fraction(row.gcFraction)}</td><td>{fraction(rowQcIdentity(row))}</td><td>{rowDifferenceCount(row)}</td><td>{reasons(row)}</td><td><button type="button" onClick={() => { setExpanded(false); p.onReviewRow?.(row.rowKey); }}>{t.locate}</button></td>
      </tr>)}</tbody></table></div>{pagination}
    </OverlayDialog>
  </section>;
}
