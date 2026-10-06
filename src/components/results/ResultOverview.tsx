import { Activity, AlignJustify, Database, FileArchive, FileText, Gauge, Layers3, Percent, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { useMsaAnalysis } from "../../features/msa-viewer/useMsaAnalysis";
import type { AlignmentOverviewBase, AlignmentOverviewStats } from "../../features/msa-viewer/types";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { MSAResult, MSASequence } from "../../lib/types/msa";
import type { ResultSummary } from "../../lib/types/result";
import { formatPercent } from "../../lib/utils/format";
import { AlignmentQualityOverview } from "./AlignmentQualityOverview";

const EMPTY_SEQUENCES: MSASequence[] = [];
const BASES: AlignmentOverviewBase[] = ["A", "C", "G", "T", "U", "N", "other", "gap"];
const BASE_COLORS: Record<AlignmentOverviewBase, string> = {
  A: "bg-emerald-600", C: "bg-sky-600", G: "bg-amber-500", T: "bg-rose-600",
  U: "bg-fuchsia-600", N: "bg-slate-500", other: "bg-slate-400", gap: "bg-slate-300",
};
type ResultOverviewProps = {
  summary: ResultSummary; alignment?: MSAResult; alignmentPending: boolean;
  alignmentError?: string | null; onOpenAlignment: () => void; onOpenDownloads: () => void;
};
function count(value: number | null) { return value === null ? "—" : value.toLocaleString(); }
function percentFromFraction(value: number | null) { return value === null ? "—" : formatPercent(value * 100); }
export function sequenceRetentionFraction(raw: number | null, clean: number | null) {
  return raw !== null && raw > 0 && clean !== null ? clean / raw : null;
}
function Composition({ overview }: { overview: AlignmentOverviewStats }) {
  const { dictionary: d } = useLanguage();
  const t = d.results.overview.science;
  return <section className="overview-composition">
    <div className="overview-section-line">
      <h3>{t.baseComposition}</h3>
      <ul className="composition-legend">
        {BASES.filter(base => overview.baseCounts[base] > 0).map(base => {
          const value = overview.baseCounts[base];
          const percentage = formatPercent(value / overview.totalCells * 100);
          return <li key={base} title={`${value.toLocaleString()} · ${percentage}`}>
            <span aria-hidden="true" className={BASE_COLORS[base]} />{t.bases[base]} <span className="composition-percent">{percentage}</span>
          </li>;
        })}
      </ul>
    </div>
    <div className="composition-bar" aria-hidden="true">
      {BASES.map(base => <span key={base} className={BASE_COLORS[base]} style={{ width: `${overview.totalCells ? overview.baseCounts[base] / overview.totalCells * 100 : 0}%` }} />)}
    </div>
  </section>;
}
function OutputFiles({ files, onOpenDownloads }: { files: string[]; onOpenDownloads: () => void }) {
  const { dictionary: d, locale } = useLanguage();
  const t = d.results.overview.outputs;
  const groups = [
    { key: "alignment", label: t.groups.alignment, icon: FileArchive, files: files.filter(file => !file.startsWith("preprocess/") && !file.startsWith("logs/")) },
    { key: "preprocess", label: t.groups.preprocess, icon: Workflow, files: files.filter(file => file.startsWith("preprocess/")) },
    { key: "logs", label: t.groups.logs, icon: FileText, files: files.filter(file => file.startsWith("logs/")) }
  ].filter(group => group.files.length);
  return <section className="overview-output-row">
    <h3>{t.title}</h3>
    {groups.length ? groups.map(group => {
      const Icon = group.icon;
      return <button className="overview-output-link" key={group.key} onClick={onOpenDownloads} type="button">
        <Icon size={18} aria-hidden="true" /><span>{group.label}<small>{locale === "zh" ? `${group.files.length} 个文件 · 查看下载` : `${group.files.length} files · Downloads`}</small></span>
      </button>;
    }) : <p className="work-hint">{t.empty}</p>}
  </section>;
}
export function ResultOverview({ summary, alignment, alignmentPending, alignmentError, onOpenDownloads }: ResultOverviewProps) {
  const { dictionary: d } = useLanguage();
  const t = d.results.overview;
  const descriptor = alignment?.descriptor;
  const canAnalyze = Boolean(alignment && !alignment.truncated && alignment.sequences.length > 0 &&
    descriptor?.alignmentMode !== "neutral" && descriptor?.alignmentMode !== "rawUnequal" &&
    descriptor?.alphabet !== "protein" && descriptor?.alphabet !== "unknown");
  const sequences = canAnalyze ? alignment!.sequences : EMPTY_SEQUENCES;
  const length = canAnalyze ? alignment!.alignmentLength ?? alignment!.sequences.reduce((n, s) => Math.max(n, s.sequence.length), 0) : 0;
  const analysis = useMsaAnalysis(sequences, length, {
    sourceFingerprint: descriptor?.alignmentSha256 ?? descriptor?.sourceKey,
    alphabet: descriptor?.alphabet, alignmentMode: descriptor?.alignmentMode, enabled: canAnalyze,
  });
  const derived = analysis.overview;
  const pending = canAnalyze && analysis.isCalculating;
  const metrics = [
    { key: "sequenceCount", icon: Database, label: d.results.metrics.sequenceCount, value: count(summary.metrics.sequenceCount) },
    { key: "alignmentLength", icon: AlignJustify, label: d.results.metrics.alignmentLength, value: count(summary.metrics.alignmentLength) },
    { key: "gapPercentage", icon: Percent, label: d.results.metrics.gapPercentage, value: summary.metrics.gapPercentage === null ? "—" : formatPercent(summary.metrics.gapPercentage) },
    ...(canAnalyze ? [
      { key: "averageConservation", icon: ShieldCheck, label: d.results.metrics.averageConservation, value: pending ? "…" : percentFromFraction(derived?.averageConservation ?? null) },
      { key: "averageEntropy", icon: Activity, label: d.results.metrics.averageEntropy, value: pending ? "…" : derived ? derived.averageEntropy.toFixed(3) : "—" },
      { key: "variableColumns", icon: Layers3, label: d.results.metrics.variableColumns, value: pending ? "…" : count(derived?.variableColumns ?? null) },
      { key: "gc", icon: Sparkles, label: d.results.metrics.gcContent, value: pending ? "…" : percentFromFraction(derived?.gcFraction ?? null) },
      { key: "coverage", icon: Gauge, label: d.results.metrics.averageCoverage, value: pending ? "…" : percentFromFraction(derived?.averageCoverage ?? null) },
      { key: "highGap", icon: Layers3, label: d.results.metrics.highGapColumns, value: pending ? "…" : count(derived?.highGapColumns ?? null) },
    ] : []),
    ...(summary.metrics.averageIdentity !== null ? [
      { key: "averageIdentity", icon: Gauge, label: d.results.metrics.averageIdentity, value: formatPercent(summary.metrics.averageIdentity) }
    ] : []),
  ];
  let state: "loading" | "ready" | "truncated" | "neutral" | "error" | "empty" = "empty";
  if (alignmentPending && !alignment) state = "loading";
  else if (alignmentError) state = "error";
  else if (alignment?.truncated) state = "truncated";
  else if (alignment?.sequences.length && !canAnalyze) state = "neutral";
  else if (canAnalyze && analysis.error) state = "error";
  else if (canAnalyze && (analysis.isCalculating || !derived)) state = "loading";
  else if (canAnalyze && derived) state = "ready";
  return <div className="compact-overview">
    <section aria-label={t.summary.title} className="overview-metric-grid">
      {metrics.map(({ key, icon: Icon, label, value }) => <div className="overview-metric" key={key}>
        <p className="flex items-center gap-2 font-medium text-slate-600"><Icon size={15} className="shrink-0 text-teal-700" />{label}</p><p className="overview-metric-value">{value}</p>
      </div>)}
    </section>
    {state === "loading" && <p className="overview-analysis-message" role="status">{t.science.calculating}</p>}
    {state === "error" && <p className="overview-analysis-message text-amber-800" role="status">{t.science.failed}</p>}
    {state === "truncated" && <p className="overview-analysis-message text-amber-800" role="status">{t.science.truncated}</p>}
    {state === "neutral" && <p className="overview-analysis-message" role="status">{d.results.viewer.neutralTitle} · {d.results.viewer.neutralDescription}</p>}
    {state === "empty" && <p className="overview-analysis-message">{t.science.empty}</p>}
    {state === "ready" && derived && <>
      {analysis.columnStore && <AlignmentQualityOverview columnStore={analysis.columnStore} />}
      <Composition overview={derived} />
    </>}
    <OutputFiles files={summary.outputFiles} onOpenDownloads={onOpenDownloads} />
  </div>;
}
