import { CheckCircle2, Info } from "lucide-react";
import { useMemo } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { MAX_FASTA_CHARACTERS } from "../../lib/utils/fasta";
import { validateNucleotideSubmission, nucleotideMessage } from "../../lib/submit/nucleotideInput";
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
  const { dictionary: d, locale } = useLanguage();
  const validation = useMemo(() => validateNucleotideSubmission(value), [value]);
  const hasContent = value.trim().length > 0;
  const invalidMessage = validation.invalid ? nucleotideMessage(validation.invalid, locale) : validation.characterCount > MAX_FASTA_CHARACTERS
    ? d.submit.pasteTooLong : d.submit.pasteInvalid;

  const statsText = d.submit.pasteStats
    .replace("{chars}", validation.characterCount.toLocaleString())
    .replace("{count}", validation.sequenceCount.toLocaleString());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <label className="shrink-0 text-sm font-medium text-slate-800" htmlFor="pastedSequence">
          {d.submit.pasteLabel}
        </label>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
        aria-invalid={hasContent && !validation.valid}
        onChange={(event) => onChange(event.target.value)}
        placeholder={d.submit.pastePlaceholder}
        spellCheck={false}
        value={value}
      />
      <p className="text-sm text-slate-600">{locale === "zh" ? "仅支持 DNA / RNA：A C G T U R Y S W K M B D H V N；可含缺口（-、.），大小写均可。" : "DNA / RNA only: A C G T U R Y S W K M B D H V N; gaps (-, .) and lowercase are accepted."}</p>
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
            <span>{hasContent ? invalidMessage : d.submit.pasteHint}</span>
          </span>
        )}
      </div>
    </div>
  );
}
