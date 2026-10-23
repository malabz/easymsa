import { useMediaQuery } from "../../lib/hooks/useMediaQuery";
import { refinementText } from "../../lib/i18n/refinements";
import { HELP_LINKS } from "../../lib/docs/links";
import type { ReactNode } from "react";
import { CheckCircle2, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../common/Button";
import { WorkspaceBackLink } from "../layout/AnalysisWorkspace";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { displayAlgorithmLabel } from "../../lib/algorithmNames";
import { formatDateTime } from "../../lib/utils/format";
import type { ResultSummary } from "../../lib/types/result";
import type { JobDetail } from "../../lib/types/job";
import { sequenceRetentionFraction } from "./ResultOverview";

export function ResultSidebar({ title, summary, job, links, note, onDownload }: {
  title: string; summary?: ResultSummary; job?: JobDetail; links?: ReactNode;
  note?: ReactNode; onDownload: () => void;
}) {
  const { dictionary: d, locale } = useLanguage();
  const t = d.results.overview.preprocess;
  const narrow = useMediaQuery("(max-width: 700px)");
  const ui = refinementText[locale];
  const p = summary?.preprocess;
  const values = t.values as Record<string, string>;
  const retention = sequenceRetentionFraction(p?.rawSequenceCount ?? null, p?.cleanSequenceCount ?? null);
  const number = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString();
  const method = summary?.algorithm ?? job?.algorithm;
  return <>
    <div className="result-back"><WorkspaceBackLink /></div>
    <details className="result-information" open={!narrow} key={String(narrow)}><summary>{ui.taskInfo}</summary>
    <div className="result-information-body">
    <h2 className="workspace-task-title">{title}</h2>
    {summary && <p className="workspace-state"><CheckCircle2 size={17} />{d.job.statusLabels.completed}</p>}
    {summary ? <dl className="workspace-facts">
      <div><dt>{d.job.algorithmLabel}</dt><dd>{method?.name || method?.resolvedName ? displayAlgorithmLabel(method.name, method.resolvedName, d.common.algorithmNames, d.common.algorithmAutoResolved) : "—"}</dd></div>
      <div><dt>{locale === "zh" ? "序列数" : "Sequences"}</dt><dd>{number(summary?.metrics.sequenceCount)}</dd></div>
      {job && <div><dt>{d.job.jobId}</dt><dd>{job.jobId}</dd></div>}
      {job?.createdAt && <div><dt>{d.common.createdAt}</dt><dd>{formatDateTime(job.createdAt, locale)}</dd></div>}
    </dl> : <div aria-busy="true" className="result-facts-skeleton"><span/><span/><span/></div>}
    {(p?.rawSequenceCount != null || p?.cleanSequenceCount != null || p?.removedSequenceCount != null) && <section className="workspace-side-section">
      <h3>{t.title}</h3>
      <dl className="workspace-facts">
        {[[t.raw, p?.rawSequenceCount], [t.retained, p?.cleanSequenceCount], [t.removed, p?.removedSequenceCount]].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{number(value as number | null | undefined)}</dd></div>)}
        <div><dt>{t.retentionRate}</dt><dd>{retention == null ? "—" : `${(retention * 100).toFixed(1)}%`}</dd></div>
      </dl>
    </section>}
    {(p?.mode || p?.strictness) && <details className="workspace-parameters"><summary>{ui.parameters}</summary><dl className="workspace-facts">      <div><dt>{t.mode}</dt><dd>{p?.mode ? values[p.mode.toLowerCase()] ?? p.mode : "—"}</dd></div>
      <div><dt>{t.strictness}</dt><dd>{p?.strictness ? values[p.strictness.toLowerCase()] ?? p.strictness : "—"}</dd></div>
    </dl></details>}
    {links && <div className="workspace-side-links">{links}</div>}
    {note && <div className="workspace-side-note">{note}</div>}
    </div></details>
    <div className="workspace-side-bottom result-download-actions">
      {job?.expiresAt && <p className="workspace-side-note">{locale === "zh" ? "结果保留至 " : "Available until "}{formatDateTime(job.expiresAt, locale)}</p>}
      <Button disabled={!summary} onClick={onDownload} className="w-full"><Download size={16} />{d.results.overview.actions.openDownloads}</Button>
      <Link className="work-link" to={HELP_LINKS.metrics}>{locale === "zh" ? "指标与使用帮助" : "Metrics and help"}</Link>
    </div>
  </>;
}
