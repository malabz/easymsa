import { useMemo, useState } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import {
  DEFAULT_ANNOTATION_FILTERS,
  filterQcAnnotations,
  type AnnotationFilters
} from "./qcModel";
import type { QcAnnotation } from "./workspaceSnapshot";

export type AnnotationTarget = QcAnnotation["target"];

export type MsaAnnotationPanelLabels = {
  title: string;
  reviewOnly: string;
  category: string;
  sequenceRow: string;
  all: string;
  allRows: string;
  containsPosition: string;
  previous: string;
  next: string;
  noMatches: string;
  newAnnotation: string;
  selectTarget: string;
  optionalNote: string;
  add: string;
  delete: string;
  updated: string;
  note: string;
  review: string;
  excludeCandidate: string;
};

export type MsaAnnotationPanelProps = {
  annotations: QcAnnotation[];
  activeTarget: AnnotationTarget | null;
  rowLabels?: ReadonlyMap<string, string>;
  labels?: Partial<MsaAnnotationPanelLabels>;
  onCreate: (
    category: QcAnnotation["category"],
    text: string,
    target: AnnotationTarget
  ) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<QcAnnotation, "category" | "text">>
  ) => void;
  onDelete: (id: string) => void;
  onJump: (annotation: QcAnnotation) => void;
};

function targetLabel(
  annotation: QcAnnotation,
  rowLabels: ReadonlyMap<string, string> | undefined,
  allRows: string
) {
  const row = annotation.target.rowKey
    ? rowLabels?.get(annotation.target.rowKey) ?? annotation.target.rowKey
    : allRows;
  const interval = annotation.target.start === null
    ? ""
    : annotation.target.start === annotation.target.end
      ? ` · ${annotation.target.start}`
      : ` · ${annotation.target.start}–${annotation.target.end}`;
  return `${row}${interval}`;
}

function positionValue(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function MsaAnnotationPanel({
  annotations,
  activeTarget,
  rowLabels,
  labels,
  onCreate,
  onUpdate,
  onDelete,
  onJump
}: MsaAnnotationPanelProps) {
  const { dictionary: d } = useLanguage();
  const t = {
    ...d.results.viewer.stageTwo.annotationPanel,
    ...labels
  } satisfies MsaAnnotationPanelLabels;
  const [filters, setFilters] = useState<AnnotationFilters>(
    DEFAULT_ANNOTATION_FILTERS
  );
  const [draftCategory, setDraftCategory] = useState<QcAnnotation["category"]>("note");
  const [draftText, setDraftText] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(
    () => filterQcAnnotations(annotations, filters),
    [annotations, filters]
  );

  function navigate(delta: number) {
    if (!filtered.length) return;
    const nextIndex = (activeIndex + delta + filtered.length) % filtered.length;
    setActiveIndex(nextIndex);
    onJump(filtered[nextIndex]);
  }

  function create() {
    if (!activeTarget) return;
    onCreate(draftCategory, draftText.trim(), activeTarget);
    setDraftText("");
  }

  return (
    <aside
      aria-label={t.title}
      className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      data-msa-annotation-panel="true"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-950">{t.title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          {t.reviewOnly}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-xs font-medium text-slate-600">
          {t.category}
          <select
            className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
            onChange={(event) => setFilters({
              ...filters,
              category: event.target.value as AnnotationFilters["category"]
            })}
            value={filters.category}
          >
            <option value="all">{t.all}</option>
            <option value="note">{t.note}</option>
            <option value="review">{t.review}</option>
            <option value="exclude-candidate">{t.excludeCandidate}</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">
          {t.sequenceRow}
          <select
            className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
            onChange={(event) => setFilters({ ...filters, rowKey: event.target.value })}
            value={filters.rowKey}
          >
            <option value="">{t.allRows}</option>
            {Array.from(rowLabels ?? []).map(([rowKey, label]) => (
              <option key={rowKey} value={rowKey}>{label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">
          {t.containsPosition}
          <input
            className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
            min={1}
            onChange={(event) => setFilters({
              ...filters,
              position: positionValue(event.target.value)
            })}
            type="number"
            value={filters.position ?? ""}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium disabled:opacity-40"
          disabled={!filtered.length}
          onClick={() => navigate(-1)}
          type="button"
        >
          {t.previous}
        </button>
        <button
          className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium disabled:opacity-40"
          disabled={!filtered.length}
          onClick={() => navigate(1)}
          type="button"
        >
          {t.next}
        </button>
        <span aria-live="polite" className="text-xs text-slate-500">
          {filtered.length ? `${Math.min(activeIndex + 1, filtered.length)} / ${filtered.length}` : t.noMatches}
        </span>
      </div>

      <div className="grid gap-2 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
        <div className="text-xs font-semibold text-teal-950">
          {t.newAnnotation} · {activeTarget
            ? `${activeTarget.rowKey ? rowLabels?.get(activeTarget.rowKey) ?? activeTarget.rowKey : t.allRows}${activeTarget.start ? ` · ${activeTarget.start}${activeTarget.end !== activeTarget.start ? `–${activeTarget.end}` : ""}` : ""}`
            : t.selectTarget}
        </div>
        <div className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)_auto]">
          <select
            aria-label={`${t.newAnnotation}: ${t.category}`}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            onChange={(event) => setDraftCategory(event.target.value as QcAnnotation["category"])}
            value={draftCategory}
          >
            <option value="note">{t.note}</option>
            <option value="review">{t.review}</option>
            <option value="exclude-candidate">{t.excludeCandidate}</option>
          </select>
          <input
            aria-label={`${t.newAnnotation}: ${t.note}`}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            maxLength={4000}
            onChange={(event) => setDraftText(event.target.value)}
            placeholder={t.optionalNote}
            value={draftText}
          />
          <button
            className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-40"
            disabled={!activeTarget}
            onClick={create}
            type="button"
          >
            {t.add}
          </button>
        </div>
      </div>

      <ol className="grid max-h-96 gap-2 overflow-auto">
        {filtered.map((annotation) => (
          <li className="grid gap-2 rounded-lg border border-slate-200 p-3" key={annotation.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <button
                className="min-h-11 text-left text-xs font-semibold text-teal-800 underline-offset-2 hover:underline"
                onClick={() => onJump(annotation)}
                type="button"
              >
                {targetLabel(annotation, rowLabels, t.allRows)}
              </button>
              <button
                className="min-h-11 rounded-lg px-3 text-xs font-medium text-rose-700 hover:bg-rose-50"
                onClick={() => onDelete(annotation.id)}
                type="button"
              >
                {t.delete}
              </button>
            </div>
            <select
              aria-label={`${t.category}: ${targetLabel(annotation, rowLabels, t.allRows)}`}
              className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
              onChange={(event) => onUpdate(annotation.id, {
                category: event.target.value as QcAnnotation["category"]
              })}
              value={annotation.category}
            >
              <option value="note">{t.note}</option>
              <option value="review">{t.review}</option>
              <option value="exclude-candidate">{t.excludeCandidate}</option>
            </select>
            <textarea
              aria-label={`${t.note}: ${targetLabel(annotation, rowLabels, t.allRows)}`}
              className="min-h-20 rounded-lg border border-slate-300 p-3 text-sm"
              maxLength={4000}
              onChange={(event) => onUpdate(annotation.id, { text: event.target.value })}
              value={annotation.text}
            />
            <time className="text-[11px] text-slate-500" dateTime={annotation.updatedAt}>
              {t.updated} {new Date(annotation.updatedAt).toLocaleString()}
            </time>
          </li>
        ))}
      </ol>
    </aside>
  );
}
