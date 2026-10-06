import { useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { AnalysisWorkspace, WorkspaceBackLink } from "../layout/AnalysisWorkspace";
import { ButtonLink } from "../common/Button";
import { JobTimeline } from "./JobTimeline";
import { JobLogPanel } from "./JobLogPanel";
import { JobPreprocessDetails } from "./JobStatusCard";
import { RealignmentNotice } from "./RealignmentNotice";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { jobError } from "../../lib/i18n/jobErrors";
import { realignText } from "../../lib/i18n/realignment";
import { displayAlgorithmLabel } from "../../lib/algorithmNames";
import { formatDateTime } from "../../lib/utils/format";
import { resultsRoute } from "../../lib/api/tokens";
import type { JobDetail } from "../../lib/types/job";

export function JobWorkspace({ job, token, credentials, recoveryActions, polling, error }: {
  job: JobDetail; token: string; credentials: ReactNode;
  recoveryActions: (showCredentials: () => void) => ReactNode;
  polling?: ReactNode; error?: ReactNode;
}) {
  const { dictionary: d, locale } = useLanguage();
  const zh = locale === "zh";
  const [tab, setTab] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const t = d.job.preprocessSummary;
  const p = job.preprocess;
  const labels = [d.job.logs, zh ? "预处理详情" : "Preprocessing details", d.job.access.title];
  const method = displayAlgorithmLabel(job.algorithm.name, job.algorithm.resolvedName, d.common.algorithmNames, d.common.algorithmAutoResolved);
  const terminal = job.status === "completed" || job.status === "failed";
  const StatusIcon = job.status === "completed" ? CheckCircle2 : job.status === "failed" ? AlertTriangle : Loader2;
  const progress = Number.isFinite(job.progress) ? Math.max(0, Math.min(100, job.progress)) : 0;
  const values = d.results.overview.preprocess.values as Record<string, string>;
  const emailStatus = job.emailStatus ? (d.job.email.statuses as Record<string, string>)[job.emailStatus] ?? job.emailStatus : null;
  const status = <span className="workspace-state" data-state={job.status}><StatusIcon size={17} className={terminal ? "" : "animate-spin"} />{d.job.statusLabels[job.status]}</span>;
  return <AnalysisWorkspace sidebar={<>
    <WorkspaceBackLink />
    <h2 className="workspace-task-title">{job.jobName ?? d.job.title}</h2>
    {status}
    <dl className="workspace-facts"><div><dt>{d.job.algorithmLabel}</dt><dd>{method}</dd></div></dl>
    <JobTimeline compact status={job.status} refinementStatus={job.realignment?.status} realign={Boolean(job.realignment)} standalone={job.jobKind === "realignment"} />
    {recoveryActions(() => { setTab(2); buttons.current[2]?.focus(); })}
  </>}>
    <div className="analysis-heading"><h1>{zh ? "任务进度" : "Job progress"}</h1>{polling}</div>
    <div className="job-progress-line">
      <div className="job-progress-track" role="progressbar" aria-label={d.job.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{ width: `${progress}%` }} /></div>
      <span>{progress}%</span>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3"><h2 className="text-base font-semibold break-words">{job.jobName ?? d.job.title}</h2>{status}</div>
      {job.status === "completed" && <ButtonLink size="sm" to={resultsRoute(job.jobId, token)}>{d.common.viewResults}<ArrowRight size={15} /></ButtonLink>}
    </div>
    <dl className="job-detail-strip">
      <div><dt>{d.job.jobId}</dt><dd>{job.jobId}</dd></div>
      <div><dt>{d.common.createdAt}</dt><dd>{job.createdAt ? formatDateTime(job.createdAt) : "—"}</dd></div>
      <div><dt>{d.job.algorithmLabel}</dt><dd>{method}</dd></div>
    </dl>
    <section className="job-preprocess">
      <h2>{t.title}</h2>
      {p.status === "not_applicable" ? <p className="work-hint">{realignText[locale].preprocessNotApplicable}</p> : <dl className="job-counts">
        {[[t.rawSequences, p.summaryCounts?.raw_sequence_count], [t.cleanSequences, p.summaryCounts?.clean_sequence_count], [t.removedSequences, p.summaryCounts?.removed_sequence_count], [t.collapsedDuplicates, p.summaryCounts?.collapsed_duplicate_count ?? p.dedupSummary?.collapsed_count]].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{typeof value === "number" ? value.toLocaleString() : "—"}</dd></div>)}
        <div><dt>{d.results.overview.preprocess.mode}</dt><dd>{p.mode ? values[p.mode] ?? p.mode : "—"}</dd></div>
      </dl>}
    </section>
    <div className="job-detail-area">
      <div className="job-detail-tabs" role="tablist" aria-label={zh ? "任务详情" : "Job details"}>
        {labels.map((label, index) => <button key={index} ref={node => { buttons.current[index] = node; }} id={`job-detail-tab-${index}`} aria-controls={`job-detail-panel-${index}`} role="tab" aria-selected={tab === index} tabIndex={tab === index ? 0 : -1} type="button" onClick={() => setTab(index)} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : -1) + 3) % 3;
          setTab(next); buttons.current[next]?.focus();
        }}>{label}</button>)}
      </div>
      {labels.map((_, index) => <div hidden={tab !== index} key={index} className="job-detail-panel" id={`job-detail-panel-${index}`} role="tabpanel" aria-labelledby={`job-detail-tab-${index}`} tabIndex={0}>
        {tab === index && <>
        {error}
        {(job.failure || p.errorMessage) && <p className="mb-3 border-l-2 border-rose-600 bg-rose-50 px-3 py-2 text-rose-800" role="alert">{jobError(locale, job.failure?.code ?? p.errorCode ?? undefined, job.failure?.message ?? p.errorMessage ?? "")}</p>}
        {job.realignment && <div className="analysis-notice"><RealignmentNotice job={job} token={token} /></div>}
        {emailStatus && <p className="mb-3 text-slate-600">{d.job.email.title}: {emailStatus}{job.emailError && <span className="text-rose-700"> · {job.emailError}</span>}</p>}
        {tab === 0 ? <JobLogPanel job={job} compact /> : tab === 1 ? <JobPreprocessDetails job={job} /> : credentials}
        </>}
      </div>)}
    </div>
  </AnalysisWorkspace>;
}
