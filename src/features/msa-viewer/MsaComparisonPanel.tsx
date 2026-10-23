import { useMemo, useState } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { viewerText } from "../../lib/i18n/viewerWorkflow";
import type { MSASequence } from "../../lib/types/msa";
import type { ViewerState } from "./types";
import { matchesSequenceName } from "./viewerWorkflowModel";

export function MsaComparisonPanel({ rows, state, onChoose, onEnd, onPatch }: {
  rows: MSASequence[]; state: ViewerState; onChoose: (key: string) => void; onEnd: () => void; onPatch: (patch: Partial<ViewerState>) => void;
}) {
  const { dictionary: d } = useLanguage(); const t = d.viewerWorkflow;
  const [query, setQuery] = useState(""), [page, setPage] = useState(0), [chosen, setChosen] = useState(state.referenceRowKey ?? "");
  const results = useMemo(() => rows.filter(row => matchesSequenceName(row, query)), [rows, query]);
  const pages = Math.max(1, Math.ceil(results.length / 50));
  const reference = rows.find(row => row.rowKey === state.referenceRowKey);
  return <div className="msa-panel-content space-y-3">
    <h2 className="font-semibold">{t.compare}</h2><p>{t.referenceHint}</p>
    {reference && <p className="break-words text-teal-800" title={reference.id}>{reference.id}</p>}
    <label className="block">{t.referenceSearch}<input type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(0); setChosen(""); }} /></label>
    <label className="block">{t.chooseReference}<select aria-label={t.chooseReference} size={6} className="msa-reference-list" value={chosen} onChange={e => setChosen(e.target.value)}>
      <option value="" disabled>{t.chooseReference}</option>
      {results.slice(page * 50, (page + 1) * 50).map(row => <option key={row.rowKey} value={row.rowKey} title={row.id}>{row.id}</option>)}
    </select></label>
    {chosen && <p className="break-words text-sm" role="status">{rows.find(row => row.rowKey === chosen)?.id}</p>}
    {!results.length && <p role="status">{t.noMatches}</p>}
    <div className="msa-pagination"><button type="button" disabled={!page} onClick={() => { setPage(page - 1); setChosen(""); }}>{t.previous}</button><span>{viewerText(t.searchPage, { page: page + 1, pages })}</span><button type="button" disabled={page + 1 >= pages} onClick={() => { setPage(page + 1); setChosen(""); }}>{t.next}</button></div>
    <button type="button" className="msa-primary" disabled={!chosen} onClick={() => onChoose(chosen)}>{reference ? t.changeReference : t.startComparison}</button>
    {reference && <><label className="flex items-center gap-2"><input type="checkbox" checked={state.differenceMode} onChange={e => onPatch({ differenceMode: e.target.checked })} />{t.highlight}</label>
      <label className="block">{d.results.viewer.stageTwo.coordinateMode}<select aria-label={d.results.viewer.stageTwo.coordinateMode} value={state.coordinateMode} onChange={e => onPatch({ coordinateMode: e.target.value as ViewerState["coordinateMode"] })}><option value="alignment">{t.alignmentPosition}</option><option value="reference">{t.referencePosition}</option></select></label>
      <p>{t.coordinateHint}</p><button type="button" onClick={onEnd}>{t.endComparison}</button></>}
    {!reference && <p>{t.noReference}</p>}
  </div>;
}
