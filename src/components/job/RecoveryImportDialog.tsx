import { useEffect, useRef, useState } from "react";
import { OverlayDialog } from "../common/OverlayDialog";
import { Button } from "../common/Button";
import { getJobStatus } from "../../lib/api/jobs";
import { readJobAccessRecords, saveJobAccess } from "../../lib/api/tokens";
import type { RecoveryEntry } from "../../lib/api/recoveryBackup";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { refinementText } from "../../lib/i18n/refinements";

export function RecoveryImportDialog({ entries, onClose }: { entries: RecoveryEntry[]; onClose: () => void }) {
  const { locale } = useLanguage(); const t = refinementText[locale];
  const [statuses, setStatuses] = useState<Record<number, "imported" | "unavailable" | "storageFailed" | "duplicate">>({});
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function verify() {
    const controller = new AbortController(); request.current = controller; setBusy(true);
    const existing = readJobAccessRecords();
    for (const [index, entry] of entries.entries()) {
      if (controller.signal.aborted) return;
      if (!entry.access || entry.duplicate) continue;
      let status: "imported" | "unavailable" | "storageFailed" | "duplicate";
      if (existing.some(item => item.jobId === entry.access!.jobId && item.token === entry.access!.token)) status = "duplicate";
      else {
        const itemController = new AbortController();
        const cancel = () => itemController.abort();
        controller.signal.addEventListener("abort", cancel, { once: true });
        const timeout = setTimeout(() => itemController.abort(), 15000);
        try {
          await getJobStatus(entry.access.jobId, entry.access.token, itemController.signal);
          if (controller.signal.aborted) return;
          status = saveJobAccess(entry.access) ? "imported" : "storageFailed";
        } catch {
          if (controller.signal.aborted) return;
          status = "unavailable";
        } finally { clearTimeout(timeout); controller.signal.removeEventListener("abort", cancel); }
      }
      setStatuses(previous => ({ ...previous, [index]: status }));
    }
    setBusy(false); setDone(true);
  }
  return <OverlayDialog isOpen title={t.recoveryPreview} closeLabel={t.cancel} onClose={() => { request.current?.abort(); onClose(); }} footer={<div className="flex justify-end gap-3"><Button variant="outline" onClick={() => { request.current?.abort(); onClose(); }}>{done ? t.completeImport : t.cancel}</Button>{!done && <Button disabled={busy || !entries.some(entry => entry.access && !entry.duplicate)} onClick={() => void verify()}>{busy ? t.verifying : t.verifyImport}</Button>}</div>}>
    <p className="text-sm text-slate-600">{t.recoveryHint}</p>
    <ol className="mt-4 divide-y divide-slate-200" aria-live="polite">{entries.map((entry, index) => <li key={index} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="min-w-0 break-all">{entry.name}</span><span>{!entry.access ? t.invalidRecord : entry.duplicate ? t.duplicate : statuses[index] ? t[statuses[index]] : t.pendingVerification}</span></li>)}</ol>
  </OverlayDialog>;
}
