import { TerminalSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "../common/Card";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { JobDetail } from "../../lib/types/job";

function buildEvents(job: JobDetail) {
  const events = [
    `Job ${job.jobId} is ${job.status}.`,
    job.message,
    job.preprocess.status
      ? `Preprocess ${job.preprocess.status}${job.preprocess.mode ? ` (${job.preprocess.mode})` : ""}.`
      : null,
    job.algorithm.name ? `Algorithm: ${job.algorithm.name}.` : null,
    job.failure ? `Failure ${job.failure.code}: ${job.failure.message}` : null,
    job.preprocess.errorMessage
      ? `Preprocess error: ${job.preprocess.errorMessage}`
      : null,
    job.expiresAt ? `Expires at ${new Date(job.expiresAt).toLocaleString()}.` : null
  ];

  return events.filter((event): event is string => Boolean(event));
}

export function JobLogPanel({ job }: { job: JobDetail }) {
  const { dictionary: d } = useLanguage();
  const logs = buildEvents(job);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TerminalSquare className="h-5 w-5 text-teal-700" />
          {d.job.logs}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
          {logs.map((log, index) => (
            <p key={`${log}-${index}`}>
              <span className="text-teal-300">{String(index + 1).padStart(2, "0")}</span>{" "}
              {log}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
