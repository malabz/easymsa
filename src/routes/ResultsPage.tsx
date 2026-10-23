import { HELP_LINKS } from "../lib/docs/links";
import { ResultPanels } from "../components/results/ResultPanels";
import { useJobStatus } from "../lib/query/useJobStatus";
import { RealignmentNotice } from "../components/job/RealignmentNotice";
import { SavedJobAccessChoices } from "../components/job/SavedJobAccessChoices";
import { useEffect, useMemo, useState } from "react";
import { ResultStageControl, resolvedResultStage } from "../components/results/ResultStageControl";
import { apiErrorMessage } from "../lib/i18n/apiErrors";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "../components/common/Button";
import { ErrorState } from "../components/common/ErrorState";
import { AnalysisWorkspace } from "../components/layout/AnalysisWorkspace";
import { ResultSidebar } from "../components/results/ResultSidebar";
import {
  ResultTabs
} from "../components/results/ResultTabs";
import { getDownloadFiles } from "../lib/api/results";
import {
  findJobAccessRecords,
  isValidJobId,
  resolveJobAccess,
  saveJobAccess
} from "../lib/api/tokens";
import { useLanguage } from "../lib/i18n/useLanguage";
import { useAlignmentResult, useResultSummary } from "../lib/query/useJobResults";
import { createServerViewerContext } from "../features/msa-viewer/viewerContext";
import { useRememberWork, useResultLocation } from "../lib/workspace";
import { workspaceText } from "../lib/i18n/workspace";



export function ResultsPage() {
  const { jobId: routeJobId } = useParams<{ jobId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { dictionary: d, locale } = useLanguage();
  const { stage, setStage, tab: activeTab, setTab: setActiveTab } = useResultLocation();
  const queryToken = searchParams.get("token");
  // useParams already returns decoded path segments.
  const invalidJobId = Boolean(routeJobId && !isValidJobId(routeJobId));
  const jobId = routeJobId && !invalidJobId ? routeJobId : null;
  const access = useMemo(() => jobId ? resolveJobAccess(jobId, queryToken) : null, [jobId, queryToken]);
  const savedAccess = useMemo(() => jobId ? findJobAccessRecords(jobId) : [], [jobId, queryToken]);
  const jobQuery = useJobStatus(jobId ?? undefined, access?.token);
  useRememberWork("result", Boolean(access && jobQuery.isSuccess && jobQuery.data?.jobId === access.jobId));
  const refinement = jobQuery.data?.realignment;
  const artifactStage = resolvedResultStage(stage, refinement);
  const [detailsRequestedFor, setDetailsRequestedFor] = useState<string | null>(null);
  const detailKey = `${jobId}:${artifactStage}`;
  const summaryQuery = useResultSummary(jobId ?? undefined, access?.token, artifactStage, jobQuery.isSuccess);
  const alignmentQuery = useAlignmentResult(jobId ?? undefined, access?.token, artifactStage,
    jobQuery.isSuccess && (activeTab === "alignment" || detailsRequestedFor === detailKey));
  const files = useMemo(
    () => (jobId && access ? getDownloadFiles(jobId, access.token, stage) : []),
    [access?.token, jobId, stage]
  );

  useEffect(() => {
    if (access && jobQuery.isSuccess && jobQuery.data?.jobId === access.jobId) {
      saveJobAccess({ ...access, createdAt: jobQuery.data.createdAt || access.createdAt, lastOpenedAt: new Date().toISOString() });
    }
  }, [access, jobQuery.isSuccess, jobQuery.data?.jobId, jobQuery.data?.createdAt]);

  const needsAccessChoice = !access && savedAccess.length > 1;
  const missingAccess = Boolean(jobId && !access && !needsAccessChoice);
  const accessError = invalidJobId
    ? locale === "zh" ? "任务号格式无效。请在恢复页面检查任务号后重试。" : "This job ID is invalid. Check the job ID on the recovery page and try again."
    : !jobId
      ? d.results.missingJobId
      : missingAccess
        ? d.results.missingAccess
        : null;
  const activeQuery = activeTab === "overview" ? summaryQuery : alignmentQuery;
  const activeError = activeTab === "downloads"
    ? null
    : activeQuery.error instanceof Error
      ? apiErrorMessage(activeQuery.error, locale)
      : null;
  const statusError = jobQuery.error ? apiErrorMessage(jobQuery.error, locale) : null;
  const error = accessError ?? statusError ?? activeError;

  const stageControl = refinement?.initialAvailable && refinement.refinedAvailable &&
    <ResultStageControl stage={stage} stages={["final", "initial", "refined"]} onChange={setStage} />;

  return (
    <AnalysisWorkspace sidebar={<ResultSidebar title={jobQuery.data?.jobName ?? d.results.title} summary={summaryQuery.data} job={jobQuery.data} onDownload={() => setActiveTab("downloads")} />} >
      <div className="analysis-heading"><h1>{jobQuery.data?.jobName ?? d.results.title}</h1>
        <Link className="work-link" to={HELP_LINKS.results}>{workspaceText[locale].help}</Link>
      </div>
      <div className="analysis-toolbar">
      <ResultTabs value={activeTab} onChange={setActiveTab} />
      {activeTab !== "alignment" && stageControl}
      </div>
      {needsAccessChoice && <div className="space-y-3">
        <SavedJobAccessChoices records={savedAccess} onSelect={selected => setSearchParams(previous => {
          const next = new URLSearchParams(previous);
          next.set("token", selected.token);
          return next;
        }, { replace: true })} />
        <Link className="work-link" to="/lookup">{d.results.lookupLink}</Link>
      </div>}
      {error ? (
        <div className="space-y-4">
          <ErrorState message={error} />
          <div className="flex flex-wrap items-center gap-3">
            {!accessError && (statusError || activeTab !== "downloads") ? (
              <Button onClick={() => statusError ? jobQuery.refetch() : activeQuery.refetch()} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4" />
                {d.common.retry}
              </Button>
            ) : null}
            <Link className="text-sm font-medium text-teal-800 underline" to="/lookup">
              {d.results.lookupLink}
            </Link>
          </div>
        </div>
      ) : null}

      {access && <div className="analysis-panels">
      {jobQuery.data && <div className="analysis-notice"><RealignmentNotice job={jobQuery.data} token={access?.token ?? ""} /></div>}
      <ResultPanels workspaceScope={`job:${jobId}:${stage}`} sourceName={jobQuery.data?.jobName ?? d.results.title} headerActions={stageControl} onRetry={() => statusError ? jobQuery.refetch() : alignmentQuery.refetch()} activeTab={activeTab} setActiveTab={setActiveTab} summary={summaryQuery.data}
        alignment={alignmentQuery.data} summaryPending={summaryQuery.isPending} alignmentPending={alignmentQuery.isFetching && !alignmentQuery.data}
        onLoadAlignment={() => setDetailsRequestedFor(detailKey)}
        alignmentError={alignmentQuery.error ? apiErrorMessage(alignmentQuery.error, locale) : null} error={error}
        files={files} context={summaryQuery.data ? createServerViewerContext(summaryQuery.data, files, stage) : undefined} /></div>}
    </AnalysisWorkspace>
  );
}
