import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Loader2, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { createJob } from "../../lib/api/jobs";
import { jobRoute } from "../../lib/api/tokens";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { useServiceHealth } from "../../lib/query/useServiceHealth";
import type {
  AlignmentAlgorithm,
  InputMethod,
  PreprocessMode
} from "../../lib/types/job";
import { validateFasta } from "../../lib/utils/fasta";
import { EXAMPLE_FASTA } from "../../lib/utils/exampleFasta";
import { validateInputFile } from "../../lib/utils/fileValidation";
import { Button } from "../common/Button";
import { ServiceStatus } from "../common/ServiceStatus";
import { FileUploadCard } from "./FileUploadCard";
import { InputMethodTabs } from "./InputMethodTabs";
import { PasteSequenceInput } from "./PasteSequenceInput";

type FormValues = {
  jobName: string;
  email: string;
};

const PUBLIC_JOB_NAME_MAX_LENGTH = 64;
const PUBLIC_JOB_NAME_PATTERN = /^[\p{L}\p{N}_ .()（）-]+$/u;

export function SubmitJobForm() {
  const { dictionary: d, locale } = useLanguage();
  const navigate = useNavigate();
  const [inputMethod, setInputMethod] = useState<InputMethod>("paste");
  const [algorithm, setAlgorithm] = useState<AlignmentAlgorithm>("auto");
  const [preprocessMode, setPreprocessMode] = useState<PreprocessMode>("audit");
  const [pastedSequence, setPastedSequence] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const serviceHealth = useServiceHealth();

  const schema = useMemo(
    () =>
      z.object({
        jobName: z
          .string()
          .trim()
          .min(1, d.submit.errors.jobName)
          .max(PUBLIC_JOB_NAME_MAX_LENGTH, d.submit.errors.jobNameLength)
          .refine((value) => !value.includes(".."), d.submit.errors.jobNameUnsafe)
          .refine(
            (value) => PUBLIC_JOB_NAME_PATTERN.test(value),
            d.submit.errors.jobNameUnsafe
          ),
        email: z
          .string()
          .trim()
          .refine(
            (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            d.submit.errors.email
          )
      }),
    [d]
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      jobName: "",
      email: ""
    }
  });

  function algorithmUnavailable(value: AlignmentAlgorithm) {
    const availability = serviceHealth.data?.algorithms[value];
    return availability === false;
  }

  const selectedAlgorithmBlocked = algorithmUnavailable(algorithm);
  const submissionBlocked =
    serviceHealth.isPending ||
    serviceHealth.isError ||
    serviceHealth.data?.acceptingJobs === false ||
    selectedAlgorithmBlocked;

  function handleMethodChange(method: InputMethod) {
    setInputMethod(method);
    setFormError(null);
  }

  async function onSubmit(values: FormValues) {
    setFormError(null);

    const fastaValidation = validateFasta(pastedSequence);
    const fileValidation = file ? validateInputFile(file) : null;

    if (inputMethod === "paste" && !fastaValidation.valid) {
      setFormError(d.submit.errors.paste);
      return;
    }

    if (inputMethod === "upload" && (!file || !fileValidation?.valid)) {
      setFormError(d.submit.errors.upload);
      return;
    }

    try {
      setSubmitting(true);
      const response = await createJob({
        jobName: values.jobName.trim(),
        inputMethod,
        pastedSequence: inputMethod === "paste" ? pastedSequence : undefined,
        file: inputMethod === "upload" ? file ?? undefined : undefined,
        fileName: inputMethod === "upload" ? file?.name : undefined,
        email: values.email.trim() || undefined,
        language: locale,
        algorithm,
        preprocessMode
      });

      navigate(
        response.token
          ? jobRoute(response.jobId, response.token)
          : `/job/${encodeURIComponent(response.jobId)}`
      );
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : d.submit.errors.submitFailed
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm sm:p-7">
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <ServiceStatus />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="jobName">
              {d.submit.jobName}
            </label>
            <input
              className="h-10 w-full rounded-md border border-slate-300 bg-white/80 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              id="jobName"
              aria-describedby={errors.jobName ? "jobName-error" : undefined}
              aria-invalid={Boolean(errors.jobName)}
              placeholder={d.submit.jobNamePlaceholder}
              {...register("jobName")}
            />
            {errors.jobName ? (
              <p className="text-sm text-rose-700" id="jobName-error" role="alert">{errors.jobName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="email">
              {d.submit.email}{" "}
              <span className="font-normal text-slate-500">
                ({d.common.optional})
              </span>
            </label>
            <input
              className="h-10 w-full rounded-md border border-slate-300 bg-white/80 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              id="email"
              aria-describedby={errors.email ? "email-error" : "email-hint"}
              aria-invalid={Boolean(errors.email)}
              placeholder={d.submit.emailPlaceholder}
              type="email"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-rose-700" id="email-error" role="alert">{errors.email.message}</p>
            ) : (
              <p className="text-xs leading-5 text-slate-500" id="email-hint">
                {d.submit.emailHint}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-800">
            {d.submit.inputMethod}
          </p>
          <InputMethodTabs value={inputMethod} onChange={handleMethodChange} />
        </div>

        <details className="group rounded-xl border border-slate-200 bg-slate-50/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-slate-800">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-teal-700" />
              {d.submit.advancedSettings}
              <span className="font-normal text-slate-500">
                · {d.submit.algorithms[algorithm]} / {d.submit.preprocessModes[preprocessMode]}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <div className="space-y-5 border-t border-slate-200 p-4">
            <div className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-center">
              <label className="text-sm font-medium text-slate-800" htmlFor="alignmentAlgorithm">
                {d.submit.algorithm}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  className="h-10 max-w-xs rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  id="alignmentAlgorithm"
                  onChange={(event) => setAlgorithm(event.target.value as AlignmentAlgorithm)}
                  value={algorithm}
                >
                  <option disabled={algorithmUnavailable("auto")} value="auto">{d.submit.algorithms.auto}</option>
                  <option disabled={algorithmUnavailable("minipoa")} value="minipoa">{d.submit.algorithms.minipoa}</option>
                  <option disabled={algorithmUnavailable("mafft")} value="mafft">{d.submit.algorithms.mafft}</option>
                </select>
                <p className="text-xs leading-5 text-slate-500">{d.submit.algorithmHint}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
              <p className="text-sm font-medium text-slate-800 sm:pt-2.5" id="preprocessModeLabel">
                {d.submit.preprocessMode}
              </p>
              <div aria-labelledby="preprocessModeLabel" className="grid gap-2 sm:grid-cols-2" role="radiogroup">
                {(["audit", "filter"] as const).map((mode) => {
                  const selected = preprocessMode === mode;
                  return (
                    <button
                      aria-checked={selected}
                      className={`rounded-md border px-3 py-2 text-left text-sm transition ${selected ? "border-teal-600 bg-teal-50 text-slate-950 ring-1 ring-teal-100" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}
                      key={mode}
                      onClick={() => setPreprocessMode(mode)}
                      role="radio"
                      type="button"
                    >
                      <span className="block font-medium">{d.submit.preprocessModes[mode]}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{d.submit.preprocessModeDescriptions[mode]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </details>

        <div
          aria-labelledby="input-tab-paste"
          hidden={inputMethod !== "paste"}
          id="input-panel-paste"
          role="tabpanel"
        >
          <PasteSequenceInput
            onChange={setPastedSequence}
            onLoadExample={() => {
              setPastedSequence(EXAMPLE_FASTA);
              setValue("jobName", d.submit.exampleJobName, { shouldValidate: true });
              setFormError(null);
            }}
            value={pastedSequence}
          />
        </div>

        <div
          aria-labelledby="input-tab-upload"
          hidden={inputMethod !== "upload"}
          id="input-panel-upload"
          role="tabpanel"
        >
          <FileUploadCard file={file} onChange={setFile} />
        </div>

        {formError ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            {formError}
          </div>
        ) : null}

        {selectedAlgorithmBlocked ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            {d.submit.selectedAlgorithmUnavailable}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button disabled={submitting || submissionBlocked} type="submit">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? d.submit.submitting : d.common.submit}
          </Button>
        </div>
      </form>
    </section>
  );
}
