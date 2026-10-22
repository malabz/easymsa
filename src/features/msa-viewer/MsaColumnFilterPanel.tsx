import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { viewerText } from "../../lib/i18n/viewerWorkflow";
import { filterColumnPositionViewForQc } from "./qcModel";
import { ThresholdForm } from "./ThresholdForm";
import type { ColumnStatsStoreV2, ViewerState } from "./types";
export function MsaColumnFilterPanel({ state, store, length, onPatch }: { state: ViewerState; store: ColumnStatsStoreV2 | null; length: number; onPatch: (patch: Partial<ViewerState>) => void }) {
  const { dictionary: d } = useLanguage(); const t = d.viewerWorkflow;
  const [mode, setMode] = useState(state.columnFilter), [draft, setDraft] = useState<typeof state.qcThresholds.column | null>(state.qcThresholds.column);
  useEffect(() => { setMode(state.columnFilter); setDraft(state.qcThresholds.column); }, [state.columnFilter, state.qcThresholds.column]);
  const count = useMemo(() => mode === "all" ? length : store && draft ? filterColumnPositionViewForQc(store, mode, draft).length : null, [store, mode, draft, length]);
  const preview = count === null ? (store && !draft ? "" : t.loading) : viewerText(t.keepColumns, { count, total: length });
  return <details className="msa-view-group"><summary>{t.showColumns}</summary><div>
    <label>{d.results.viewer.columnFilter}<select aria-label={d.results.viewer.columnFilter} value={mode} onChange={e => setMode(e.target.value as ViewerState["columnFilter"])}>{(["all", "variable", "conserved", "lowGap", "custom"] as const).map(key => <option key={key} value={key}>{d.results.viewer.columnFilters[key]}</option>)}</select></label>
    {mode === "custom" ? <ThresholdForm disabled={!store} value={state.qcThresholds.column} fields={[
      { key: "minConservation", label: t.conservationMin, percent: true }, { key: "maxGapFraction", label: t.gapFilter, percent: true },
      { key: "minCoverage", label: t.coverageMin, percent: true }, { key: "maxEntropy", label: t.entropyMax, max: 1 }, { key: "maxAmbiguityFraction", label: t.ambiguityFilter, percent: true }
    ]} onPreview={setDraft} preview={preview} onApply={column => { if (store) onPatch({ columnFilter: "custom", qcThresholds: { ...state.qcThresholds, column } }); }} />
      : <><p role="status">{preview}</p><button type="button" disabled={count === null} onClick={() => onPatch({ columnFilter: mode })}>{t.apply}</button></>}
  </div></details>;
}
