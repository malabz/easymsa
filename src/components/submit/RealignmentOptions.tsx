import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { realignText } from "../../lib/i18n/realignment";

type Props = {
  limits?: { maxSequences: number; maxColumns: number; maxCells: number };
  enabled?: boolean;
  onEnabled?: (value: boolean) => void;
  pattern: 1 | 2;
  onPattern: (value: 1 | 2) => void;
  unavailable?: boolean;
  disabled?: boolean;
};

export function RealignmentOptions({ enabled = true, onEnabled, pattern, onPattern, unavailable = false, limits, disabled = false }: Props) {
  const { locale } = useLanguage();
  const t = realignText[locale];
  const cap = limits ? (locale === "zh"
    ? `最多 ${limits.maxSequences.toLocaleString()} 条序列、${limits.maxColumns.toLocaleString()} 列、${limits.maxCells.toLocaleString()} 个比对字符。支持 ACGT 或 ACGU 和 gap（-），不支持简并碱基。`
    : `Up to ${limits.maxSequences.toLocaleString()} sequences, ${limits.maxColumns.toLocaleString()} columns, and ${limits.maxCells.toLocaleString()} alignment characters. ACGT or ACGU with gaps (-); ambiguous bases are unsupported.`) : t.limits;

  return (
    <section className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
      {!onEnabled && <h2 className="text-sm font-semibold text-slate-800">{t.inputRequirements}</h2>}
      {onEnabled && <label className="flex items-start gap-3 font-medium text-slate-900">
        <input type="checkbox" id="realignEnabled" className="mt-1 h-4 w-4 shrink-0 accent-teal-700 focus-visible:ring-2 focus-visible:ring-teal-600" checked={enabled} disabled={unavailable || disabled} onChange={event => onEnabled(event.target.checked)} />
        {t.enable}
      </label>}
      <p className="text-sm leading-6 text-slate-600">{t.caution}</p>
      {unavailable && <p role="status" className="text-sm text-amber-800">{t.unavailable}</p>}
      {enabled && <>
        <p className="text-sm leading-6 text-slate-600">{cap}</p>
        <details className="group rounded-lg border border-slate-200 bg-white/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
            <span className="flex items-center gap-2"><SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-teal-700" />{t.advanced}</span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-200 p-4">
            <label className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-800">
              {t.pattern}
              <select id="realignPattern" disabled={disabled || unavailable} className="max-w-full rounded-md border border-slate-300 bg-white p-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={pattern} onChange={event => onPattern(Number(event.target.value) as 1 | 2)}>
                <option value="1">{t.localFirst}</option><option value="2">{t.globalFirst}</option>
              </select>
            </label>
          </div>
        </details>
      </>}
    </section>
  );
}
