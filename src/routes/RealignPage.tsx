import { ExampleInputLoader } from "../components/submit/ExampleInputLoader";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, CheckCircle2, CircleAlert, FileText, Loader2, RefreshCw, ChevronDown, SlidersHorizontal, ShieldCheck } from "lucide-react";
import { PageContainer } from "../components/layout/PageContainer";
import { Button } from "../components/common/Button";
import { InputMethodTabs } from "../components/submit/InputMethodTabs";
import { estimateFastaSequenceCount } from "../lib/utils/fasta";
import { FileUploadCard } from "../components/submit/FileUploadCard";

import { useLanguage } from "../lib/i18n/useLanguage";
import { realignText } from "../lib/i18n/realignment";
import { apiErrorMessage } from "../lib/i18n/apiErrors";
import { useServiceHealth } from "../lib/query/useServiceHealth";
import { createRealignmentJob } from "../lib/api/jobs";
import { jobRoute } from "../lib/api/tokens";
import { taskMetadataSchema } from "../lib/submit/taskMetadata";
import { focusFormField } from "../lib/submit/formFocus";
import { validateAlignedPaste } from "../lib/submit/alignedPaste";
import { readInputText } from "../lib/submit/readInputText";
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
  const [inputMethod, setInputMethod] = useDraftState<"paste" | "upload">("realign:inputMethod", file ? "upload" : "paste");
  const [pastedFasta, setPastedFasta] = useDraftState("realign:paste", "");
  const pastedFile = useMemo(() => pastedFasta.trim()
    ? new File([pastedFasta], "pasted-alignment.fasta", { type: "text/plain" }) : null, [pastedFasta]);
  const activeFile = inputMethod === "paste" ? pastedFile : file;
  const sequenceCount = useMemo(() => estimateFastaSequenceCount(pastedFasta), [pastedFasta]);
  const inputSummary = inputMethod === "paste"
    ? pastedFile ? (locale === "zh" ? `粘贴 FASTA · ${sequenceCount.toLocaleString()} 条序列` : `Pasted FASTA · ${sequenceCount.toLocaleString()} sequences`) : w.inputPending
    : file?.name || w.inputPending;
  const [pattern, setPattern] = useDraftState<1 | 2>("realign:pattern", 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const inFlight = useRef(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const schema = useMemo(() => taskMetadataSchema(d.submit.errors), [d]);
  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema), shouldFocusError: false, defaultValues: readDraft("realign:metadata", { jobName: "", email: "" })
  });
  useDraftMetadata("realign:metadata", watch);
  const refinement = health.data?.realignment;
  const serviceState = health.isPending ? "checking"
    : health.isError || health.data?.coreReady !== true ? "offline"
    : !refinement?.enabled ? "disabled"
    : !refinement.available ? "unavailable" : "ready";
  const paused = health.data?.acceptingJobs === false;
  const ready = serviceState === "ready" && !paused;
  const validation = activeFile ? validateInputFile(activeFile, "realignment", locale) : null;
  const pasteValidation = useMemo(() => validateAlignedPaste(pastedFasta, locale), [pastedFasta, locale]);
  const validInput = Boolean(validation?.valid && (inputMethod !== "paste" || pasteValidation.valid));
  const statusText = paused ? (locale === "zh" ? "服务维护中，暂不接收新任务。" : "Submissions are paused for maintenance.") : t[serviceState];
  const StatusIcon = health.isPending ? Loader2 : ready ? Activity : CircleAlert;
  const name = watch("jobName");
  const email = watch("email");
  const hasDraft = Boolean(file || pastedFasta.trim() || name.trim() || email.trim() || pattern !== 1);

  useEffect(() => {
    if (!error) return;
    const frame = requestAnimationFrame(() => focusFormField(settingsRef.current, "realignment-error"));
    return () => cancelAnimationFrame(frame);
  }, [error]);

  function suggestName(input: HTMLInputElement) {
    if (getValues("jobName").trim()) return false;
    const now = new Date();
    const pad = (v: number) => String(v).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const name = `${locale === "zh" ? "重比对任务" : "Realignment"}-${stamp}`;
    setValue("jobName", name, { shouldDirty: true });
    input.value = name; input.select(); return true;
  }
  function focusInvalid(invalid: { jobName?: unknown; email?: unknown }) {
    focusFormField(settingsRef.current, invalid.jobName ? "jobName" : "email");
  }

  async function submit(values: Values) {
    if (inFlight.current || !ready || !activeFile || !validInput) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const job = await createRealignmentJob(activeFile, values.jobName, pattern, locale, values.email);
      clearDraft("realign"); forgetWork("realign");
      navigate(jobRoute(job.jobId, job.token!));
    } catch (e) {
      setError(e);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <PageContainer className="workflow-page submission-page realignment-page">
      <div className="work-heading">
        <div><h1>{t.title}</h1><p>{locale === "zh" ? "上传或粘贴已比对序列，优化比对结果。" : "Upload or paste aligned sequences to refine the alignment."}</p></div>
        <div role="status" className="work-status" data-status={ready ? "ready" : "offline"}>
          <StatusIcon size={15} aria-hidden="true" className={health.isPending ? "animate-spin" : ""} />
          <span>{statusText}</span>
          {ready && health.data?.realignmentQueueLength != null && <span>· {d.common.queueJobs.replace("{count}", String(health.data.realignmentQueueLength))}</span>}
          {!health.isPending && !ready && <button type="button" aria-label={d.common.retry} onClick={() => health.refetch()}><RefreshCw size={14} /></button>}
        </div>
      </div>
      <form className="submission-form realignment-form" onSubmit={handleSubmit(submit, focusInvalid)} noValidate aria-busy={busy}>
        <fieldset className="work-grid" disabled={busy}>
          <legend className="sr-only">{t.title}</legend>
          <div className="work-input">
            <div className="work-input-heading">
              <h2>{locale === "zh" ? "已比对序列" : "Aligned sequences"}</h2>
              <ExampleInputLoader kind="realignment" disabled={busy} hasInput={hasDraft}
                onLoad={async next => { if (inputMethod === "paste") setPastedFasta(await readInputText(next)); else setFile(next); setPattern(1); setError(null); setExampleLoaded(true); setValue("jobName", "Synthetic DNA refinement"); }} />
            </div>
            <InputMethodTabs value={inputMethod} onChange={method => { setInputMethod(method); setExampleLoaded(false); setError(null); }} />
            <div id="input-panel-paste" role="tabpanel" aria-labelledby="input-tab-paste" hidden={inputMethod !== "paste"}>
              <div className="work-paste"><div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <label className="work-label" htmlFor="alignedFasta">{locale === "zh" ? "FASTA 序列" : "FASTA sequences"}</label>
                  <span className="work-hint">{locale === "zh" ? `字符数：${pastedFasta.length.toLocaleString()} · 序列数：${sequenceCount.toLocaleString()}` : `${pastedFasta.length.toLocaleString()} characters · ${sequenceCount.toLocaleString()} sequences`}</span>
                </div>
                <textarea id="alignedFasta" className="work-control font-mono" value={pastedFasta} disabled={busy}
                  aria-describedby="alignedFasta-hint alignedFasta-validation" aria-invalid={Boolean(pastedFile && !validInput && inputMethod === "paste")}
                  placeholder={">seq1\nACGT-ACGT\n>seq2\nACGTTAC-T"}
                  onChange={event => { setPastedFasta(event.target.value); setExampleLoaded(false); setError(null); }} />
                <p id="alignedFasta-hint" className="work-hint mt-2">{locale === "zh" ? "各序列应等长，请保留缺口符号“-”。" : "Sequences must have equal lengths. Preserve gap characters (-)."}</p>
                <p id="alignedFasta-validation" className={pastedFile && !validInput ? "work-error" : "work-hint"} aria-live="polite">
                  {inputMethod === "paste" && pastedFile && (!validation?.valid ? validation?.errors[0] : pasteValidation.message)}
                </p>
              </div></div>
            </div>
            <div id="input-panel-upload" role="tabpanel" aria-labelledby="input-tab-upload" hidden={inputMethod !== "upload"}>
              <div className="realignment-upload"><FileUploadCard compact variant="realignment" file={file} disabled={busy}
                onChange={next => { setFile(next); setExampleLoaded(false); setError(null); }} /></div>
            </div>
            {exampleLoaded && activeFile && <div className="work-feedback" role="status">
              <CheckCircle2 size={16} aria-hidden="true" /><span>{w.exampleLoaded}</span>
              <Link to="/examples/realignment-small">{w.exampleResult}</Link>
            </div>}
            <div className="submission-input-notes">
              <Link className="work-link" to="/docs">{w.help}</Link>
              <p className="submission-audit-note"><ShieldCheck size={14} aria-hidden="true" />{locale === "zh" ? "初始结果会保留。" : "The initial alignment is retained."}</p>
            </div>
          </div>
          <div className="work-settings" aria-label={w.settings} ref={settingsRef}>
            <h2 className="submission-settings-heading">{w.settings}</h2>
            <div className="submission-metadata"><TaskMetadataFields register={register} errors={errors} disabled={busy} onSuggestName={suggestName} /></div>
            <details className="work-parameters group">
              <summary><span><SlidersHorizontal size={16} />{locale === "zh" ? "高级设置" : "Advanced settings"}</span><ChevronDown size={16} className="group-open:rotate-180" /></summary>
              <div className="work-field py-3">
                <label className="work-label" htmlFor="realignPattern">{t.pattern}</label>
                <select className="work-control" id="realignPattern" value={pattern} disabled={busy} onChange={e => setPattern(Number(e.target.value) as 1 | 2)}>
                  <option value="1">{t.localFirst}</option><option value="2">{t.globalFirst}</option>
                </select>
              </div>
            </details>
            <section className="realignment-requirements" aria-label={t.inputRequirements}>
              <h3 className="work-label">{locale === "zh" ? "输入要求" : "Input requirements"}</h3>
              <p className="work-hint">{locale === "zh" ? "序列名称不能重复；仅支持 A、C、G、T/U 和“-”。" : "Use unique sequence names and only A, C, G, T/U and gaps (-)."}</p>
              {refinement ? <dl className="realignment-limits">
                <div><dt>{locale === "zh" ? "序列" : "Sequences"}</dt><dd>≤ {refinement.maxSequences.toLocaleString()}</dd></div>
                <div><dt>{locale === "zh" ? "比对列" : "Columns"}</dt><dd>≤ {refinement.maxColumns.toLocaleString()}</dd></div>
                <div><dt>{locale === "zh" ? "比对字符数" : "Alignment characters"}</dt><dd>≤ {refinement.maxCells.toLocaleString()}</dd></div>
              </dl> : <p className="work-hint">{t.limits}</p>}
              <p className="work-hint realignment-citation"><Link className="work-link" to="/about">{locale === "zh" ? "引用方法" : "Cite this method"}</Link></p>
            </section>
            {Boolean(error) && <p id="realignment-error" tabIndex={-1} role="alert" className="work-error py-2">{apiErrorMessage(error, locale)}</p>}
          </div>
        </fieldset>
        <div className="work-actionbar">
          <div className="work-summary">
            <strong><FileText size={16} />{w.summary}</strong>
            <span className="max-w-64 truncate" title={inputSummary}>{inputSummary}</span>
            <span>{pattern === 1 ? t.localFirst : t.globalFirst}</span>
          </div>
          <Button type="submit" disabled={busy || !ready || !validInput}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? t.pending : t.submit}
          </Button>
        </div>
      </form>

    </PageContainer>
  );
}
