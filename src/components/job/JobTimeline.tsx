import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "../common/Card";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { JobStatus } from "../../lib/types/job";
import { cn } from "../../lib/utils/cn";

const steps: JobStatus[] = [
  "submitted",
  "checking",
  "running",
  "preparing",
  "completed"
];

export function JobTimeline({ status }: { status: JobStatus }) {
  const { dictionary: d } = useLanguage();
  const currentIndex = steps.indexOf(status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{d.job.timeline}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {steps.map((step, index) => {
            const complete = index < currentIndex || status === "completed";
            const current = index === currentIndex && status !== "completed";
            const Icon = complete ? CheckCircle2 : current ? Loader2 : Circle;

            return (
              <li className="flex gap-3" key={step}>
                <Icon
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    complete && "text-emerald-700",
                    current && "animate-spin text-teal-700",
                    !complete && !current && "text-slate-300"
                  )}
                />
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      complete || current ? "text-slate-900" : "text-slate-500"
                    )}
                  >
                    {d.job.statusLabels[step]}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
