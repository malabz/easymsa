import {
  Activity,
  AlignJustify,
  ArrowRight,
  CheckCircle2,
  Database,
  Download,
  FileArchive,
  FileText,
  FlaskConical,
  Gauge,
  Layers3,
  Percent,
  ShieldCheck,
  Sparkles,
  Workflow
} from "lucide-react";
import { useMemo } from "react";
import { useMsaAnalysis } from "../../features/msa-viewer/useMsaAnalysis";
import type {
  AlignmentOverviewBase,
  AlignmentOverviewStats
} from "../../features/msa-viewer/types";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { MSAResult, MSASequence } from "../../lib/types/msa";
import type { ResultSummary } from "../../lib/types/result";
import { formatPercent } from "../../lib/utils/format";
import { Button } from "../common/Button";
import { AlignmentQualityOverview } from "./AlignmentQualityOverview";

const EMPTY_SEQUENCES: MSASequence[] = [];
const BASES: AlignmentOverviewBase[] = [
  "A",
  "C",
  "G",
  "T",
  "U",
  "N",
  "other",
  "gap"
];
const BASE_COLORS: Record<AlignmentOverviewBase, string> = {
  A: "bg-emerald-600",
  C: "bg-sky-600",
  G: "bg-amber-500",
  T: "bg-rose-600",
  U: "bg-fuchsia-600",
  N: "bg-slate-500",
  other: "bg-slate-400",
  gap: "bg-slate-300"
};

type ResultOverviewProps = {
  summary: ResultSummary;
  alignment?: MSAResult;
  alignmentPending: boolean;
  alignmentError?: string | null;
  onOpenAlignment: () => void;
  onOpenDownloads: () => void;
};

function count(value: number | null) {
  return value === null ? "—" : value.toLocaleString();
}

function percentFromFraction(value: number | null) {
  return value === null ? "—" : formatPercent(value * 100);
}

export function sequenceRetentionFraction(
  rawSequenceCount: number | null,
  cleanSequenceCount: number | null
) {
  return rawSequenceCount !== null &&
    rawSequenceCount > 0 &&
    cleanSequenceCount !== null
    ? cleanSequenceCount / rawSequenceCount
    : null;
}

function settingLabel(
  value: string | null,
  labels: Record<string, string>,
  fallback: string
) {
  if (!value) {
    return fallback;
  }
  return labels[value.toLowerCase()] ?? value;
}

