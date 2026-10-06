import { Copy, Download, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../components/common/Button";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { JobWorkspace } from "../components/job/JobWorkspace";
import { PageContainer } from "../components/layout/PageContainer";
import {
  accessDownloadFilename,
  downloadableAccessJson,
  hashRouterUrl,
  jobRoute,
  resolveJobAccess,
  saveJobAccess,
  type JobAccess
} from "../lib/api/tokens";
import { useLanguage } from "../lib/i18n/useLanguage";
import { useJobStatus } from "../lib/query/useJobStatus";
import { copyText } from "../lib/utils/clipboard";
import { useRememberWork } from "../lib/workspace";

type CopyTarget = "jobId" | "token" | "restoreLink" | "json";

export function JobStatusPage() {
  useRememberWork("job");
  const { jobId: routeJobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const { dictionary: d, locale } = useLanguage();
  const [access, setAccess] = useState<JobAccess | null>(null);
  const [showSensitiveAccess, setShowSensitiveAccess] = useState(false);
  const [copyTarget, setCopyTarget] = useState<CopyTarget | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const queryToken = searchParams.get("token");
  const jobId = routeJobId ? decodeURIComponent(routeJobId) : null;
  const jobQuery = useJobStatus(jobId ?? undefined, access?.token);
  const job = jobQuery.data;

  const accessJson = useMemo(
    () => (access ? downloadableAccessJson(access) : ""),
    [access]
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
    if (!access) {
      return;
    }

    const blob = new Blob([accessJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = accessDownloadFilename(access.createdAt);
    anchor.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!jobId) {
      setAccess(null);
      return;
    }

    const resolvedAccess = resolveJobAccess(jobId, queryToken);
    setAccess(resolvedAccess);
    if (resolvedAccess) {
      saveJobAccess(resolvedAccess);
    }
  }, [jobId, queryToken]);

  const missingAccess = Boolean(jobId && !access);
  const error = !jobId
    ? d.job.missingJobId
    : missingAccess
      ? d.job.missingAccess
      : jobQuery.error instanceof Error
        ? jobQuery.error.message
        : null;

  const errorContent = error ? <div className="space-y-3 mb-3">
    <ErrorState message={error} />
    <div className="flex flex-wrap items-center gap-3">
      {!missingAccess && jobId && <Button onClick={() => jobQuery.refetch()} size="sm" variant="outline"><RefreshCw size={15} />{d.common.retry}</Button>}
      <Link className="work-link" to="/lookup">{d.job.lookupLink}</Link>
    </div>
  </div> : null;

  if (!job) return <PageContainer className="workflow-page">
    <div className="work-heading"><h1>{d.job.title}</h1></div>
    {errorContent ?? <LoadingState label={d.job.loadingStatus} />}
  </PageContainer>;

  return <JobWorkspace job={job} token={access?.token ?? ""}
    polling={job.status !== "completed" && job.status !== "failed" ? <span className="work-hint flex items-center gap-2" aria-live="polite">
      {jobQuery.isFetching && <Loader2 size={13} className="animate-spin" />}
      {jobQuery.isFetching ? d.job.updating : d.job.polling}
    </span> : undefined}
    error={errorContent}
    recoveryActions={openCredentials => access ? <section className="job-recovery-actions">
      <p>{locale === "zh" ? "可关闭页面，稍后恢复任务。" : "You can close this page and restore the job later."}</p>
      <Button variant="outline" onClick={() => copyAccessText("restoreLink", restoreLink)}><Copy size={15} />{copyTarget === "restoreLink" ? d.common.copied : d.job.access.copyRestoreLink}</Button>
      <Button variant="outline" onClick={downloadAccessJson}><Download size={15} />{d.job.access.downloadJson}</Button>
      <Button variant="ghost" onClick={openCredentials}><Eye size={15} />{locale === "zh" ? "查看凭证" : "View credentials"}</Button>
      {copyError && <p className="text-rose-700" role="alert">{copyError}</p>}
      <span className="sr-only" role="status">{copyTarget ? d.common.copied : ""}</span>
    </section> : null}
    credentials={access ? <div className="job-credentials">
      <p className="work-hint">{d.job.access.description}</p>
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
      <section><h3>{d.job.access.restoreLinkLabel}</h3><code>{showSensitiveAccess ? restoreLink : maskedRestoreLink}</code>
        <Button size="sm" variant="outline" onClick={() => copyAccessText("restoreLink", restoreLink)}><Copy size={14} />{copyTarget === "restoreLink" ? d.common.copied : d.job.access.copyRestoreLink}</Button>
      </section>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => copyAccessText("json", accessJson)}><Copy size={14} />{copyTarget === "json" ? d.common.copied : d.job.access.copyJson}</Button>
        <Button size="sm" variant="outline" onClick={downloadAccessJson}><Download size={14} />{d.job.access.downloadJson}</Button>
      </div>
      {copyError && <p role="alert" className="text-rose-700">{copyError}</p>}
    </div> : null}
  />;
}
