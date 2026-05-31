import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
import {
  resolveJobAccess,
  saveJobAccess,
  type JobAccess
} from "../lib/api/tokens";
import { useLanguage } from "../lib/i18n/useLanguage";
import type { MSAResult } from "../lib/types/msa";
import type { ResultSummary } from "../lib/types/result";

export function ResultsPage() {
  const { jobId: routeJobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const { dictionary: d } = useLanguage();
  const [activeTab, setActiveTab] = useState<ResultTab>("overview");
  const [summary, setSummary] = useState<ResultSummary | null>(null);
  const [alignment, setAlignment] = useState<MSAResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState<JobAccess | null>(null);
  const queryToken = searchParams.get("token");
  const jobId = routeJobId ? decodeURIComponent(routeJobId) : null;
  const files = useMemo(
    () => getDownloadFiles(jobId ?? "demo-job", access?.token ?? ""),
    [access?.token, jobId]
  );

  useEffect(() => {
    if (!jobId) {
      setError("Missing job ID");
      return;
    }

    const resolvedAccess = resolveJobAccess(jobId, queryToken);
    if (!resolvedAccess) {
      setAccess(null);
      setSummary(null);
      setAlignment(null);
      setError(
        "Missing access token for this job. Open the lookup page and enter the job ID with its token, or upload the access JSON."
      );
      return;
    }

    setAccess(resolvedAccess);
    saveJobAccess(resolvedAccess);

    const activeJobId = jobId;
    const activeToken = resolvedAccess.token;
    let mounted = true;

    async function load() {
      try {
        const [nextSummary, nextAlignment] = await Promise.all([
          getResultSummary(activeJobId, activeToken),
          getAlignmentResult(activeJobId, activeToken)
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
  }, [d.common.error, jobId, queryToken]);

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
          <Link className="text-sm font-medium text-teal-800 underline" to="/lookup">
            Go to task lookup
          </Link>
        </div>
      ) : null}
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
