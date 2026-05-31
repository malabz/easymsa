import { Copy, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../components/common/Button";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { JobLogPanel } from "../components/job/JobLogPanel";
import { JobStatusCard } from "../components/job/JobStatusCard";
import { JobTimeline } from "../components/job/JobTimeline";
import { PageContainer } from "../components/layout/PageContainer";
import { getJobStatus } from "../lib/api/jobs";
import {
  accessDownloadFilename,
  downloadableAccessJson,
  jobRoute,
  resolveJobAccess,
  saveJobAccess,
  type JobAccess
} from "../lib/api/tokens";
import { useLanguage } from "../lib/i18n/useLanguage";
import type { JobDetail } from "../lib/types/job";
import { copyText } from "../lib/utils/clipboard";

type CopyTarget = "jobId" | "token" | "restoreLink" | "json";

export function JobStatusPage() {
  const { jobId: routeJobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const { dictionary: d } = useLanguage();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState<JobAccess | null>(null);
  const [copyTarget, setCopyTarget] = useState<CopyTarget | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const queryToken = searchParams.get("token");
  const jobId = routeJobId ? decodeURIComponent(routeJobId) : null;

  const accessJson = useMemo(
    () => (access ? downloadableAccessJson(access) : ""),
    [access]
  );
  const restorePath = access ? jobRoute(access.jobId, access.token) : "";
  const restoreLink =
    typeof window !== "undefined" && restorePath
      ? `${window.location.origin}${restorePath}`
      : restorePath;

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
      setError("Missing job ID");
      return;
    }

    const resolvedAccess = resolveJobAccess(jobId, queryToken);
    if (!resolvedAccess) {
      setAccess(null);
      setJob(null);
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
    let interval: number | undefined;

    async function load() {
      try {
        const detail = await getJobStatus(activeJobId, activeToken);
        if (mounted) {
          setJob(detail);
          setError(null);
        }
        if (
          mounted &&
          (detail.status === "completed" || detail.status === "failed") &&
          interval
        ) {
          window.clearInterval(interval);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : d.common.error);
        }
        if (
          loadError instanceof Error &&
          "code" in loadError &&
          loadError.code === "JOB_EXPIRED" &&
          interval
        ) {
          window.clearInterval(interval);
        }
      }
    }

    load();
    interval = window.setInterval(load, 3000);

    return () => {
      mounted = false;
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [d.common.error, jobId, queryToken]);

  return (
    <PageContainer className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-semibold text-slate-950">{d.job.title}</h1>
        <p className="text-lg leading-8 text-slate-600">{d.job.subtitle}</p>
      </div>

      {error ? (
        <div className="space-y-4">
          <ErrorState message={error} />
          <Link className="text-sm font-medium text-teal-800 underline" to="/lookup">
            {d.job.lookupLink}
          </Link>
        </div>
      ) : null}
      {!job && !error ? <LoadingState /> : null}

      {job ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-5">
            {access ? (
              <section className="rounded-lg border border-slate-200/80 bg-white/70 p-5">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-950">
                      {d.job.access.title}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {d.job.access.description}
                    </p>
                  </div>

                  {copyError ? (
                    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                      {copyError}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div className="rounded-md border border-slate-200 bg-white/70 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase text-slate-500">
                            {d.job.access.jobIdLabel}
                          </p>
                          <p className="mt-1 break-all font-mono text-sm text-slate-900">
                            {access.jobId}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {d.job.access.jobIdHelp}
                          </p>
                        </div>
                        <Button
                          onClick={() => copyAccessText("jobId", access.jobId)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Copy className="h-4 w-4" />
                          {copyTarget === "jobId" ? d.common.copied : d.job.access.copyJobId}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-white/70 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase text-slate-500">
                            {d.job.access.tokenLabel}
                          </p>
                          <p className="mt-1 break-all font-mono text-sm text-slate-900">
                            {access.token}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {d.job.access.tokenHelp}
                          </p>
                        </div>
                        <Button
                          onClick={() => copyAccessText("token", access.token)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Copy className="h-4 w-4" />
                          {copyTarget === "token" ? d.common.copied : d.job.access.copyToken}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-white/70 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase text-slate-500">
                            {d.job.access.restoreLinkLabel}
                          </p>
                          <p className="mt-1 break-all font-mono text-sm text-slate-900">
                            {restoreLink}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {d.job.access.restoreLinkHelp}
                          </p>
                        </div>
                        <Button
                          onClick={() => copyAccessText("restoreLink", restoreLink)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Copy className="h-4 w-4" />
                          {copyTarget === "restoreLink"
                            ? d.common.copied
                            : d.job.access.copyRestoreLink}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => copyAccessText("json", accessJson)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Copy className="h-4 w-4" />
                      {copyTarget === "json" ? d.common.copied : d.job.access.copyJson}
                    </Button>
                    <Button
                      onClick={downloadAccessJson}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      {d.job.access.downloadJson}
                    </Button>
                  </div>
                </div>
              </section>
            ) : null}
            <JobStatusCard job={job} token={access?.token ?? ""} />
            <JobLogPanel job={job} />
          </div>
          <JobTimeline status={job.status} />
        </div>
      ) : null}
    </PageContainer>
  );
}
