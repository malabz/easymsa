import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "../components/common/Button";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { PageContainer } from "../components/layout/PageContainer";
import { DownloadPanel } from "../components/results/DownloadPanel";
import { ResultOverview } from "../components/results/ResultOverview";
import {
  ResultTabs,
  type ResultTab
} from "../components/results/ResultTabs";
import { getDownloadFiles } from "../lib/api/results";
import {
  resolveJobAccess,
  saveJobAccess,
  type JobAccess
} from "../lib/api/tokens";
import { useLanguage } from "../lib/i18n/useLanguage";
import { useAlignmentResult, useResultSummary } from "../lib/query/useJobResults";

const MSAViewer = lazy(() =>
  import("../components/results/MSAViewer").then((module) => ({ default: module.MSAViewer }))
);

export function ResultsPage() {
  const { jobId: routeJobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const { dictionary: d } = useLanguage();
  const [activeTab, setActiveTab] = useState<ResultTab>("overview");
  const [access, setAccess] = useState<JobAccess | null>(null);
  const queryToken = searchParams.get("token");
  const jobId = routeJobId ? decodeURIComponent(routeJobId) : null;
  const summaryQuery = useResultSummary(jobId ?? undefined, access?.token);
  const alignmentQuery = useAlignmentResult(jobId ?? undefined, access?.token);
  const files = useMemo(
    () => (jobId && access ? getDownloadFiles(jobId, access.token) : []),
    [access?.token, jobId]
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
    <PageContainer className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <h1 className="text-4xl font-semibold text-slate-950">{d.results.title}</h1>
          <p className="text-lg leading-8 text-slate-600">{d.results.subtitle}</p>
          {jobId ? (
            <p className="font-mono text-sm text-slate-500">{jobId}</p>
          ) : null}
        </div>
        <ResultTabs value={activeTab} onChange={setActiveTab} />
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

      <section
        aria-labelledby="result-tab-overview"
        hidden={activeTab !== "overview"}
        id="result-panel-overview"
        role="tabpanel"
      >
        {activeTab === "overview" && summaryQuery.isPending && !error ? (
          <LoadingState label={d.results.loading.overview} />
        ) : null}
        {activeTab === "overview" && summaryQuery.data ? (
          <ResultOverview summary={summaryQuery.data} />
        ) : null}
      </section>
      <section
        aria-labelledby="result-tab-alignment"
        hidden={activeTab !== "alignment"}
        id="result-panel-alignment"
        role="tabpanel"
      >
        {activeTab === "alignment" && alignmentQuery.isPending && !error ? (
          <LoadingState label={d.results.loading.alignment} />
        ) : null}
        {activeTab === "alignment" && alignmentQuery.data ? (
          <Suspense fallback={<LoadingState label={d.results.loading.viewer} />}>
            <MSAViewer alignment={alignmentQuery.data} />
          </Suspense>
        ) : null}
      </section>
      <section
        aria-labelledby="result-tab-downloads"
        hidden={activeTab !== "downloads"}
        id="result-panel-downloads"
        role="tabpanel"
      >
        {activeTab === "downloads" && access ? <DownloadPanel files={files} /> : null}
      </section>
    </PageContainer>
  );
}
