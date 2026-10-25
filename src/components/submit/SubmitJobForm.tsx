import { HELP_LINKS } from "../../lib/docs/links";
import { ExampleInputLoader } from "./ExampleInputLoader";
import { TaskMetadataFields } from "./TaskMetadataFields";
import { workspaceText } from "../../lib/i18n/workspace";
import { clearDraft, forgetWork, readDraft, useDraftMetadata, useDraftState, useRememberWork } from "../../lib/workspace";
import { RealignmentOptions } from "./RealignmentOptions";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronDown, FileText, Loader2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { taskMetadataSchema } from "../../lib/submit/taskMetadata";
import { readInputText } from "../../lib/submit/readInputText";
import { apiErrorMessage } from "../../lib/i18n/apiErrors";
import { createJob } from "../../lib/api/jobs";
import { jobRoute } from "../../lib/api/tokens";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { useServiceHealth } from "../../lib/query/useServiceHealth";
import {
  DEFAULT_ALGORITHM_PARAMETER_DRAFT,
  type AlgorithmParameterDraft,
  type AlgorithmParameterError,
  validateAlgorithmParameters
} from "../../lib/submit/algorithmParameters";
import type {
  AlignmentAlgorithm,
  InputMethod,
  PreprocessMode
} from "../../lib/types/job";
import { MAX_FASTA_CHARACTERS, validateFasta } from "../../lib/utils/fasta";
import { validateInputFile } from "../../lib/utils/fileValidation";
import { Button } from "../common/Button";
import { AlgorithmParameterFields } from "./AlgorithmParameterFields";
import { AlgorithmPicker } from "./AlgorithmPicker";
import { FileUploadCard } from "./FileUploadCard";
import { InputMethodTabs } from "./InputMethodTabs";
import { PasteSequenceInput } from "./PasteSequenceInput";

type FormValues = {
  jobName: string;
  email: string;
};

type ExampleSnapshot = {
  inputMethod: InputMethod;
  pastedSequence: string;
  file: File | null;
  algorithm: AlignmentAlgorithm;
  preprocessMode: PreprocessMode;
  realignEnabled: boolean;
  realignPattern: 1 | 2;
  parameters: AlgorithmParameterDraft;
  jobName: string;
  exampleLoaded: boolean;
};

