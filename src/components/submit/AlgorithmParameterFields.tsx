import { RotateCcw } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type {
  AlgorithmParameterDraft,
  AlgorithmParameterError
} from "../../lib/submit/algorithmParameters";
import type { AlignmentAlgorithm, MafftMode } from "../../lib/types/job";

type ParameterError = {
  field: "thread" | "mafftMaxiterate";
  error: AlgorithmParameterError;
} | null;

type AlgorithmParameterFieldsProps = {
  algorithm: AlignmentAlgorithm;
  error: ParameterError;
  maxThreadPerJob: number | null;
  onChange: (value: AlgorithmParameterDraft) => void;
  onReset: () => void;
  value: AlgorithmParameterDraft;
};

export function AlgorithmParameterFields({
  algorithm,
  error,
  maxThreadPerJob,
  onChange,
  onReset,
  value
}: AlgorithmParameterFieldsProps) {
  const { dictionary: d } = useLanguage();
  const t = d.submit.algorithmParameters;
  const threadError = error?.field === "thread" ? t.errors[error.error] : null;
  const maxiterateError =
    error?.field === "mafftMaxiterate" ? t.errors[error.error] : null;
  const threadHint =
    maxThreadPerJob === null
      ? t.threadHint
      : t.threadHintWithMax.replace("{max}", String(maxThreadPerJob));

  function update(patch: Partial<AlgorithmParameterDraft>) {
    onChange({ ...value, ...patch });
  }

  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white/80 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">
        {t.title}
      </legend>
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <p className="max-w-2xl text-xs leading-5 text-slate-500">{t.hint}</p>
        <button
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md px-2.5 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-200"
          onClick={onReset}
          type="button"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t.reset}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-800" htmlFor="algorithmThread">
            {t.thread}
          </label>
          <input
            aria-describedby={threadError ? "algorithmThread-error" : "algorithmThread-hint"}
            aria-invalid={Boolean(threadError)}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            id="algorithmThread"
            inputMode="numeric"
            max={maxThreadPerJob ?? undefined}
            min={1}
            onChange={(event) => update({ thread: event.target.value })}
            placeholder={t.serverDefault}
            step={1}
            type="number"
            value={value.thread}
          />
          {threadError ? (
            <p className="text-xs leading-5 text-rose-700" id="algorithmThread-error" role="alert">
              {threadError}
            </p>
          ) : (
            <p className="text-xs leading-5 text-slate-500" id="algorithmThread-hint">
              {threadHint}
            </p>
          )}
        </div>

        {algorithm === "mafft" ? (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-800" htmlFor="mafftMode">
                {t.mafftMode}
              </label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                id="mafftMode"
                onChange={(event) => update({ mafftMode: event.target.value as MafftMode })}
                value={value.mafftMode}
              >
                {(Object.keys(t.mafftModes) as MafftMode[]).map((mode) => (
                  <option key={mode} value={mode}>{t.mafftModes[mode]}</option>
                ))}
              </select>
              <p className="text-xs leading-5 text-slate-500">
                {t.mafftModeDescriptions[value.mafftMode]}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-800" htmlFor="mafftMaxiterate">
                {t.maxiterate}
              </label>
              <input
                aria-describedby={maxiterateError ? "mafftMaxiterate-error" : "mafftMaxiterate-hint"}
                aria-invalid={Boolean(maxiterateError)}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                id="mafftMaxiterate"
                inputMode="numeric"
                max={1000}
                min={0}
                onChange={(event) => update({ mafftMaxiterate: event.target.value })}
                placeholder={t.serverDefault}
                step={1}
                type="number"
                value={value.mafftMaxiterate}
              />
              {maxiterateError ? (
                <p className="text-xs leading-5 text-rose-700" id="mafftMaxiterate-error" role="alert">
                  {maxiterateError}
                </p>
              ) : (
                <p className="text-xs leading-5 text-slate-500" id="mafftMaxiterate-hint">
                  {t.maxiterateHint}
                </p>
              )}
            </div>

            <label className="flex cursor-pointer gap-3 rounded-md border border-slate-200 bg-slate-50/80 p-3 sm:self-start">
              <input
                checked={value.mafftReorder}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                onChange={(event) => update({ mafftReorder: event.target.checked })}
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800">{t.reorder}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{t.reorderHint}</span>
              </span>
            </label>
          </>
        ) : null}
      </div>
    </fieldset>
  );
}
