import { Activity, AlignJustify, Database, FileArchive, Percent } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "../common/Card";
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
      value: formatPercent(summary.metrics.averageIdentity)
    },
    {
      key: "gapPercentage",
      value: formatPercent(summary.metrics.gapPercentage)
    },
    {
      key: "outputSizeMB",
      value: `${summary.metrics.outputSizeMB.toFixed(2)} MB`
    }
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric) => {
        const Icon = metricIcons[metric.key];
        return (
          <Card key={metric.key}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Icon className="h-4 w-4 text-cyan-700" />
                {d.results.metrics[metric.key]}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold text-slate-950">
                {metric.value}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