export function SubmitJobForm() {
  const { dictionary: d, locale } = useLanguage();
  const navigate = useNavigate();
  const t = workspaceText[locale];
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [preprocessMode, setPreprocessMode] = useDraftState<PreprocessMode>("submit:advanced:preprocess", "audit");
  const settingsRef = useRef<HTMLDivElement>(null);
  useRememberWork("submit");
  const [exampleLoaded, setExampleLoaded] = useDraftState("submit:example", false);
  const [exampleSnapshot, setExampleSnapshot] = useDraftState<ExampleSnapshot | null>("submit:exampleSnapshot", null);
  const [exampleUndone, setExampleUndone] = useState(false);
  const [examplePending, setExamplePending] = useState(false);
  const [inputMethod, setInputMethod] = useDraftState<InputMethod>("submit:inputMethod", "paste");
  const [realignEnabled, setRealignEnabled] = useDraftState("submit:realignEnabled", false);
  const [realignPattern, setRealignPattern] = useDraftState<1 | 2>("submit:realignPattern", 1);
  const [algorithm, setAlgorithm] = useDraftState<AlignmentAlgorithm>("submit:algorithm", "auto");
  const [algorithmParameterDraft, setAlgorithmParameterDraft] =
    useDraftState<AlgorithmParameterDraft>("submit:params", { ...DEFAULT_ALGORITHM_PARAMETER_DRAFT });
  const [algorithmParameterError, setAlgorithmParameterError] = useState<{
    field: "thread" | "mafftMaxiterate";
    error: AlgorithmParameterError;
  } | null>(null);
  const [pastedSequence, setPastedSequence] = useDraftState("submit:paste", "");
  const [file, setFile] = useDraftState<File | null>("submit:file", null);
  const [formError, setFormError] = useState<"pasteTooLong" | "paste" | "upload" | "algorithmParams" | null>(null);
  const [requestError, setRequestError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  const serviceHealth = useServiceHealth();

  const schema = useMemo(() => taskMetadataSchema(d.submit.errors), [d]);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    clearErrors,
    watch,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    shouldFocusError: false,
    defaultValues: readDraft("submit:metadata", { jobName: "", email: "" })
  });

  useDraftMetadata("submit:metadata", watch);

  function revealSetting(id: string) {
    const panel = settingsRef.current;
    const target = panel?.querySelector<HTMLElement>(`#${id}`);
    if (!panel || !target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "center", behavior: "instant" });
  }

  useEffect(() => {
    if (!algorithmParameterError) return;
    if (!advancedOpen) { setAdvancedOpen(true); return; }
    const frame = requestAnimationFrame(() => revealSetting(algorithmParameterError.field === "thread" ? "algorithmThread" : "mafftMaxiterate"));
    return () => cancelAnimationFrame(frame);
  }, [algorithmParameterError, advancedOpen]);

  useEffect(() => {
    if ((!formError && !requestError) || algorithmParameterError) return;
    const frame = requestAnimationFrame(() => revealSetting("submission-error"));
    return () => cancelAnimationFrame(frame);
  }, [formError, requestError, algorithmParameterError]);

  function suggestName(input: HTMLInputElement) {
    if (getValues("jobName").trim()) return false;
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    setValue("jobName", `${locale === "zh" ? "比对任务" : "Alignment"}-${date}-${time}`, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => { if (document.activeElement === input) input.select(); });
    return true;
  }

  async function loadExample(exampleFile: File) {
    const text = inputMethod === "paste" ? await readInputText(exampleFile) : null;
    setExampleSnapshot({ inputMethod, pastedSequence, file, algorithm, preprocessMode,
      realignEnabled, realignPattern, parameters: { ...algorithmParameterDraft }, jobName: getValues("jobName"), exampleLoaded });
    setExampleUndone(false);
    setExampleLoaded(true);
    if (inputMethod === "paste") setPastedSequence(text!); else setFile(exampleFile);
    setAlgorithm("minipoa");
    setPreprocessMode("audit");
    setRealignEnabled(false);setRealignPattern(1);setAlgorithmParameterDraft({...DEFAULT_ALGORITHM_PARAMETER_DRAFT});
    setAlgorithmParameterError(null);setFormError(null);setRequestError(null);setValue("jobName", "Synthetic DNA example", { shouldValidate: true });
  }

  function undoExample() {
    if (!exampleSnapshot) return;
    setInputMethod(exampleSnapshot.inputMethod); setPastedSequence(exampleSnapshot.pastedSequence); setFile(exampleSnapshot.file);
    setAlgorithm(exampleSnapshot.algorithm); setPreprocessMode(exampleSnapshot.preprocessMode);
    setRealignEnabled(exampleSnapshot.realignEnabled); setRealignPattern(exampleSnapshot.realignPattern);
    setAlgorithmParameterDraft(exampleSnapshot.parameters); setValue("jobName", exampleSnapshot.jobName);
    clearErrors("jobName");
    setExampleLoaded(exampleSnapshot.exampleLoaded); setExampleSnapshot(null); setExampleUndone(true);
    setAlgorithmParameterError(null); setFormError(null);setRequestError(null);
  }

  function algorithmUnavailable(value: AlignmentAlgorithm) {
    const availability = serviceHealth.data?.algorithms[value];
    return availability === false;
  }

  const selectedAlgorithmBlocked = algorithmUnavailable(algorithm);
  const submissionBlocked =
    serviceHealth.isPending ||
    serviceHealth.isError ||
    serviceHealth.data?.coreReady === false ||
    serviceHealth.data?.acceptingJobs === false ||
    selectedAlgorithmBlocked || (realignEnabled && serviceHealth.data?.realignment?.enabled === true && !serviceHealth.data.realignment.available);
  const maxThreadPerJob = serviceHealth.data?.maxThreadPerJob ?? null;

  function handleAlgorithmParameterChange(value: AlgorithmParameterDraft) {
    setAlgorithmParameterDraft(value);
    setAlgorithmParameterError(null);
    setFormError(null);setRequestError(null);
  }

  function handleMethodChange(method: InputMethod) {
    setInputMethod(method);
    setExampleLoaded(false);
    setFormError(null);setRequestError(null);
  }

  async function onSubmit(values: FormValues) {
    if (submissionInFlight.current || submissionBlocked || examplePending) return;
    setFormError(null);setRequestError(null);

    const fastaValidation = validateFasta(pastedSequence);
    const fileValidation = file ? validateInputFile(file, "alignment", locale) : null;

    if (inputMethod === "paste" && !fastaValidation.valid) {
      setFormError(fastaValidation.characterCount > MAX_FASTA_CHARACTERS ? "pasteTooLong" : "paste");
      return;
    }

    if (inputMethod === "upload" && (!file || !fileValidation?.valid)) {
      setFormError("upload");
      return;
    }

    const parameterValidation = validateAlgorithmParameters(
      algorithm,
      algorithmParameterDraft,
      maxThreadPerJob
    );
    if (!parameterValidation.valid) {
      setAlgorithmParameterError(parameterValidation);
      setFormError("algorithmParams");
      return;
    }

    submissionInFlight.current = true;
    try {
      setSubmitting(true);
      const response = await createJob({
        jobName: values.jobName.trim(),
        realignEnabled: realignEnabled && serviceHealth.data?.realignment?.enabled,
        realignPattern,
        inputMethod,
        pastedSequence: inputMethod === "paste" ? pastedSequence : undefined,
        file: inputMethod === "upload" ? file ?? undefined : undefined,
        fileName: inputMethod === "upload" ? file?.name : undefined,
        email: values.email.trim() || undefined,
        language: locale,
        algorithm,
        algorithmParams: parameterValidation.params,
        preprocessMode
      });

      clearDraft("submit");
      forgetWork("submit");
      navigate(
        response.token
          ? jobRoute(response.jobId, response.token)
          : `/job/${encodeURIComponent(response.jobId)}`
      );
    } catch (submitError) {
      setRequestError(submitError);
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  }

  const pasteValidation = useMemo(() => validateFasta(pastedSequence), [pastedSequence]);
  const sequenceCount = pasteValidation.sequenceCount;
  const validInput = inputMethod === "paste" ? pasteValidation.valid : Boolean(file && validateInputFile(file, "alignment", locale).valid);
  const name = watch("jobName");
  const email = watch("email");
  const hasDraft = Boolean(file || pastedSequence.trim() || name.trim() || email.trim() || algorithm !== "auto" || realignEnabled || preprocessMode !== "audit" || Object.keys(algorithmParameterDraft).some(key => algorithmParameterDraft[key as keyof AlgorithmParameterDraft] !== DEFAULT_ALGORITHM_PARAMETER_DRAFT[key as keyof AlgorithmParameterDraft]));
  const formErrorMessage = formError === "pasteTooLong" ? d.submit.pasteTooLong : formError ? d.submit.errors[formError] : null;
  const summaryInput = inputMethod === "upload" ? file?.name || t.inputPending
    : pastedSequence.trim() ? `${sequenceCount} ${t.pasteReady}` : t.inputPending;
  const customParameters = Boolean(algorithmParameterDraft.thread.trim()) || (algorithm === "mafft" && (
    algorithmParameterDraft.mafftMode !== "auto" || Boolean(algorithmParameterDraft.mafftMaxiterate.trim()) || algorithmParameterDraft.mafftReorder));
  const parameterSummary = customParameters ? t.customParameters : t.defaultParameters;
  const preprocessSummary = preprocessMode === "audit" ? t.retainSequences : t.filterSequences;
  const refinementActive = realignEnabled && serviceHealth.data?.realignment?.enabled === true;

  return (
    <form className="submission-form submission-form--alignment" onSubmit={handleSubmit(onSubmit, invalid => revealSetting(invalid.jobName ? "jobName" : "email"))} noValidate aria-busy={submitting || examplePending}>
      <fieldset disabled={submitting || examplePending} className="work-grid">
        <legend className="sr-only">{d.submit.title}</legend>
        <div className="work-input">
          <div className="work-input-heading">
            <h2>{t.input}</h2>
            <ExampleInputLoader kind="alignment" disabled={submitting || examplePending} hasInput={hasDraft}
              label={t.sampleWithSettings} confirmationMessage={t.exampleSettingsNotice} confirmLabel={t.applyExample}
              onLoad={loadExample} onPendingChange={setExamplePending} />
          </div>
          <InputMethodTabs value={inputMethod} onChange={handleMethodChange} />
          <div aria-labelledby="input-tab-paste" hidden={inputMethod !== "paste"} id="input-panel-paste" role="tabpanel">
            <div className="work-paste">
              <PasteSequenceInput value={pastedSequence} onChange={value => { setPastedSequence(value); setExampleLoaded(false); setExampleSnapshot(null); setExampleUndone(false); setFormError(null);setRequestError(null); }} />
            </div>
          </div>
          <div aria-labelledby="input-tab-upload" hidden={inputMethod !== "upload"} id="input-panel-upload" role="tabpanel">
            <FileUploadCard compact file={file} disabled={submitting || examplePending}
              onChange={value => { setFile(value); setExampleLoaded(false); setExampleSnapshot(null); setExampleUndone(false); setFormError(null);setRequestError(null); }} />
          </div>
          {exampleLoaded && validInput && <div className="work-feedback submission-example-feedback" role="status">
            <CheckCircle2 size={16} aria-hidden="true" />
            <div><strong>{t.exampleLoaded}</strong><p>{t.exampleSettingsApplied}</p>
              <div className="submission-example-actions"><Link to="/examples/alignment-small">{t.exampleResult}</Link>
                {exampleSnapshot && <button type="button" className="work-link" title={t.exampleUndoHint} onClick={undoExample}>{t.undoExample}</button>}
              </div>
            </div>
          </div>}
          {exampleUndone && <p className="work-hint" role="status">{t.exampleUndone}</p>}
          <div className="submission-input-notes">
            <div className="submission-input-help">
              <Link className="work-link" to={HELP_LINKS.input}>{t.help}</Link>
            </div>
            {preprocessMode === "filter" && <p className="submission-audit-note"><ShieldCheck size={14} aria-hidden="true" />{t.automaticFilter}</p>}
          </div>
        </div>
        <div className="work-settings" aria-label={t.settings} ref={settingsRef}>
          <h2 className="submission-settings-heading">{t.settings}</h2>
          <div className="work-field">
            <p id="alignmentAlgorithmLabel" className="work-label">{d.submit.algorithm}</p>
            <AlgorithmPicker compact value={algorithm} labelledBy="alignmentAlgorithmLabel" isDisabled={algorithmUnavailable}
              onChange={value => { setAlgorithm(value); setAlgorithmParameterError(null); setFormError(null);setRequestError(null); }} />
          </div>
          <div className="submission-metadata">
            <TaskMetadataFields register={register} errors={errors} disabled={submitting || examplePending} onSuggestName={suggestName} />
          </div>
          <details className="work-parameters" open={advancedOpen} onToggle={event => setAdvancedOpen(event.currentTarget.open)}>
            <summary><span className="submission-advanced-label"><span><SlidersHorizontal size={15} aria-hidden="true" />{t.advanced}</span>
              <small>{preprocessSummary} · {parameterSummary}</small></span><ChevronDown size={16} aria-hidden="true" /></summary>
            <div className="submission-preprocess work-field">
              <label className="work-label" htmlFor="preprocessMode">{d.submit.preprocessMode}</label>
              <select className="work-control" id="preprocessMode" value={preprocessMode} onChange={event => setPreprocessMode(event.target.value as PreprocessMode)}>
                <option value="audit">{d.submit.preprocessModes.audit}</option>
                <option value="filter">{d.submit.preprocessModes.filter}</option>
              </select>
              <p className="work-hint">{preprocessMode === "audit" ? t.auditHint : t.filterHint}</p>
            </div>
            <AlgorithmParameterFields algorithm={algorithm} error={algorithmParameterError}
              maxThreadPerJob={maxThreadPerJob} value={algorithmParameterDraft} onChange={handleAlgorithmParameterChange}
              onReset={() => { setPreprocessMode("audit"); setAlgorithmParameterDraft({ ...DEFAULT_ALGORITHM_PARAMETER_DRAFT }); setAlgorithmParameterError(null); setFormError(null);setRequestError(null); }} />
          </details>
          {serviceHealth.data?.realignment?.enabled && <RealignmentOptions limits={serviceHealth.data.realignment}
            enabled={realignEnabled} onEnabled={setRealignEnabled} pattern={realignPattern} onPattern={setRealignPattern}
            disabled={submitting || examplePending} unavailable={!serviceHealth.data.realignment.available} />}
          {Boolean(formError || requestError) && <p id="submission-error" tabIndex={-1} className="work-error py-2" role="alert">{requestError ? apiErrorMessage(requestError, locale, d.submit.errors.submitFailed) : formErrorMessage}</p>}
          {selectedAlgorithmBlocked && <p className="text-sm text-amber-900 py-2" role="alert">{d.submit.selectedAlgorithmUnavailable}</p>}
        </div>
      </fieldset>
      <div className="work-actionbar">
        <div className="work-summary" aria-label={t.summary}>
          <strong><FileText size={16} />{t.summary}</strong>
          <span className="max-w-64 truncate" title={summaryInput}>{summaryInput}</span>
          <dl className="submission-summary-settings">
            <div><dt>{t.summaryMethod}</dt><dd>{d.submit.algorithms[algorithm]}</dd></div>
            <div><dt>{t.summaryPreprocess}</dt><dd>{preprocessSummary}</dd></div>
            <div><dt>{t.summaryRefinement}</dt><dd>{refinementActive ? t.enabled : t.disabled}</dd></div>
            <div><dt className="sr-only">{t.summaryParameters}</dt><dd>{parameterSummary}</dd></div>
          </dl>
        </div>
        <Button disabled={submitting || submissionBlocked || !validInput || examplePending} type="submit">
          {(submitting || examplePending) && <Loader2 className="h-4 w-4 animate-spin" />}
          {examplePending ? t.exampleLoading : submitting ? d.submit.submitting : d.common.submit}
        </Button>
      </div>
    </form>
  );
}
