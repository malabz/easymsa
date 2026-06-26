import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Mail } from "lucide-react";
import { ButtonLink } from "../common/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../common/Card";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { JobDetail } from "../../lib/types/job";
import { formatDateTime } from "../../lib/utils/format";
import { resultsRoute } from "../../lib/api/tokens";

type CountMap = Record<string, number>;

function hasCounts(values: CountMap | null | undefined) {
  return Object.values(values ?? {}).some((value) => value > 0);
}

function mergeCounts(...maps: Array<CountMap | null | undefined>): CountMap {
  return maps.reduce<CountMap>((merged, map) => {
    for (const [key, value] of Object.entries(map ?? {})) {
      merged[key] = Math.max(merged[key] ?? 0, value);
    }
    return merged;
  }, {});
}

function formatCount(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "-";
}

function CountList({
  values,
  emptyText,
  labels
}: {
  values: CountMap | null | undefined;
  emptyText: string;
  labels: Record<string, string>;
}) {
  const entries = Object.entries(values ?? {})
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return (
      <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500">
        <CheckCircle2 className="h-3.5 w-3.5 text-teal-700" />
        {emptyText}
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
        >
          <span>{labels[key] ?? key.replace(/_/g, " ")}</span>
          <span className="font-mono text-slate-500">{value.toLocaleString()}</span>
        </span>
      ))}
    </div>
  );
}

export function JobStatusCard({ job, token }: { job: JobDetail; token: string }) {
  const { dictionary: d } = useLanguage();
  const preprocess = job.preprocess;
  const preprocessText = d.job.preprocessSummary;
  const issueCounts = mergeCounts(preprocess.qcCounts, preprocess.warningCounts);
  const showPreprocessSummary =
    Boolean(preprocess.status) ||
    Boolean(preprocess.summaryCounts) ||
    preprocess.summaryUnavailable;
  const hasAnyIssue = hasCounts(issueCounts);
  const emailStatusLabels = d.job.email.statuses as Record<string, string>;
  const emailStatus = job.emailStatus
    ? emailStatusLabels[job.emailStatus] ?? job.emailStatus
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{d.job.statusLabels[job.status]}</CardTitle>
        <CardDescription>{job.message ?? d.job.statusLabels[job.status]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">
              {d.job.jobId}
            </p>
            <p className="mt-1 font-mono text-sm text-slate-900">{job.jobId}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">
              {d.job.jobName}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {job.jobName ?? "-"}
            </p>
          </div>
        </div>

        {job.failure || job.preprocess.errorMessage ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {job.failure?.message ?? job.preprocess.errorMessage}
          </div>
        ) : null}

        {emailStatus ? (
          <div className="flex flex-col gap-1 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4 text-teal-700" />
              <span>
                {d.job.email.title}: {emailStatus}
              </span>
            </span>
            {job.emailError ? (
              <span className="text-xs text-rose-700">
                {d.job.email.error}: {job.emailError}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{d.job.progress}</span>
            <span className="font-mono text-slate-600">{job.progress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-teal-700 transition-all duration-700"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>

        {showPreprocessSummary ? (
          <section className="border-t border-slate-100 pt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {preprocessText.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {preprocess.mode === "filter"
                    ? preprocessText.modeFilter
                    : preprocessText.modeAudit}
                </p>
              </div>
              {hasAnyIssue ? (
                <span className="inline-flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {preprocessText.possibleIssues}
                </span>
              ) : null}
            </div>

            {preprocess.summaryUnavailable ? (
              <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {preprocessText.unavailable}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  label: preprocessText.rawSequences,
                  value: preprocess.summaryCounts?.raw_sequence_count
                },
                {
                  label: preprocessText.cleanSequences,
                  value: preprocess.summaryCounts?.clean_sequence_count
                },
                {
                  label: preprocessText.removedSequences,
                  value: preprocess.summaryCounts?.removed_sequence_count
                },
                {
                  label: preprocessText.collapsedDuplicates,
                  value:
                    preprocess.summaryCounts?.collapsed_duplicate_count ??
                    preprocess.dedupSummary?.collapsed_count
                }
              ].map((item) => (
                <div key={item.label} className="border-l border-slate-200 pl-3">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                    {formatCount(item.value)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {preprocessText.possibleIssues}
                </p>
                <CountList
                  values={issueCounts}
                  emptyText={preprocessText.noIssues}
                  labels={preprocessText.labels}
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {preprocessText.removalReasons}
                </p>
                <CountList
                  values={preprocess.removalCounts}
                  emptyText={preprocessText.noRemovals}
                  labels={preprocessText.labels}
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {preprocessText.cleaningActions}
                </p>
                <CountList
                  values={preprocess.cleaningCounts}
                  emptyText={preprocessText.noCleaning}
                  labels={preprocessText.labels}
                />
              </div>
            </div>
          </section>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-teal-700" />
            {d.common.createdAt}: {job.createdAt ? formatDateTime(job.createdAt) : "-"}
          </span>
          {job.status === "completed" ? (
            <ButtonLink to={resultsRoute(job.jobId, token)}>
              {d.common.viewResults}
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
