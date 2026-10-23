import { formatCitation } from "../../lib/citations";
import { useState } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { refinementText } from "../../lib/i18n/refinements";
export function CopyCitation({ title, journal, year, paper }: { title: string; journal: string; year: number; paper: string }) {
  const { locale } = useLanguage(); const t = refinementText[locale];
  const [status, setStatus] = useState<"copied" | "copyFailed" | null>(null);
  const text = formatCitation({ title, journal, year, paper });
  return <div className="mt-1"><button type="button" className="work-link" onClick={async () => { try { await navigator.clipboard.writeText(text); setStatus("copied"); } catch { setStatus("copyFailed"); } }}>{t.copyCitation}</button>{status && <p role="status" className="text-xs text-slate-500">{t[status]}</p>}{status === "copyFailed" && <textarea className="work-control !h-24" aria-label={t.copyCitation} readOnly value={text} onFocus={event => event.currentTarget.select()} />}</div>;
}
