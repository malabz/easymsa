import { Activity, AlignJustify, Database, FileArchive, Percent } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { ResultSummary } from "../../lib/types/result";
import { formatPercent } from "../../lib/utils/format";

const metricIcons = {
  sequenceCount: Database,
  alignmentLength: AlignJustify,
  averageIdentity: Activity,
  gapPercentage: Percent,
  outputSizeMB: FileArchive
};

export function ResultOverview({ summary }: { summary: ResultSummary }) {
  const { dictionary: d } = useLanguage();
  const optionalPercent = (value: number | null) =>
    value === null ? "N/A" : formatPercent(value);
  const optionalSize = (value: number | null) =>
    value === null ? "N/A" : `${value.toFixed(2)} MB`;
  const metrics = [
    {
      key: "sequenceCount",
      value: summary.metrics.sequenceCount.toLocaleString()
    },
    {
      key: "alignmentLength",
      value: summary.metrics.alignmentLength.toLocaleString()
    },
    {
      key: "averageIdentity",
      value: optionalPercent(summary.metrics.averageIdentity)
    },
    {
      key: "gapPercentage",
      value: optionalPercent(summary.metrics.gapPercentage)
    },
    {
      key: "outputSizeMB",
      value: optionalSize(summary.metrics.outputSizeMB)
    }
  ] as const;

  return (
    <div className="grid gap-5 border-y border-slate-200 py-5 sm:grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric) => {
        const Icon = metricIcons[metric.key];
        return (
          <div className="min-w-0" key={metric.key}>
            <p className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Icon className="h-4 w-4 text-teal-700" />
              {d.results.metrics[metric.key]}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {metric.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
