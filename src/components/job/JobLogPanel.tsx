import { TerminalSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "../common/Card";
import { jobValue, jobMessage } from "../../lib/jobPresentation";
import { formatDateTime } from "../../lib/utils/format";
import { displayAlgorithmLabel } from "../../lib/algorithmNames";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { ApiFailure, JobDetail } from "../../lib/types/job";

type LogEntry = {
  text: string;
  multiline?: boolean;
  technical?: boolean;
};

type LogLabels = {
  jobStatus: string;
  preprocess: string;
  algorithm: string;
  failure: string;
  preprocessError: string;
  exitCode: string;
  timeout: string;
  executionError: string;
  binary: string;
  mode: string;
  algorithmDetail: string;
  toolLog: string;
  expiresAt: string;
};

function fillTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.split(`{${key}}`).join(String(value)),
    template
  );
}

function detailValue(failure: ApiFailure, key: string) {
  return failure.details && key in failure.details
    ? failure.details[key]
    : undefined;
}

function detailText(failure: ApiFailure, key: string) {
  const value = detailValue(failure, key);
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function addFailureDetailEvents(
  events: LogEntry[],
  failure: ApiFailure,
  labels: LogLabels
) {
  const exitCode = detailText(failure, "exitCode");
  if (exitCode) {
    events.push({
      technical: true,
      text: fillTemplate(labels.exitCode, { value: exitCode })
    });
  }

  const timeoutSeconds = detailText(failure, "timeoutSeconds");
  if (timeoutSeconds) {
    events.push({
      technical: true,
      text: fillTemplate(labels.timeout, { value: timeoutSeconds })
    });
  }

  const executionError = detailText(failure, "error");
  if (executionError) {
    events.push({
      technical: true,
      text: fillTemplate(labels.executionError, { value: executionError })
    });
  }

  const binary = detailText(failure, "binary");
  if (binary) {
    events.push({
      technical: true,
      text: fillTemplate(labels.binary, { value: binary })
    });
  }

  const mode = detailText(failure, "mode");
  if (mode) {
    events.push({
      technical: true,
      text: fillTemplate(labels.mode, { value: mode })
    });
  }

  const algorithm = detailText(failure, "algorithm");
  if (algorithm) {
    events.push({
      technical: true,
      text: fillTemplate(labels.algorithmDetail, { value: algorithm })
    });
  }

  const runLogTail = detailText(failure, "runLogTail");
  if (runLogTail) {
    events.push({
      technical: true,
      text: `${labels.toolLog}\n${runLogTail}`,
      multiline: true
    });
  }
}

function buildEvents(
  job: JobDetail,
  labels: LogLabels,
  algorithmLabels: Record<string, string>,
  algorithmAutoResolvedTemplate: string,
  locale: "zh" | "en"
) {
  const events: LogEntry[] = [
    {
      text: fillTemplate(labels.jobStatus, {
        jobId: job.jobId,
        status: jobValue(job.status, locale)
      })
    }
  ];

  if (job.message) {
    events.push({ text: jobMessage(job.message, locale) ?? job.message, technical: jobMessage(job.message, locale) === null });
  }

  if (job.preprocess.status) {
    events.push({
      text: fillTemplate(labels.preprocess, {
        status: jobValue(job.preprocess.status, locale),
        mode: job.preprocess.mode && job.preprocess.status !== "not_applicable" ? ` (${jobValue(job.preprocess.mode, locale)})` : ""
      })
    });
  }

  if (job.algorithm.name) {
    events.push({
      text: fillTemplate(labels.algorithm, {
        value: displayAlgorithmLabel(
          job.algorithm.name,
          job.algorithm.resolvedName,
          algorithmLabels,
          algorithmAutoResolvedTemplate
        )
      })
    });
  }

  if (job.failure) {
    events.push({
      technical: true,
      text: fillTemplate(labels.failure, {
        code: job.failure.code,
        message: job.failure.message
      })
    });
    addFailureDetailEvents(events, job.failure, labels);
  }

  if (job.preprocess.errorMessage) {
    events.push({
      text: fillTemplate(labels.preprocessError, {
        message: job.preprocess.errorMessage
      })
    });
  }

  if (job.expiresAt) {
    events.push({
      text: fillTemplate(labels.expiresAt, {
        value: formatDateTime(job.expiresAt, locale)
      })
    });
  }

  return events;
}

export function JobLogPanel({ job, compact = false }: { job: JobDetail; compact?: boolean }) {
  const { dictionary: d, locale } = useLanguage();
  const allLogs = buildEvents(
    job,
    d.job.logEntries,
    d.common.algorithmNames,
    d.common.algorithmAutoResolved,
    locale
  );

  const logs = allLogs.filter(log => !log.technical);
  const details = allLogs.filter(log => log.technical);
  const errorDetails = details.length ? <details className="mt-3 text-sm">
    <summary className="cursor-pointer text-teal-800">{locale === "zh" ? "错误详情" : "Error details"}</summary>
    <div className="mt-2 space-y-2">{details.map((log, index) => <pre key={index} className="whitespace-pre-wrap break-words text-xs">{log.text}</pre>)}</div>
  </details> : null;
  if (compact) return <><ol className="job-event-list" aria-label={d.job.logs}>
    {logs.map((log, index) => <li key={`${index}:${log.text}`}>
      <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      {log.multiline ? <pre className="min-w-0">{log.text}</pre> : <p className="min-w-0 break-words">{log.text}</p>}
    </li>)}
  </ol>{errorDetails}</>;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TerminalSquare className="h-5 w-5 text-teal-700" />
          {d.job.logs}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 rounded-md bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
          {logs.map((log, index) => (
            <div className="flex gap-2" key={`${log.text}-${index}`}>
              <span className="shrink-0 text-teal-300">
                {String(index + 1).padStart(2, "0")}
              </span>
              {log.multiline ? (
                <pre className="min-w-0 whitespace-pre-wrap break-words font-mono">
                  {log.text}
                </pre>
              ) : (
                <p className="min-w-0 break-words">{log.text}</p>
              )}
            </div>
          ))}
        </div>
        {errorDetails}
      </CardContent>
    </Card>
  );
}
