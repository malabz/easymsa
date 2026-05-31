import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { createJob } from "../../lib/api/jobs";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { InputMethod } from "../../lib/types/job";
import { validateFasta } from "../../lib/utils/fasta";
import { validateInputFile } from "../../lib/utils/fileValidation";
import { Button } from "../common/Button";
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
  const [pastedSequence, setPastedSequence] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    formState: { errors },
    getValues,
    setValue
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      jobName: "",
      email: ""
    }
  });

  function handleMethodChange(method: InputMethod) {
    setInputMethod(method);
    setFormError(null);

    if (method === "demo" && !getValues("jobName").trim()) {
      setValue("jobName", "Demo alignment", { shouldValidate: true });
    }
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
        language: locale
      });

      navigate(`/job/${encodeURIComponent(response.jobId)}`);
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
    <section className="rounded-lg border border-slate-200/80 bg-white/55 p-5 sm:p-6">
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="jobName">
              {d.submit.jobName}
            </label>
            <input
              className="h-10 w-full rounded-md border border-slate-300 bg-white/80 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              id="jobName"
              placeholder={d.submit.jobNamePlaceholder}
              {...register("jobName")}
            />
            {errors.jobName ? (
              <p className="text-sm text-rose-700">{errors.jobName.message}</p>
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
              placeholder={d.submit.emailPlaceholder}
              type="email"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-rose-700">{errors.email.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-800">
            {d.submit.inputMethod}
          </p>
          <InputMethodTabs value={inputMethod} onChange={handleMethodChange} />
        </div>

        {inputMethod === "paste" ? (
          <PasteSequenceInput
            onChange={setPastedSequence}
            value={pastedSequence}
          />
        ) : null}

        {inputMethod === "upload" ? (
          <FileUploadCard file={file} onChange={setFile} />
        ) : null}

        {inputMethod === "demo" ? (
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
            <h3 className="text-base font-semibold text-teal-950">
              {d.submit.demoTitle}
            </h3>
            <p className="mt-2 text-sm leading-6 text-teal-900">
              {d.submit.demoDescription}
            </p>
          </div>
        ) : null}

        {formError ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {formError}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button disabled={submitting} type="submit">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? d.submit.submitting : d.common.submit}
          </Button>
        </div>
      </form>
    </section>
  );
}
