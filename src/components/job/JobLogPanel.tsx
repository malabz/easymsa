import { TerminalSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "../common/Card";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { ApiFailure, JobDetail } from "../../lib/types/job";

type LogEntry = {
  text: string;
  multiline?: boolean;
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
      text: fillTemplate(labels.exitCode, { value: exitCode })
    });
  }

  const timeoutSeconds = detailText(failure, "timeoutSeconds");
  if (timeoutSeconds) {
    events.push({
      text: fillTemplate(labels.timeout, { value: timeoutSeconds })
    });
  }

  const executionError = detailText(failure, "error");
  if (executionError) {
    events.push({
      text: fillTemplate(labels.executionError, { value: executionError })
    });
  }

  const binary = detailText(failure, "binary");
  if (binary) {
    events.push({
      text: fillTemplate(labels.binary, { value: binary })
    });
  }

  const mode = detailText(failure, "mode");
  if (mode) {
    events.push({
      text: fillTemplate(labels.mode, { value: mode })
    });
  }

  const algorithm = detailText(failure, "algorithm");
  if (algorithm) {
    events.push({
      text: fillTemplate(labels.algorithmDetail, { value: algorithm })
    });
  }

  const runLogTail = detailText(failure, "runLogTail");
  if (runLogTail) {
    events.push({
      text: `${labels.toolLog}\n${runLogTail}`,
      multiline: true
    });
  }
}

function buildEvents(job: JobDetail, labels: LogLabels) {
  const events: LogEntry[] = [
    {
      text: fillTemplate(labels.jobStatus, {
        jobId: job.jobId,
        status: job.status
      })
    }
  ];

  if (job.message) {
    events.push({ text: job.message });
  }

  if (job.preprocess.status) {
    events.push({
      text: fillTemplate(labels.preprocess, {
        status: job.preprocess.status,
        mode: job.preprocess.mode ? ` (${job.preprocess.mode})` : ""
      })
    });
  }

  if (job.algorithm.name) {
    events.push({
      text: fillTemplate(labels.algorithm, { value: job.algorithm.name })
    });
  }

  if (job.failure) {
    events.push({
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
        value: new Date(job.expiresAt).toLocaleString()
      })
    });
  }

  return events;
}

export function JobLogPanel({ job }: { job: JobDetail }) {
  const { dictionary: d } = useLanguage();
  const logs = buildEvents(job, d.job.logEntries);

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
      </CardContent>
    </Card>
  );
}
