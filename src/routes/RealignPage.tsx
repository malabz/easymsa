import { ExampleInputLoader } from "../components/submit/ExampleInputLoader";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, CircleAlert, Loader2, RefreshCw } from "lucide-react";
import { PageContainer } from "../components/layout/PageContainer";
import { Button } from "../components/common/Button";
import { FileUploadCard } from "../components/submit/FileUploadCard";
import { RealignmentOptions } from "../components/submit/RealignmentOptions";
import { useLanguage } from "../lib/i18n/useLanguage";
import { realignText, realignmentError } from "../lib/i18n/realignment";
import { useServiceHealth } from "../lib/query/useServiceHealth";
import { createRealignmentJob } from "../lib/api/jobs";
import { EasyMsaApiError } from "../lib/api/client";
import { jobRoute } from "../lib/api/tokens";
import { taskMetadataSchema } from "../lib/submit/taskMetadata";
import { validateInputFile } from "../lib/utils/fileValidation";

const inputClass = "h-10 w-full rounded-md border border-slate-300 bg-white/80 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
type Values = { jobName: string; email: string };

export function RealignPage() {
  const { locale, dictionary: d } = useLanguage();
  const t = realignText[locale];
  const health = useServiceHealth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [pattern, setPattern] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{code?: string; message: string} | null>(null);
  const inFlight = useRef(false);
  const schema = useMemo(() => taskMetadataSchema(d.submit.errors), [d]);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: { jobName: "", email: "" }
  });
  const refinement = health.data?.realignment;
  const ready = !health.isPending && !health.isError && health.data?.coreReady === true && refinement?.enabled === true && refinement.available;
  const validation = file ? validateInputFile(file, "realignment", locale) : null;
  const statusText = health.isPending ? t.checking : health.isError || !health.data?.coreReady ? t.offline : !refinement?.enabled ? t.disabled : !refinement.available ? t.unavailable : t.ready;
  const StatusIcon = health.isPending ? Loader2 : ready ? Activity : CircleAlert;

  async function submit(values: Values) {
    if (inFlight.current || !ready || !file || !validation?.valid) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const job = await createRealignmentJob(file, values.jobName, pattern, locale, values.email);
      navigate(jobRoute(job.jobId, job.token!));
    } catch (e) {
      setError(e instanceof EasyMsaApiError ? {code: e.code, message: e.message} : {message: e instanceof Error ? e.message : String(e)});
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <PageContainer className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-semibold text-slate-950">{t.title}</h1>
        <p className="text-lg leading-8 text-slate-600">{t.description}</p>
      </div>
      <section className="rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm sm:p-7">
        <form className="space-y-6" onSubmit={handleSubmit(submit)} noValidate aria-busy={busy}>
          <div role="status" className={`flex items-start justify-between gap-4 rounded-2xl border p-4 ${ready ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-white/70 p-2"><StatusIcon aria-hidden="true" className={`h-4 w-4 ${health.isPending ? "animate-spin" : ""}`} /></span>
              <div>
                <p className="font-semibold">{statusText}</p>
                {ready && <p className="mt-1 text-sm leading-6">{t.readyDescription}</p>}
                {refinement?.enabled && health.data?.realignmentQueueLength != null && <p className="mt-1 text-xs font-medium">{d.common.queueJobs.replace("{count}", String(health.data.realignmentQueueLength))}</p>}
              </div>
            </div>
            {!health.isPending && !ready && <Button variant="outline" size="sm" aria-label={d.common.retry} onClick={() => health.refetch()}><RefreshCw className="h-4 w-4" /></Button>}
          </div>
          <ExampleInputLoader kind="realignment" disabled={busy} onLoad={next=>{setFile(next);setPattern(1);setError(null);setValue("jobName","Synthetic DNA refinement");}} />
          {refinement?.enabled && <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="jobName">{d.submit.jobName}</label>
                <input id="jobName" className={inputClass} placeholder={d.submit.jobNamePlaceholder} disabled={busy} aria-invalid={Boolean(errors.jobName)} aria-describedby={errors.jobName ? "jobName-error" : undefined} {...register("jobName")} />
                {errors.jobName && <p id="jobName-error" role="alert" className="text-sm text-rose-700">{errors.jobName.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="email">{d.submit.email} <span className="font-normal text-slate-500">({d.common.optional})</span></label>
                <input id="email" type="email" className={inputClass} placeholder={d.submit.emailPlaceholder} disabled={busy} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : "email-hint"} {...register("email")} />
                {errors.email ? <p id="email-error" role="alert" className="text-sm text-rose-700">{errors.email.message}</p> : <p id="email-hint" className="text-xs leading-5 text-slate-500">{d.submit.emailHint}</p>}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-800">{t.file}</p>
              <FileUploadCard variant="realignment" file={file} disabled={busy} onChange={next => {setFile(next); setError(null);}} />
            </div>
            <RealignmentOptions limits={refinement} pattern={pattern} onPattern={setPattern} disabled={busy} />
            {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error.code ? realignmentError(locale, error.code, error.message) : error.message}</div>}
            <div className="flex justify-end">
              <Button type="submit" disabled={busy || !ready || !validation?.valid}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? t.pending : t.submit}</Button>
            </div>
          </>}
        </form>
      </section>
      <p className="text-sm leading-6 text-slate-500">{t.citation} <a className="font-medium text-teal-800 underline" href="https://doi.org/10.1093/nargab/lqae170" target="_blank" rel="noreferrer">ReAlign-N</a></p>
    </PageContainer>
  );
}
