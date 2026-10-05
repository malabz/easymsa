import { ExampleInputLoader } from "../components/submit/ExampleInputLoader";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, CheckCircle2, CircleAlert, FileText, Loader2, RefreshCw } from "lucide-react";
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

import { TaskMetadataFields } from "../components/submit/TaskMetadataFields";
import { workspaceText } from "../lib/i18n/workspace";
import { clearDraft, forgetWork, readDraft, useDraftMetadata, useDraftState, useRememberWork } from "../lib/workspace";
type Values = { jobName: string; email: string };

export function RealignPage() {
  const { locale, dictionary: d } = useLanguage();
  const t = realignText[locale];
  const w = workspaceText[locale];
  useRememberWork("realign");
  const [exampleLoaded, setExampleLoaded] = useDraftState("realign:example", false);
  const health = useServiceHealth();
  const navigate = useNavigate();
  const [file, setFile] = useDraftState<File | null>("realign:file", null);
  const [pattern, setPattern] = useDraftState<1 | 2>("realign:pattern", 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{code?: string; message: string} | null>(null);
  const inFlight = useRef(false);
  const schema = useMemo(() => taskMetadataSchema(d.submit.errors), [d]);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: readDraft("realign:metadata", { jobName: "", email: "" })
  });
  useDraftMetadata("realign:metadata", watch);
  const refinement = health.data?.realignment;
  const ready = !health.isPending && !health.isError && health.data?.acceptingJobs !== false && health.data?.coreReady === true && refinement?.enabled === true && refinement.available;
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
      clearDraft("realign"); forgetWork("realign");
      navigate(jobRoute(job.jobId, job.token!));
    } catch (e) {
      setError(e instanceof EasyMsaApiError ? {code: e.code, message: e.message} : {message: e instanceof Error ? e.message : String(e)});
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <PageContainer className="workflow-page">
      <div className="work-heading">
        <div><h1>{t.title}</h1><p>{t.description}</p></div>
        <div role="status" className="work-status" data-status={ready ? "ready" : "offline"}>
          <StatusIcon size={15} aria-hidden="true" className={health.isPending ? "animate-spin" : ""} />
          <span>{statusText}</span>
          {ready && health.data?.realignmentQueueLength != null && <span>· {d.common.queueJobs.replace("{count}", String(health.data.realignmentQueueLength))}</span>}
          {!health.isPending && !ready && <button type="button" aria-label={d.common.retry} onClick={() => health.refetch()}><RefreshCw size={14} /></button>}
        </div>
      </div>
      <form onSubmit={handleSubmit(submit)} noValidate aria-busy={busy}>
        <fieldset className="work-grid" disabled={busy}>
          <legend className="sr-only">{t.title}</legend>
          <div className="work-input">
            <div className="work-input-heading">
              <h2>{t.file}</h2>
              <ExampleInputLoader kind="realignment" disabled={busy} hasInput={Boolean(file)}
                onLoad={next => { setFile(next); setPattern(1); setError(null); setExampleLoaded(true); setValue("jobName", "Synthetic DNA refinement"); }} />
            </div>
            <FileUploadCard compact variant="realignment" file={file} disabled={busy}
              onChange={next => { setFile(next); setExampleLoaded(false); setError(null); }} />
            {exampleLoaded && file && <div className="work-feedback" role="status">
              <CheckCircle2 size={16} aria-hidden="true" /><span>{w.exampleLoaded}</span>
              <Link to="/examples/realignment-small">{w.exampleResult}</Link>
            </div>}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <p className="work-hint">{locale === "zh" ? "FASTA / FASTA.gz，序列等长，最大 100 MiB。" : "FASTA / FASTA.gz, equal-length sequences, up to 100 MiB."}</p>
              <Link className="work-link" to="/docs">{w.help}</Link>
            </div>
          </div>
          <div className="work-settings" aria-label={w.settings}>
            <TaskMetadataFields register={register} errors={errors} disabled={busy} />
            <div className="work-field"><p className="work-label">{d.submit.algorithm}</p><p className="text-sm text-slate-700">ReAlign-N</p></div>
            <RealignmentOptions limits={refinement} pattern={pattern} onPattern={setPattern} disabled={busy} />
          </div>
        </fieldset>
        {error && <p role="alert" className="work-error py-3">{error.code ? realignmentError(locale, error.code, error.message) : error.message}</p>}
        <div className="work-actionbar">
          <div className="work-summary">
            <strong><FileText size={16} />{w.summary}</strong>
            <span className="max-w-64 truncate" title={file?.name}>{file?.name || w.inputPending}</span>
            <span>ReAlign-N · {pattern === 1 ? t.localFirst : t.globalFirst}</span>
          </div>
          <Button type="submit" disabled={busy || !ready || !validation?.valid}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? t.pending : t.submit}
          </Button>
        </div>
      </form>
      <p className="work-hint mt-3">{t.citation} <a className="work-link" href="https://doi.org/10.1093/nargab/lqae170" target="_blank" rel="noreferrer">ReAlign-N</a></p>
    </PageContainer>
  );
}
