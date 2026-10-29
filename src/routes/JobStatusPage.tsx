import { AlertTriangle, ArrowRight, CheckCircle2, Copy, Download, Eye, EyeOff, KeyRound, Loader2, Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, ButtonLink } from "../components/common/Button";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { JobWorkspace } from "../components/job/JobWorkspace";
import { SavedJobAccessChoices } from "../components/job/SavedJobAccessChoices";
import { PageContainer } from "../components/layout/PageContainer";
import {
  accessDownloadFilename,
  downloadableAccessJson,
  findJobAccessRecords,
  hashRouterUrl,
  isValidJobId,
  jobRoute,
  resolveJobAccess,
  resultsRoute,
  saveJobAccess
} from "../lib/api/tokens";
import { useLanguage } from "../lib/i18n/useLanguage";
import { useJobStatus } from "../lib/query/useJobStatus";
import { copyText } from "../lib/utils/clipboard";
import { useRememberWork } from "../lib/workspace";
import { apiErrorMessage } from "../lib/i18n/apiErrors";

type CopyTarget = "jobId" | "token" | "restoreLink" | "json";

export function JobStatusPage() {
  const { jobId: routeJobId } = useParams<{ jobId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { dictionary: d, locale } = useLanguage();
  const [showSensitiveAccess, setShowSensitiveAccess] = useState(false);
  const [copyTarget, setCopyTarget] = useState<CopyTarget | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const queryToken = searchParams.get("token");
  // useParams already returns decoded path segments.
  const invalidJobId = Boolean(routeJobId && !isValidJobId(routeJobId));
  const jobId = routeJobId && !invalidJobId ? routeJobId : null;
  const access = useMemo(() => jobId ? resolveJobAccess(jobId, queryToken) : null, [jobId, queryToken]);
  const savedAccess = useMemo(() => jobId ? findJobAccessRecords(jobId) : [], [jobId, queryToken]);
  const jobQuery = useJobStatus(jobId ?? undefined, access?.token);
  const job = jobQuery.data;
  useRememberWork("job", Boolean(access && jobQuery.isSuccess && job?.jobId === access.jobId));

  // A job that finishes while this page is open opens its results after a short,
  // cancellable countdown; reopening an already completed job stays here.
  const navigate = useNavigate();
  const identity = access ? JSON.stringify([access.jobId, access.token]) : null;
  const currentStatus = access && job?.jobId === access.jobId ? job.status : undefined;
  const previousStatus = useRef<{ identity: string | null; status: string | undefined }>();
  const [countdown, setCountdown] = useState<{ identity: string; seconds: number } | null>(null);
  // Changing only the key keeps this page mounted. Hide the old countdown in
  // this render, before effects clear it, so it cannot navigate with new access.
  const openResultsIn = countdown?.identity === identity && currentStatus === "completed" ? countdown?.seconds ?? null : null;
  useEffect(() => {
    const before = previousStatus.current;
    previousStatus.current = { identity, status: currentStatus };
    if (!identity || before?.identity !== identity || currentStatus !== "completed") {
      setCountdown(null);
      return;
    }
    if (before.status && before.status !== "completed" && before.status !== "failed") setCountdown({ identity, seconds: 3 });
  }, [identity, currentStatus]);
  useEffect(() => {
    if (openResultsIn === null || !access) return;
    if (openResultsIn <= 0) {
      navigate(resultsRoute(access.jobId, access.token));
      return;
    }
    const timer = window.setTimeout(() => setCountdown(current =>
      current?.identity === identity ? { ...current, seconds: current.seconds - 1 } : current
    ), 1000);
    return () => window.clearTimeout(timer);
  }, [openResultsIn, identity, access, navigate]);

  // A recovery URL has no creation date. Once authenticated, exports use the
  // same server-provided date as the saved record rather than the visit time.
  const downloadAccess = useMemo(() => access && jobQuery.isSuccess && job?.jobId === access.jobId
    ? { ...access, createdAt: job.createdAt || access.createdAt } : access,
  [access, jobQuery.isSuccess, job?.jobId, job?.createdAt]);

  const accessJson = useMemo(
    () => (downloadAccess ? downloadableAccessJson(downloadAccess) : ""),
    [downloadAccess]
  );
  const restorePath = access ? jobRoute(access.jobId, access.token) : "";
  const restoreLink = restorePath ? hashRouterUrl(restorePath) : "";
  const maskedToken = access
    ? `${"•".repeat(Math.min(Math.max(access.token.length - 4, 8), 24))}${access.token.slice(-4)}`
    : "";
  const maskedRestoreLink = access
    ? restoreLink.replace(encodeURIComponent(access.token), maskedToken)
    : "";

  async function copyAccessText(target: CopyTarget, text: string) {
    try {
      await copyText(text);
      setCopyError(null);
      setCopyTarget(target);
      window.setTimeout(() => {
        setCopyTarget((current) => (current === target ? null : current));
      }, 1800);
    } catch {
      setCopyTarget(null);
      setCopyError(d.common.copyFailed);
    }
  }

  function downloadAccessJson() {
    if (!downloadAccess) {
      return;
    }

    const blob = new Blob([accessJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = accessDownloadFilename(downloadAccess.createdAt);
    anchor.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (access && jobQuery.isSuccess && job?.jobId === access.jobId) {
      saveJobAccess({ ...access, createdAt: job.createdAt || access.createdAt, lastOpenedAt: new Date().toISOString() });
    }
  }, [access, jobQuery.isSuccess, job?.jobId, job?.createdAt]);

  const needsAccessChoice = !access && savedAccess.length > 1;
  const missingAccess = Boolean(jobId && !access && !needsAccessChoice);
  const error = invalidJobId
    ? locale === "zh" ? "任务号格式无效。请在恢复页面检查任务号后重试。" : "This job ID is invalid. Check the job ID on the recovery page and try again."
    : !jobId
      ? d.job.missingJobId
      : missingAccess
        ? d.job.missingAccess
        : jobQuery.error instanceof Error
          ? apiErrorMessage(jobQuery.error, locale)
          : null;
  const accessChoices = needsAccessChoice ? <div className="space-y-3">
    <SavedJobAccessChoices records={savedAccess} onSelect={selected => setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.set("token", selected.token);
      return next;
    }, { replace: true })} />
    <Link className="work-link" to="/lookup">{d.job.lookupLink}</Link>
  </div> : null;

  const errorContent = error ? <div className="space-y-3 mb-3">
    <ErrorState message={error} />
    <div className="flex flex-wrap items-center gap-3">
      {!missingAccess && jobId && <Button onClick={() => jobQuery.refetch()} size="sm" variant="outline"><RefreshCw size={15} />{d.common.retry}</Button>}
      <Link className="work-link" to="/lookup">{d.job.lookupLink}</Link>
    </div>
  </div> : null;

  // Without a job there is nothing else on the page, so the problem and every way
  // forward share one card instead of a lone message and a distant link.
  const fetchFailed = Boolean(error && !invalidJobId && jobId && !missingAccess);
  const errorCard = error ? <section className="job-message-card" data-tone="error">
    <span className="job-message-icon" aria-hidden="true">{missingAccess ? <KeyRound size={20} /> : <AlertTriangle size={20} />}</span>
    <div className="job-message-body">
      <h2>{fetchFailed ? (locale === "zh" ? "暂时读取不到任务状态" : "Job status is unavailable right now")
        : (locale === "zh" ? "无法打开这个任务" : "This job can't be opened")}</h2>
      <p role="alert">{error}</p>
      <div className="job-message-actions">
        {fetchFailed && <Button onClick={() => jobQuery.refetch()}><RefreshCw size={15} />{d.common.retry}</Button>}
        <ButtonLink to="/lookup" variant={fetchFailed ? "outline" : "primary"}>{d.job.lookupLink}<ArrowRight size={15} aria-hidden="true" /></ButtonLink>
        <ButtonLink to="/submit" variant="ghost"><Plus size={15} aria-hidden="true" />{locale === "zh" ? "提交新任务" : "Submit a new job"}</ButtonLink>
      </div>
    </div>
  </section> : null;

  if (!job) return <PageContainer className="workflow-page job-message-page">
    <div className="work-heading"><h1>{d.job.title}</h1></div>
    {accessChoices ? <section className="job-message-card">{accessChoices}</section>
      : errorCard ?? <LoadingState label={d.job.loadingStatus} />}
  </PageContainer>;

  return <JobWorkspace job={job} token={access?.token ?? ""}
    polling={job.status !== "completed" && job.status !== "failed" ? <span className="work-hint flex items-center gap-2" aria-live="polite">
      {jobQuery.isFetching && <Loader2 size={13} className="animate-spin" />}
      {jobQuery.isFetching ? d.job.updating : d.job.polling}
    </span> : undefined}
    notice={openResultsIn !== null && access ? <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900" role="status">
      <CheckCircle2 size={17} className="shrink-0 text-teal-700" aria-hidden="true" />
      <span className="min-w-0 flex-1">{locale === "zh" ? `任务已完成，${openResultsIn} 秒后打开结果。` : `Job completed. Opening results in ${openResultsIn} s.`}</span>
      <ButtonLink size="sm" to={resultsRoute(access.jobId, access.token)}>{d.common.viewResults}<ArrowRight size={15} aria-hidden="true" /></ButtonLink>
      <Button size="sm" variant="ghost" onClick={() => setCountdown(null)}>{locale === "zh" ? "留在此页" : "Stay here"}</Button>
    </div> : undefined}
    error={errorContent}
    recoveryActions={openCredentials => access ? <section className="job-recovery-actions">
      <p>{locale === "zh" ? "可关闭页面，稍后恢复任务。" : "You can close this page and restore the job later."}</p>
      <Button variant="outline" onClick={openCredentials}><Download size={15} />{locale === "zh" ? "保存恢复信息" : "Save recovery information"}</Button>
      {copyError && <p className="text-rose-700" role="alert">{copyError}</p>}
      <span className="sr-only" role="status">{copyTarget ? d.common.copied : ""}</span>
    </section> : null}
    credentials={access ? <div className="job-credentials">
      <p className="work-hint">{d.job.access.description}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => copyAccessText("restoreLink", restoreLink)}><Copy size={14} />{copyTarget === "restoreLink" ? d.common.copied : d.job.access.copyRestoreLink}</Button>
        <Button size="sm" variant="outline" onClick={downloadAccessJson}><Download size={14} />{d.job.access.downloadJson}</Button>
      </div>
      <span className="sr-only" role="status">{copyTarget ? d.common.copied : ""}</span>
      <details className="mt-4 border-t border-slate-200 pt-3"><summary className="cursor-pointer text-sm font-medium text-slate-700">{locale === "zh" ? "任务号与访问密钥" : "Job ID and access key"}</summary>
      <section><h3>{d.job.access.jobIdLabel}</h3><code>{access.jobId}</code>
        <Button size="sm" variant="outline" onClick={() => copyAccessText("jobId", access.jobId)}><Copy size={14} />{copyTarget === "jobId" ? d.common.copied : d.job.access.copyJobId}</Button>
      </section>
      <section><h3>{d.job.access.tokenLabel}</h3><code>{showSensitiveAccess ? access.token : maskedToken}</code>
        <p className="work-hint mb-2">{d.job.access.tokenHelp}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => copyAccessText("token", access.token)}><Copy size={14} />{copyTarget === "token" ? d.common.copied : d.job.access.copyToken}</Button>
          <Button size="sm" variant="ghost" aria-pressed={showSensitiveAccess} onClick={() => setShowSensitiveAccess(value => !value)}>{showSensitiveAccess ? <EyeOff size={14} /> : <Eye size={14} />}{showSensitiveAccess ? d.job.access.hideToken : d.job.access.showToken}</Button>
        </div>
      </section>
      <section><h3>{d.job.access.restoreLinkLabel}</h3><code>{showSensitiveAccess ? restoreLink : maskedRestoreLink}</code></section>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => copyAccessText("json", accessJson)}><Copy size={14} />{copyTarget === "json" ? d.common.copied : d.job.access.copyJson}</Button>
      </div>
      </details>
      {copyError && <p role="alert" className="text-rose-700">{copyError}</p>}
    </div> : null}
  />;
}
