import { useEffect, useMemo, useRef, useState } from "react";
import { strToU8, zip } from "fflate";
import { OverlayDialog } from "../../components/common/OverlayDialog";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { viewerText } from "../../lib/i18n/viewerWorkflow";
import { resolveSequenceExport, sequenceExportText, type ExportRows, type ExportColumns, type SequenceExportSnapshot } from "./viewerWorkflowModel";

function save(data: BlobPart, filename: string) {
  const url = URL.createObjectURL(new Blob([data])); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function SequenceExportDialog({ snapshot, onClose }: { snapshot: SequenceExportSnapshot; onClose: () => void }) {
  const { dictionary: d } = useLanguage(); const t = d.viewerWorkflow;
  const [rowScope, setRows] = useState<ExportRows>(snapshot.initialRows);
  const [columnScope, setColumns] = useState<ExportColumns>(snapshot.initialColumns);
  const [busy, setBusy] = useState(false), [error, setError] = useState(false);
  const active = useRef(true);
  const cancelZip = useRef<(() => void) | null>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; cancelZip.current?.(); };
  }, [snapshot]);
  const selection = useMemo(() => resolveSequenceExport(snapshot, rowScope, columnScope), [snapshot, rowScope, columnScope]);
  const displayed = useMemo(() => new Set(snapshot.displayed), [snapshot]);
  async function download() {
    setBusy(true); setError(false);
    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (!active.current) return;
      const { fasta, mapping } = sequenceExportText(selection);
      if (mapping) {
        const bytes = await new Promise<Uint8Array>((resolve, reject) => {
          cancelZip.current = zip({ "alignment.fasta": strToU8(fasta), "columns.tsv": strToU8(mapping) }, { level: 3 }, (failure, result) => failure ? reject(failure) : resolve(result));
        });
        if (active.current) save(bytes as BlobPart, "easymsa-filtered-alignment.zip");
      } else if (active.current) save(fasta, columnScope === "interval" ? `easymsa-region-${selection.start}-${selection.end}.fasta` : "easymsa-alignment.fasta");
    } catch { if (active.current) setError(true); } finally { if (active.current) setBusy(false); }
  }
  return <OverlayDialog isOpen title={t.sequenceExport} closeLabel={t.close} onClose={onClose}>
    <div className="msa-export-selection">
      <label>{t.rowRange}<select aria-label={t.rowRange} value={rowScope} onChange={e => setRows(e.target.value as ExportRows)} disabled={busy}>
        <option value="all">{t.allRows} ({snapshot.all.length})</option><option value="displayed">{t.displayedRows} ({snapshot.displayed.length})</option><option value="selected" disabled={!snapshot.selected.length}>{t.selectedRows} ({snapshot.selected.length})</option>
      </select></label>
      <label>{t.columnRange}<select aria-label={t.columnRange} value={columnScope} onChange={e => setColumns(e.target.value as ExportColumns)} disabled={busy}>
        <option value="all">{t.allColumns}</option><option value="filtered">{t.filteredColumns}</option><option value="interval" disabled={!snapshot.range}>{t.intervalColumns}</option>
      </select></label>
      <section className="border-y border-slate-200 py-3 space-y-2" aria-live="polite">
        <strong>{viewerText(t.exportSize, { rows: selection.rows.length, columns: selection.length })}</strong>
        <p className="break-words">{t.source}: {snapshot.source}</p>
        {snapshot.stage && <p>{t.stage}: {t[snapshot.stage]}</p>}
        {selection.length > 0 && selection.contiguous && <p>{viewerText(t.continuousRange, { start: selection.start, end: selection.end })}</p>}
        {columnScope === "interval" && snapshot.positions.length < snapshot.length && <p>{t.hiddenColumnsIncluded}</p>}
        {rowScope === "selected" && selection.rows.some(row => !displayed.has(row)) && <p>{t.selectedHiddenIncluded}</p>}
        {!selection.contiguous && <p>{t.zipHint}</p>}
        {(!selection.rows.length || !selection.length) && <p>{t.emptyExport}</p>}
      </section>
      {error && <p role="alert" className="text-rose-700">{t.exportFailed}</p>}
      <button className="msa-primary" type="button" disabled={busy || !selection.rows.length || !selection.length} onClick={download}>{busy ? t.exporting : t.download}</button>
    </div>
  </OverlayDialog>;
}
