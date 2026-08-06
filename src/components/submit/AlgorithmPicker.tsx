import { Sparkles } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { AlignmentAlgorithm } from "../../lib/types/job";

type AlgorithmPickerProps = {
  value: AlignmentAlgorithm;
  isDisabled: (value: AlignmentAlgorithm) => boolean;
  onChange: (value: AlignmentAlgorithm) => void;
  labelledBy?: string;
};

export function AlgorithmPicker({
  value,
  isDisabled,
  onChange,
  labelledBy
}: AlgorithmPickerProps) {
  const { dictionary: d } = useLanguage();
  const t = d.submit;
  const options: Array<{
    value: AlignmentAlgorithm;
    label: string;
    description: string;
    recommended?: boolean;
  }> = [
    {
      value: "auto",
      label: t.algorithms.auto,
      description: t.algorithmDescriptions.auto,
      recommended: true
    },
    {
      value: "minipoa",
      label: t.algorithms.minipoa,
      description: t.algorithmDescriptions.minipoa
    },
    {
      value: "mafft",
      label: t.algorithms.mafft,
      description: t.algorithmDescriptions.mafft
    },
    {
      value: "halign3",
      label: t.algorithms.halign3,
      description: t.algorithmDescriptions.halign3
    },
    {
      value: "fmalign2_mafft",
      label: t.algorithms.fmalign2_mafft,
      description: t.algorithmDescriptions.fmalign2_mafft
    },
    {
      value: "fmalign2_halign3",
      label: t.algorithms.fmalign2_halign3,
      description: t.algorithmDescriptions.fmalign2_halign3
    }
  ];

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="space-y-2">
      <div
        aria-label={labelledBy ? undefined : t.algorithm}
        aria-labelledby={labelledBy}
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        role="radiogroup"
      >
        {options.map((option) => {
          const selected = value === option.value;
          const disabled = isDisabled(option.value);
          return (
            <button
              aria-checked={selected}
              className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                selected
                  ? "border-teal-600 bg-teal-50 text-slate-950 ring-1 ring-teal-100"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
              disabled={disabled}
              key={option.value}
              onClick={() => onChange(option.value)}
              role="radio"
              type="button"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{option.label}</span>
                {option.recommended ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                    <Sparkles className="h-3 w-3" />
                    {t.adaptiveBadge}
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
      {selectedOption ? (
        <div
          aria-live="polite"
          className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs leading-5 text-slate-600"
          role="note"
        >
          <span className="font-medium text-slate-700">{t.dataFitLabel}: </span>
          {t.algorithmDataFit[selectedOption.value]}
        </div>
      ) : null}
    </div>
  );
}
