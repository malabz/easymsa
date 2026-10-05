import { ResultPanels } from "../components/results/ResultPanels";
import type { ResultStage } from "../lib/types/job";
import { useJobStatus } from "../lib/query/useJobStatus";
import { RealignmentNotice } from "../components/job/RealignmentNotice";
import { realignText } from "../lib/i18n/realignment";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "../components/common/Button";
import { ErrorState } from "../components/common/ErrorState";
import { PageContainer } from "../components/layout/PageContainer";
import {
  ResultTabs
} from "../components/results/ResultTabs";
import { getDownloadFiles } from "../lib/api/results";
import {
  resolveJobAccess,
  saveJobAccess,
  type JobAccess
} from "../lib/api/tokens";
import { useLanguage } from "../lib/i18n/useLanguage";
import { useAlignmentResult, useResultSummary } from "../lib/query/useJobResults";
import { createServerViewerContext } from "../features/msa-viewer/viewerContext";
import { useRememberWork, useResultLocation } from "../lib/workspace";
import { workspaceText } from "../lib/i18n/workspace";



export function ResultsPage() {
  const { jobId: routeJobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const { dictionary: d, locale } = useLanguage();
  const t = realignText[locale];
  const { stage, setStage, tab: activeTab, setTab: setActiveTab } = useResultLocation();
  useRememberWork("result");
  const [access, setAccess] = useState<JobAccess | null>(null);
  const queryToken = searchParams.get("token");
  const jobId = routeJobId ? decodeURIComponent(routeJobId) : null;
  const jobQuery = useJobStatus(jobId ?? undefined, access?.token);
  const refinement = jobQuery.data?.realignment;
  const summaryQuery = useResultSummary(jobId ?? undefined, access?.token, stage);
  const alignmentQuery = useAlignmentResult(jobId ?? undefined, access?.token, stage);
  const files = useMemo(
    () => (jobId && access ? getDownloadFiles(jobId, access.token, stage) : []),
    [access?.token, jobId, stage]
  );

  useEffect(() => {
    if (!jobId) {
      setAccess(null);
      return;
    }

    const resolvedAccess = resolveJobAccess(jobId, queryToken);
    if (!resolvedAccess) {
      setAccess(null);
      return;
    }

    setAccess(resolvedAccess);
    saveJobAccess(resolvedAccess);
  }, [jobId, queryToken]);

  const missingAccess = Boolean(jobId && !access);
  const accessError = !jobId
    ? d.results.missingJobId
    : missingAccess
      ? d.results.missingAccess
      : null;
  const activeQuery = activeTab === "overview" ? summaryQuery : alignmentQuery;
  const activeError = activeTab === "downloads"
    ? null
    : activeQuery.error instanceof Error
      ? activeQuery.error.message
      : null;
  const error = accessError ?? activeError;

  return (
    <PageContainer className="workflow-page">
      <div className="work-heading">
        <div>
          <h1>{d.results.title}</h1>
          {jobId ? (
            <p className="font-mono text-sm text-slate-500">{jobId}</p>
          ) : null}
        </div>
        <Link className="work-link" to="/docs">{workspaceText[locale].help}</Link>
      </div>

      {jobQuery.data && <RealignmentNotice job={jobQuery.data} token={access?.token ?? ""} />}
      <div className="work-result-toolbar">
      <ResultTabs value={activeTab} onChange={setActiveTab} />
      {refinement?.initialAvailable && <label className="flex flex-wrap items-center gap-3 text-sm font-medium">{t.resultVersion}
        <select aria-label={t.resultVersion} className="rounded border p-2" value={stage} onChange={event => setStage(event.target.value as ResultStage)}>
          <option value="final">{t.final}</option><option value="initial">{t.initial}</option>
          {refinement.refinedAvailable && <option value="refined">{t.refined}</option>}
        </select>
      </label>}
      </div>
      {error ? (
        <div className="space-y-4">
          <ErrorState message={error} />
          <div className="flex flex-wrap items-center gap-3">
            {!accessError && activeTab !== "downloads" ? (
              <Button onClick={() => activeQuery.refetch()} size="sm" variant="outline">
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

      <div className="work-result-body"><ResultPanels activeTab={activeTab} setActiveTab={setActiveTab} summary={summaryQuery.data}
        alignment={alignmentQuery.data} summaryPending={summaryQuery.isPending} alignmentPending={alignmentQuery.isPending}
        alignmentError={alignmentQuery.error instanceof Error ? alignmentQuery.error.message : null} error={error}
        files={access ? files : []} context={summaryQuery.data ? createServerViewerContext(summaryQuery.data, files) : undefined} /></div>
    </PageContainer>
  );
}
