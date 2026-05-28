import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { PageContainer } from "../components/layout/PageContainer";
import { DownloadPanel } from "../components/results/DownloadPanel";
import { MSAViewer } from "../components/results/MSAViewer";
import { ResultOverview } from "../components/results/ResultOverview";
import {
  ResultTabs,
  type ResultTab
} from "../components/results/ResultTabs";
import {
  getAlignmentResult,
  getDownloadFiles,
  getResultSummary
} from "../lib/api/results";
import { useLanguage } from "../lib/i18n/useLanguage";
import type { MSAResult } from "../lib/types/msa";
import type { ResultSummary } from "../lib/types/result";

export function ResultsPage() {
  const { jobId: routeJobId } = useParams<{ jobId: string }>();
  const { dictionary: d } = useLanguage();
  const [activeTab, setActiveTab] = useState<ResultTab>("overview");
  const [summary, setSummary] = useState<ResultSummary | null>(null);
  const [alignment, setAlignment] = useState<MSAResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const files = useMemo(
    () => getDownloadFiles(routeJobId ?? "demo-job"),
    [routeJobId]
  );

  useEffect(() => {
    if (!routeJobId) {
      setError("Missing job ID");
      return;
    }

    const jobId = routeJobId;
    let mounted = true;

    async function load() {
      try {
        const [nextSummary, nextAlignment] = await Promise.all([
          getResultSummary(jobId),
          getAlignmentResult(jobId)
        ]);

        if (mounted) {
          setSummary(nextSummary);
          setAlignment(nextAlignment);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : d.common.error);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [d.common.error, routeJobId]);

  return (
    <PageContainer className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <h1 className="text-4xl font-semibold text-slate-950">{d.results.title}</h1>
          <p className="text-lg leading-8 text-slate-600">{d.results.subtitle}</p>
          {routeJobId ? (
            <p className="font-mono text-sm text-slate-500">{routeJobId}</p>
          ) : null}
        </div>
        <ResultTabs value={activeTab} onChange={setActiveTab} />
      </div>

      {error ? <ErrorState message={error} /> : null}
      {(!summary || !alignment) && !error ? <LoadingState /> : null}

      {summary && alignment ? (
        <>
          {activeTab === "overview" ? (
            <div className="space-y-6">
              <ResultOverview summary={summary} />
              <MSAViewer alignment={alignment} />
            </div>
          ) : null}
          {activeTab === "downloads" ? <DownloadPanel files={files} /> : null}
        </>
      ) : null}
    </PageContainer>
  );
}
