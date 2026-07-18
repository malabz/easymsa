import { BarChart3, Dna, MousePointer2, X } from "lucide-react";
import { useEffect } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { MSASequence } from "../../lib/types/msa";
import { Button } from "../../components/common/Button";
import type {
  CellSelection,
  ColumnRange,
  ColumnStats,
  RangeStats
} from "./types";

function percent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words font-mono text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function InspectorContent({
  alignmentPosition,
  base,
  columnStats,
  columnSummary,
  range,
  rangeStats,
  reference,
  referencePosition,
  selection
}: {
  alignmentPosition: number | null;
  base: string;
  columnStats: ColumnStats | null;
  columnSummary: string;
  range: ColumnRange | null;
  rangeStats: RangeStats | null;
  reference: MSASequence | null;
  referencePosition: number | null;
  selection: CellSelection | null;
}) {
  const { dictionary: d } = useLanguage();
  const t = d.results.viewer.stageTwo;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Dna className="h-3.5 w-3.5 text-teal-700" />
          {t.reference}
        </p>
        <p className="mt-2 truncate font-mono text-sm text-slate-900">
          {reference?.id ?? t.noReference}
        </p>
      </section>

      {selection && alignmentPosition ? (
        <>
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MousePointer2 className="h-4 w-4 text-teal-700" />
              {d.results.viewer.selectedCell}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Stat label={d.results.viewer.selectedSequence} value={selection.sequenceId} />
              <Stat label={t.alignmentPosition} value={alignmentPosition} />
              <Stat label={t.referencePosition} value={referencePosition ?? "—"} />
              <Stat label={d.results.viewer.selectedBase} value={base || d.results.viewer.emptyCell} />
            </div>
          </section>

          {columnStats ? (
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BarChart3 className="h-4 w-4 text-teal-700" />
                {d.results.viewer.columnSummary}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Stat label={d.results.viewer.columnConservation} value={percent(columnStats.conservation)} />
                <Stat label={d.results.viewer.columnGap} value={percent(columnStats.gapFraction)} />
                <Stat label={t.tracks.coverage} value={percent(columnStats.coverage)} />
                <Stat label={t.tracks.entropy} value={columnStats.entropy.toFixed(3)} />
                <div className="col-span-2">
                  <Stat label={t.stats.baseComposition} value={columnSummary || "—"} />
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          {d.results.viewer.noSelection}
        </p>
      )}

      {range && rangeStats ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            {d.results.viewer.selectedRange.replace(
              "{range}",
              range.start === range.end ? String(range.start) : `${range.start}-${range.end}`
            )}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={d.results.viewer.rangeLength} value={rangeStats.length} />
            <Stat label={t.stats.gcContent} value={percent(rangeStats.gcFraction)} />
            <Stat label={d.results.viewer.rangeConservation} value={percent(rangeStats.averageConservation)} />
            <Stat label={d.results.viewer.rangeGap} value={percent(rangeStats.averageGapFraction)} />
            <Stat label={t.stats.averageCoverage} value={percent(rangeStats.averageCoverage)} />
            <Stat label={t.stats.averageEntropy} value={rangeStats.averageEntropy.toFixed(3)} />
            {reference ? (
              <>
                <Stat label={t.stats.mismatches} value={rangeStats.mismatchCount} />
                <Stat label={t.stats.insertions} value={rangeStats.insertionCount} />
                <Stat label={t.stats.deletions} value={rangeStats.deletionCount} />
                <Stat label={t.stats.transitions} value={rangeStats.transitionCount} />
                <Stat label={t.stats.transversions} value={rangeStats.transversionCount} />
              </>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function MsaInspector({
  mobileOpen,
  onClose,
  ...contentProps
}: Parameters<typeof InspectorContent>[0] & {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { dictionary: d } = useLanguage();
  const title = d.results.viewer.stageTwo.inspector;
  const content = <InspectorContent {...contentProps} />;

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, onClose]);

  return (
    <>
      <aside className="hidden xl:block" aria-label={title}>
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-auto rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-950">{title}</h2>
          {content}
        </div>
      </aside>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-slate-950/35 xl:hidden"
          onClick={(event) => event.target === event.currentTarget && onClose()}
          role="presentation"
        >
          <aside
            aria-label={title}
            aria-modal="true"
            className="absolute inset-y-0 right-0 w-[min(90vw,24rem)] overflow-auto bg-white p-5 shadow-2xl"
            role="dialog"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
              <Button
                aria-label={d.results.viewer.stageTwo.closeInspector}
                className="h-9 w-9 px-0"
                onClick={onClose}
                size="sm"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
}
