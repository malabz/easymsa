import { CheckCircle2, Info } from "lucide-react";
import { useMemo } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { validateFasta } from "../../lib/utils/fasta";
import { Button } from "../common/Button";

export function PasteSequenceInput({
  value,
  onChange,
  onLoadExample
}: {
  value: string;
  onChange: (value: string) => void;
  onLoadExample?: () => void;
}) {
  const { dictionary: d } = useLanguage();
  const validation = useMemo(() => validateFasta(value), [value]);
  const hasContent = value.trim().length > 0;

  const statsText = d.submit.pasteStats
    .replace("{chars}", validation.characterCount.toLocaleString())
    .replace("{count}", validation.sequenceCount.toLocaleString());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm font-medium text-slate-800" htmlFor="pastedSequence">
          {d.submit.pasteLabel}
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{statsText}</span>
          {onLoadExample ? (
            <Button className="h-8 px-2.5" onClick={onLoadExample} size="sm" variant="outline">
              {d.submit.loadExample}
            </Button>
          ) : null}
        </div>
      </div>
      <textarea
        className="min-h-72 w-full resize-y rounded-lg border border-slate-300 bg-white/80 px-4 py-3 font-mono text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        id="pastedSequence"
        aria-describedby="pastedSequence-status"
        onChange={(event) => onChange(event.target.value)}
        placeholder={d.submit.pastePlaceholder}
        spellCheck={false}
        value={value}
      />
      <div
        aria-live="polite"
        className="rounded-md border border-slate-200 bg-white/55 px-3 py-2 text-sm leading-6 text-slate-600"
        id="pastedSequence-status"
      >
        {validation.valid ? (
          <span className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {d.submit.pasteValid}
          </span>
        ) : (
          <span className="flex items-start gap-2">
            <Info className="mt-1 h-4 w-4 shrink-0 text-teal-700" />
            <span>{hasContent ? d.submit.pasteInvalid : d.submit.pasteHint}</span>
          </span>
        )}
      </div>
    </div>
  );
}
