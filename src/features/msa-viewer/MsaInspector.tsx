import { BarChart3, Dna, MousePointer2 } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { MSASequence } from "../../lib/types/msa";
import { OverlayDialog } from "../../components/common/OverlayDialog";
import type {
  AnalysisScope,
  CellSelection,
  ColumnRange,
  ColumnStats,
  RangeStats
} from "./types";

function percent(value: number | null | undefined) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
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

export function MsaInspectorContent({
  alignmentPosition,
  base,
  columnStats,
  columnSummary,
  range,
  rangeError,
  rangeStats,
  reference,
  referencePosition,
  selection,
  selectionLabel,
  showReferenceContext = true,
  analysisScope = "all",
  scopeRowCount
}: {
  alignmentPosition: number | null;
  base: string;
  columnStats: ColumnStats | null;
  columnSummary: string;
  range: ColumnRange | null;
  rangeError?: string | null;
  rangeStats: RangeStats | null;
  reference: MSASequence | null;
  referencePosition: string | number | null;
  selection: CellSelection | null;
  selectionLabel?: string;
  showReferenceContext?: boolean;
  analysisScope?: AnalysisScope;
  scopeRowCount?: number;
}) {
  const { dictionary: d } = useLanguage();
  const t = d.results.viewer.stageTwo;
  const science = d.results.viewer.scienceV2;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-teal-50 px-2.5 py-1 font-semibold text-teal-800">
          {showReferenceContext
            ? scopeRowCount === undefined
              ? `${t.analysisScope}: ${t.analysisScopes[analysisScope]}`
              : science.scopeRows
                  .replace("{scope}", t.analysisScopes[analysisScope])
                  .replace("{count}", scopeRowCount.toLocaleString())
            : science.neutralTitle}
        </span>
      </div>
      {showReferenceContext ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Dna className="h-3.5 w-3.5 text-teal-700" />
            {t.reference}
          </p>
          <p className="mt-2 truncate font-mono text-sm text-slate-900">
            {reference?.id ?? t.noReference}
          </p>
        </section>
      ) : null}

      {selection && alignmentPosition ? (
        <>
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MousePointer2 className="h-4 w-4 text-teal-700" />
              {d.results.viewer.selectedCell}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Stat
                label={d.results.viewer.selectedSequence}
                value={selectionLabel ?? selection.sequenceId ?? selection.rowKey}
              />
              <Stat label={t.alignmentPosition} value={alignmentPosition} />
              {showReferenceContext ? (
                <Stat label={t.referencePosition} value={referencePosition ?? "—"} />
              ) : null}
              <Stat label={d.results.viewer.selectedBase} value={base || d.results.viewer.emptyCell} />
            </div>
          </section>

          {showReferenceContext && columnStats ? (
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BarChart3 className="h-4 w-4 text-teal-700" />
                {d.results.viewer.columnSummary}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Stat
                  label={d.results.viewer.columnConservation}
                  value={columnStats.hasInformativeBases === false ? "—" : percent(columnStats.conservation)}
                />
                <Stat label={d.results.viewer.columnGap} value={percent(columnStats.gapFraction)} />
                <Stat label={t.tracks.coverage} value={percent(columnStats.coverage)} />
                <Stat
                  label={t.tracks.entropy}
                  value={columnStats.hasInformativeBases === false ? "—" : `${(columnStats.entropyBits ?? columnStats.normalizedEntropy ?? columnStats.entropy ?? 0).toFixed(3)} bits`}
                />
                <Stat label={science.metrics.informativeCoverage} value={percent(columnStats.informativeCoverage)} />
                <Stat label={science.metrics.ambiguityFraction} value={percent(columnStats.ambiguityFraction)} />
                <Stat label={t.stats.gcContent} value={percent(columnStats.gcFraction)} />
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

      {showReferenceContext && range && rangeStats ? (
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
            {showReferenceContext && reference ? (
              <>
                <Stat label={t.stats.mismatches} value={rangeStats.substitutionCount ?? rangeStats.mismatchCount} />
                <Stat label={t.stats.insertions} value={rangeStats.insertionCount} />
                <Stat label={t.stats.deletions} value={rangeStats.deletionCount} />
                <Stat label={t.differences.compatibleAmbiguity} value={rangeStats.compatibleAmbiguityCount ?? 0} />
                <Stat label={science.metrics.unclassifiedSubstitutions} value={rangeStats.unclassifiedSubstitutionCount ?? 0} />
                <Stat label={science.metrics.unknownComparisons} value={rangeStats.unknownComparisonCount ?? 0} />
                <Stat
                  label={science.metrics.validComparisons}
                  value={
                    (rangeStats.comparableCanonicalCount ?? 0) +
                    (rangeStats.compatibleAmbiguityCount ?? 0) +
                    (rangeStats.unclassifiedSubstitutionCount ?? 0) +
                    rangeStats.insertionCount +
                    rangeStats.deletionCount
                  }
                />
                <Stat
                  label={science.metrics.differenceRate}
                  value={(() => {
                    const denominator =
                      (rangeStats.comparableCanonicalCount ?? 0) +
                      (rangeStats.compatibleAmbiguityCount ?? 0) +
                      (rangeStats.unclassifiedSubstitutionCount ?? 0) +
                      rangeStats.insertionCount +
                      rangeStats.deletionCount;
                    const differences =
                      (rangeStats.substitutionCount ?? rangeStats.mismatchCount) +
                      rangeStats.insertionCount +
                      rangeStats.deletionCount;
                    return denominator ? percent(differences / denominator) : "—";
                  })()}
                />
                <Stat label={t.stats.transitions} value={rangeStats.transitionCount} />
                <Stat label={t.stats.transversions} value={rangeStats.transversionCount} />
              </>
            ) : null}
          </div>
        </section>
      ) : null}
      {showReferenceContext && range && !rangeStats && rangeError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {rangeError}
        </p>
      ) : null}
    </div>
  );
}

export function MsaInspector({
  docked = false,
  mobileOpen,
  onClose,
  ...contentProps
}: Parameters<typeof MsaInspectorContent>[0] & {
  docked?: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { dictionary: d } = useLanguage();
  const title = d.results.viewer.stageTwo.inspector;
  const content = <MsaInspectorContent {...contentProps} />;

  if (docked) {
    return (
      <div className="p-4">
        <h2 className="mb-4 text-base font-semibold text-slate-950">{title}</h2>
        {content}
      </div>
    );
  }

  return (
    <>
      <aside className="hidden xl:block" aria-label={title}>
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-auto rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-950">{title}</h2>
          {content}
        </div>
      </aside>

      <OverlayDialog
        closeLabel={d.results.viewer.stageTwo.closeInspector}
        isOpen={mobileOpen}
        onClose={onClose}
        title={title}
        variant="bottom-sheet"
      >
        {content}
      </OverlayDialog>
    </>
  );
}
