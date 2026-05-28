import { ArrowRight, Clock3 } from "lucide-react";
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

export function JobStatusCard({ job }: { job: JobDetail }) {
  const { dictionary: d } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{d.job.statusLabels[job.status]}</CardTitle>
        <CardDescription>{job.currentStep}</CardDescription>
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
              {job.jobName}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{d.job.progress}</span>
            <span className="font-mono text-slate-600">{job.progress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-cyan-700 transition-all duration-700"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-cyan-700" />
            {d.common.createdAt}: {formatDateTime(job.createdAt)}
          </span>
          {job.status === "completed" ? (
            <ButtonLink to={`/results/${job.jobId}`}>
              {d.common.viewResults}
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
