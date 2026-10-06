import { AlertTriangle, CheckCircle2, Circle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "../common/Card";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { JobStatus } from "../../lib/types/job";
import { realignText } from "../../lib/i18n/realignment";
import { cn } from "../../lib/utils/cn";

const steps: JobStatus[] = [
  "queued",
  "preprocessing",
  "aligning",
  "packaging",
  "completed"
];

export function JobTimeline({ status, realign = false, standalone = false, refinementStatus, compact = false }: { status: JobStatus; realign?: boolean; standalone?: boolean; refinementStatus?: string; compact?: boolean }) {
  const visibleSteps = standalone ? ["queued", "realigning", "packaging", "completed"] as JobStatus[] : realign ? ["queued", "preprocessing", "aligning", "realigning", "packaging", "completed"] as JobStatus[] : steps;
  const { dictionary: d, locale } = useLanguage();
  const currentIndex = visibleSteps.indexOf(status);

  const timeline = <ol aria-label={d.job.timeline} className={compact ? "workspace-timeline" : "space-y-4"}>
          {visibleSteps.map((step, index) => {
            const unsuccessful = step === "realigning" && (refinementStatus === "failed" || refinementStatus === "skipped");
            const complete = !unsuccessful && (index < currentIndex || status === "completed");
            const current = index === currentIndex && status !== "completed";
            const Icon = unsuccessful ? AlertTriangle : complete ? CheckCircle2 : current ? Loader2 : Circle;

            return (
              <li aria-current={current ? "step" : undefined} className="flex gap-3" key={step}>
                <Icon
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    complete && "text-emerald-700",
                    current && "animate-spin text-teal-700",
                    unsuccessful ? "text-amber-700" : !complete && !current && "text-slate-300"
                  )}
                />
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      complete || current ? "text-slate-900" : "text-slate-500"
                    )}
                  >
                    {unsuccessful ? realignText[locale][refinementStatus === "skipped" ? "skipped" : "failed"] : d.job.statusLabels[step]}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>;
  return compact ? timeline : <Card><CardHeader><CardTitle className="text-lg">{d.job.timeline}</CardTitle></CardHeader><CardContent>{timeline}</CardContent></Card>;
}