function AnalysisSkeleton({ label }: { label: string }) {
  return (
    <div aria-live="polite" className="space-y-4" role="status">
      <span className="sr-only">{label}</span>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="h-20 animate-pulse rounded-lg bg-slate-100" key={item} />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <Icon className="h-4 w-4 text-teal-700" />
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Composition({ overview }: { overview: AlignmentOverviewStats }) {
  const { dictionary: d } = useLanguage();
  const t = d.results.overview.science;
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-900">{t.baseComposition}</h4>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {BASES.map((base) => {
          const value = overview.baseCounts[base];
          const fraction = overview.totalCells > 0 ? value / overview.totalCells : 0;
          return (
            <div className="space-y-1.5" key={base}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-slate-700">{t.bases[base]}</span>
                <span className="tabular-nums text-slate-500">
                  {value.toLocaleString()} · {formatPercent(fraction * 100)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  aria-hidden="true"
                  className={`h-full rounded-full ${BASE_COLORS[base]}`}
                  style={{ width: `${Math.max(0, Math.min(100, fraction * 100))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs leading-5 text-slate-500">{t.compositionNote}</p>
    </div>
  );
}

function OutputFiles({
  files,
  onOpenDownloads
}: {
  files: string[];
  onOpenDownloads: () => void;
}) {
  const { dictionary: d } = useLanguage();
  const t = d.results.overview.outputs;
  const groups = useMemo(
    () => [
      {
        key: "preprocess",
        label: t.groups.preprocess,
        icon: Workflow,
        files: files.filter((file) => file.startsWith("preprocess/"))
      },
      {
        key: "alignment",
        label: t.groups.alignment,
        icon: FileArchive,
        files: files.filter(
          (file) => !file.startsWith("preprocess/") && !file.startsWith("logs/")
        )
      },
      {
        key: "logs",
        label: t.groups.logs,
        icon: FileText,
        files: files.filter((file) => file.startsWith("logs/"))
      }
    ].filter((group) => group.files.length > 0),
    [files, t.groups.alignment, t.groups.logs, t.groups.preprocess]
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
            <FileArchive className="h-5 w-5 text-teal-700" />
            {t.title}
          </h3>
          <p className="text-sm leading-6 text-slate-600">
            {t.description.replace("{count}", files.length.toLocaleString())}
          </p>
        </div>
        <Button onClick={onOpenDownloads} size="sm" variant="outline">
          <Download className="h-4 w-4" />
          {d.results.overview.actions.openDownloads}
        </Button>
      </div>
      {groups.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {groups.map((group) => {
            const Icon = group.icon;
            return (
              <div className="rounded-xl bg-slate-50 p-4" key={group.key}>
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Icon className="h-4 w-4 text-teal-700" />
                  {group.label}
                </p>
                <ul className="mt-3 space-y-2">
                  {group.files.map((file) => (
                    <li className="break-all font-mono text-xs leading-5 text-slate-600" key={file}>
                      {file}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {t.empty}
        </p>
      )}
    </section>
  );
}

export function ResultOverview({
  summary,
  alignment,
  alignmentPending,
  alignmentError,
  onOpenAlignment,
  onOpenDownloads
}: ResultOverviewProps) {
  const { dictionary: d } = useLanguage();
  const t = d.results.overview;
  const canAnalyze = Boolean(
    alignment &&
      !alignment.truncated &&
      alignment.sequences.length > 0
  );
  const analysisSequences = canAnalyze ? alignment!.sequences : EMPTY_SEQUENCES;
  const analysisLength = canAnalyze
    ? alignment!.alignmentLength ??
      Math.max(0, ...alignment!.sequences.map((sequence) => sequence.sequence.length))
    : 0;
  const analysis = useMsaAnalysis(analysisSequences, analysisLength, "");
  const preprocess = summary.preprocess;
  const retention = sequenceRetentionFraction(
    preprocess.rawSequenceCount,
    preprocess.cleanSequenceCount
  );
  const derivedPending = canAnalyze && analysis.isCalculating;
  const derived = analysis.overview;
  const metrics = [
    {
      key: "sequenceCount",
      icon: Database,
      label: d.results.metrics.sequenceCount,
      value: count(summary.metrics.sequenceCount)
    },
    {
      key: "alignmentLength",
      icon: AlignJustify,
      label: d.results.metrics.alignmentLength,
      value: count(summary.metrics.alignmentLength)
    },
    {
      key: "gapPercentage",
      icon: Percent,
      label: d.results.metrics.gapPercentage,
      value:
        summary.metrics.gapPercentage === null
          ? "—"
          : formatPercent(summary.metrics.gapPercentage)
    },
    {
      key: "averageConservation",
      icon: ShieldCheck,
      label: d.results.metrics.averageConservation,
      value: derivedPending ? "…" : percentFromFraction(derived?.averageConservation ?? null)
    },
    {
      key: "averageEntropy",
      icon: Activity,
      label: d.results.metrics.averageEntropy,
      value: derivedPending ? "…" : derived ? derived.averageEntropy.toFixed(3) : "—"
    },
    {
      key: "variableColumns",
      icon: Layers3,
      label: d.results.metrics.variableColumns,
      value: derivedPending ? "…" : count(derived?.variableColumns ?? null)
    },
    ...(summary.metrics.averageIdentity !== null
      ? [{
          key: "averageIdentity",
          icon: Gauge,
          label: d.results.metrics.averageIdentity,
          value: formatPercent(summary.metrics.averageIdentity)
        }]
      : [])
  ];
  const preprocessLabels = t.preprocess.values as Record<string, string>;

  let analysisState: "loading" | "ready" | "truncated" | "error" | "empty" = "empty";
  if (alignmentPending && !alignment) {
    analysisState = "loading";
  } else if (alignmentError || analysis.error) {
    analysisState = "error";
  } else if (alignment?.truncated) {
    analysisState = "truncated";
  } else if (canAnalyze && (analysis.isCalculating || !analysis.overview)) {
    analysisState = "loading";
  } else if (canAnalyze && analysis.overview) {
    analysisState = "ready";
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
              <CheckCircle2 className="h-4 w-4" />
              {t.completed}
            </p>
            <div>
              <h2 className="text-2xl font-semibold text-slate-950 sm:text-3xl">{t.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                {t.description
                  .replace("{sequences}", count(summary.metrics.sequenceCount))
                  .replace("{columns}", count(summary.metrics.alignmentLength))}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Button onClick={onOpenAlignment}>
              {t.actions.openAlignment}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button onClick={onOpenDownloads} variant="outline">
              <Download className="h-4 w-4" />
              {t.actions.openDownloads}
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="overview-summary-title" className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950" id="overview-summary-title">
            {t.summary.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{t.summary.description}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {metrics.map((metric) => <MetricCard {...metric} key={metric.key} />)}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
              <Workflow className="h-5 w-5 text-teal-700" />
              {t.preprocess.title}
            </h3>
            <p className="text-sm leading-6 text-slate-600">{t.preprocess.description}</p>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              [t.preprocess.raw, preprocess.rawSequenceCount],
              [t.preprocess.retained, preprocess.cleanSequenceCount],
              [t.preprocess.removed, preprocess.removedSequenceCount]
            ].map(([label, value]) => (
              <div className="rounded-xl bg-slate-50 p-3" key={String(label)}>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{count(value as number | null)}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">{t.preprocess.retentionRate}</span>
              <span className="font-semibold tabular-nums text-slate-950">
                {percentFromFraction(retention)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                aria-hidden="true"
                className="h-full rounded-full bg-teal-600"
                style={{ width: `${Math.max(0, Math.min(100, (retention ?? 0) * 100))}%` }}
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800">
              {t.preprocess.mode}: {settingLabel(preprocess.mode, preprocessLabels, t.unavailable)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
              {t.preprocess.strictness}: {settingLabel(preprocess.strictness, preprocessLabels, t.unavailable)}
            </span>
          </div>
          {preprocess.rawSequenceCount === null && preprocess.cleanSequenceCount === null ? (
            <p className="mt-4 text-xs leading-5 text-slate-500">{t.preprocess.unavailable}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
              <FlaskConical className="h-5 w-5 text-teal-700" />
              {t.science.title}
            </h3>
            <p className="text-sm leading-6 text-slate-600">{t.science.description}</p>
          </div>
          <div className="mt-5">
            {analysisState === "loading" ? <AnalysisSkeleton label={t.science.calculating} /> : null}
            {analysisState === "error" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="status">
                {t.science.failed}
              </div>
            ) : null}
            {analysisState === "truncated" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="status">
                {t.science.truncated}
              </div>
            ) : null}
            {analysisState === "empty" ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {t.science.empty}
              </div>
            ) : null}
            {analysisState === "ready" && derived ? (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard icon={Sparkles} label={d.results.metrics.gcContent} value={percentFromFraction(derived.gcFraction)} />
                  <MetricCard icon={Gauge} label={d.results.metrics.averageCoverage} value={percentFromFraction(derived.averageCoverage)} />
                  <MetricCard icon={Layers3} label={d.results.metrics.highGapColumns} value={derived.highGapColumns.toLocaleString()} />
                </div>
                <AlignmentQualityOverview columns={analysis.columns} />
                <Composition overview={derived} />
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <OutputFiles files={summary.outputFiles} onOpenDownloads={onOpenDownloads} />
    </div>
  );
}
