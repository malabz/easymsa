import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { JobLogPanel } from "../components/job/JobLogPanel";
import { JobStatusCard } from "../components/job/JobStatusCard";
import { JobTimeline } from "../components/job/JobTimeline";
import { PageContainer } from "../components/layout/PageContainer";
import { getJobStatus } from "../lib/api/jobs";
import { useLanguage } from "../lib/i18n/useLanguage";
import type { JobDetail } from "../lib/types/job";

export function JobStatusPage() {
  const { jobId } = useParams();
  const { dictionary: d } = useLanguage();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setError("Missing job ID");
      return;
    }

    let mounted = true;

    async function load() {
      try {
        const detail = await getJobStatus(jobId);
        if (mounted) {
          setJob(detail);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : d.common.error);
        }
      }
    }

    load();
    const interval = window.setInterval(load, 1400);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [d.common.error, jobId]);

  return (
    <PageContainer className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-semibold text-slate-950">{d.job.title}</h1>
        <p className="text-lg leading-8 text-slate-600">{d.job.subtitle}</p>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {!job && !error ? <LoadingState /> : null}

      {job ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-5">
            <JobStatusCard job={job} />
            <JobLogPanel logs={job.logs} />
          </div>
          <JobTimeline status={job.status} />
        </div>
      ) : null}
    </PageContainer>
  );
}
