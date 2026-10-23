import { useLanguage } from "../../lib/i18n/useLanguage";
import { realignText } from "../../lib/i18n/realignment";
import type { RealignmentStatus, ResultStage } from "../../lib/types/job";

export function resolvedResultStage(stage: ResultStage, realignment?: RealignmentStatus | null): ResultStage {
  if (stage !== "final" || !realignment) return stage;
  if (realignment.refinedAvailable && realignment.status === "completed") return "refined";
  return realignment.initialAvailable ? "initial" : "final";
}

export function ResultStageControl({ stage, stages, onChange }: {
  stage: ResultStage; stages: ResultStage[]; onChange: (stage: ResultStage) => void;
}) {
  const { locale } = useLanguage();
  const t = realignText[locale];
  if (stages.length < 2) return null;
  return <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium">
    {t.resultVersion}
    <select aria-label={t.resultVersion} className="work-control !w-auto" value={stage}
      onChange={event => onChange(event.target.value as ResultStage)}>
      {stages.map(value => <option key={value} value={value}>{t[value]}</option>)}
    </select>
  </label>;
}

export function ResultStageNotice({ stage }: { stage: ResultStage }) {
  const { locale } = useLanguage();
  const label = realignText[locale][stage];
  return <p role="status">{locale === "zh" ? `当前显示：${label}。` : `Showing: ${label}.`}</p>;
}
