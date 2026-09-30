import type { AnalysisScope, RowQcStats } from "./types";
import { useLanguage } from "../../lib/i18n/useLanguage";
import {
  filterAndSortRowQc,
  isRowQcCandidate,
  rowDifferenceCount,
  rowQcGapFraction,
  rowQcIdentity,
  rowQcUngappedLength,
  summarizeRowQc,
  type RowQcFilters,
  type RowQcSortKey
} from "./qcModel";
import type { QcThresholds } from "./workspaceSnapshot";

const MAX_RENDERED_ROWS = 200;

export type MsaQcPanelLabels = {
  title: string;
  reviewOnly: string;
  scope: string;
  rows: string;
  columns: string;
  candidates: string;
  search: string;
  sort: string;
  ascending: string;
  descending: string;
  name: string;
  length: string;
  gap: string;
  ambiguity: string;
  gc: string;
  identity: string;
  comparisonTarget: string;
  explicitReference: string;
  scopeConsensus: string;
  differences: string;
  review: string;
  direction: string;
  originalOrder: string;
  combinedFilters: string;
  candidateRules: string;
  columnRules: string;
  minimumLength: string;
  maximumLength: string;
  maximumGap: string;
  maximumAmbiguity: string;
  minimumGc: string;
  maximumGc: string;
  minimumIdentity: string;
  maximumDifferences: string;
  minimumConservation: string;
  minimumCoverage: string;
  maximumEntropy: string;
  maximumColumnAmbiguity: string;
  status: string;
  showingRows: string;
  distributions: string;
  distributionSummary: string;
};

export type MsaQcPanelProps = {
  analysisScope: AnalysisScope;
  scopeRowCount: number;
  totalRowCount: number;
  totalColumnCount: number;
  filteredColumnCount: number;
  rows: RowQcStats[];
  filters: RowQcFilters;
  sortKey: RowQcSortKey;
  sortDirection: "asc" | "desc";
  thresholds: QcThresholds;
  labels?: Partial<MsaQcPanelLabels>;
  onFiltersChange: (filters: RowQcFilters) => void;
  onSortChange: (key: RowQcSortKey, direction: "asc" | "desc") => void;
  onThresholdsChange?: (thresholds: QcThresholds) => void;
  onColumnThresholdsChange?: (thresholds: QcThresholds["column"]) => void;
  onReviewRow?: (rowKey: string) => void;
};

function fraction(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;
}

function inputNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function MiniDistribution({
  metric,
  values,
  format,
  summaryTemplate
}: {
  metric: string;
  values: number[];
  format: (value: number) => string;
  summaryTemplate: string;
}) {
  if (!values.length) return null;

  let minimum = values[0];
  let maximum = values[0];
  for (let index = 1; index < values.length; index += 1) {
    minimum = Math.min(minimum, values[index]);
    maximum = Math.max(maximum, values[index]);
  }
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const median = ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
  const bins = Array.from({ length: 12 }, () => 0);
  for (const value of values) {
    const binIndex = maximum === minimum
      ? 0
      : Math.min(bins.length - 1, Math.floor(((value - minimum) / (maximum - minimum)) * bins.length));
    bins[binIndex] += 1;
  }
  let largestBin = 1;
  for (const count of bins) largestBin = Math.max(largestBin, count);
  const summary = summaryTemplate
    .replace("{metric}", metric)
    .replace("{count}", String(values.length))
    .replace("{min}", format(minimum))
    .replace("{median}", format(median))
    .replace("{max}", format(maximum));

  return (
    <figure className="rounded-lg border border-slate-200 bg-slate-50 p-2">
      <figcaption className="truncate text-[11px] font-medium text-slate-600">{metric}</figcaption>
      <div
        aria-label={summary}
        className="mt-2 flex h-12 items-end gap-0.5"
        role="img"
      >
        {bins.map((count, index) => (
          <span
            aria-hidden="true"
            className="min-h-px flex-1 rounded-t bg-teal-500"
            key={index}
            style={{ height: `${Math.max(2, (count / largestBin) * 100)}%`, opacity: count ? 1 : 0.15 }}
          />
        ))}
      </div>
    </figure>
  );
}

function NumericFilter({
  label,
  value,
  min,
  max,
  step = "any",
  onChange
}: {
  label: string;
  value: number | null;
  min?: number;
  max?: number;
  step?: number | "any";
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      {label}
      <input
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
        max={max}
        min={min}
        onChange={(event) => onChange(inputNumber(event.target.value))}
        step={step}
        type="number"
        value={value ?? ""}
      />
    </label>
  );
}

export function MsaQcPanel({
  analysisScope,
  scopeRowCount,
  totalRowCount,
  totalColumnCount,
  filteredColumnCount,
  rows,
  filters,
  sortKey,
  sortDirection,
  thresholds,
  labels,
  onFiltersChange,
  onSortChange,
  onThresholdsChange,
  onColumnThresholdsChange,
  onReviewRow
}: MsaQcPanelProps) {
  const { dictionary: d } = useLanguage();
  const t = {
    ...d.results.viewer.stageTwo.qcPanel,
    ...labels
  } satisfies MsaQcPanelLabels;
  const filteredRows = filterAndSortRowQc(rows, {
    filters,
    sortKey,
    direction: sortDirection
  });
  const candidates = rows.filter((row) => isRowQcCandidate(row, thresholds));
  const comparisonTarget = rows.find((row) => row.comparisonTarget)?.comparisonTarget ?? null;
  const summary = summarizeRowQc(filteredRows);
  const patchFilter = <K extends keyof RowQcFilters>(key: K, value: RowQcFilters[K]) =>
    onFiltersChange({ ...filters, [key]: value });
  const patchRowThreshold = <K extends keyof QcThresholds["row"]>(
    key: K,
    value: QcThresholds["row"][K]
  ) => onThresholdsChange?.({
    ...thresholds,
    row: { ...thresholds.row, [key]: value }
  });
  const patchColumnThreshold = <K extends keyof QcThresholds["column"]>(
    key: K,
    value: QcThresholds["column"][K]
  ) => onColumnThresholdsChange?.({ ...thresholds.column, [key]: value });

  return (
    <aside
      aria-label={t.title}
      className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      data-msa-qc-panel="true"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-950">{t.title}</h2>
        <p className="mt-1 text-xs leading-5 text-amber-800">{t.reviewOnly}</p>
        {comparisonTarget ? (
          <p className="mt-1 text-xs text-slate-600">
            {t.comparisonTarget}: <b>{comparisonTarget === "reference" ? t.explicitReference : t.scopeConsensus}</b>
          </p>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-2">
          <dt className="text-slate-500">{t.scope}</dt>
          <dd className="mt-1 font-semibold text-slate-900">{analysisScope} · {scopeRowCount}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <dt className="text-slate-500">{t.rows}</dt>
          <dd className="mt-1 font-semibold text-slate-900">{filteredRows.length} / {totalRowCount}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <dt className="text-slate-500">{t.columns}</dt>
          <dd className="mt-1 font-semibold text-slate-900">{filteredColumnCount} / {totalColumnCount}</dd>
        </div>
        <div className="rounded-lg bg-amber-50 p-2">
          <dt className="text-amber-700">{t.candidates}</dt>
          <dd className="mt-1 font-semibold text-amber-950">{candidates.length}</dd>
        </div>
      </dl>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <span>{t.length}: <b>{summary.medianUngappedLength ?? "—"}</b></span>
        <span>{t.gap}: <b>{fraction(summary.medianGapFraction)}</b></span>
        <span>{t.ambiguity}: <b>{fraction(summary.medianAmbiguityFraction)}</b></span>
        <span>{t.gc}: <b>{fraction(summary.medianGcFraction)}</b></span>
        <span>{t.identity}: <b>{fraction(summary.medianIdentity)}</b></span>
      </div>

      <section aria-label={t.distributions}>
        <h3 className="sr-only">{t.distributions}</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          <MiniDistribution
            format={(value) => Math.round(value).toLocaleString()}
            metric={t.length}
            summaryTemplate={t.distributionSummary}
            values={filteredRows.map(rowQcUngappedLength)}
          />
          <MiniDistribution
            format={(value) => fraction(value)}
            metric={t.gap}
            summaryTemplate={t.distributionSummary}
            values={filteredRows.map(rowQcGapFraction)}
          />
          <MiniDistribution
            format={(value) => fraction(value)}
            metric={t.ambiguity}
            summaryTemplate={t.distributionSummary}
            values={filteredRows.map((row) => row.ambiguityFraction)}
          />
          <MiniDistribution
            format={(value) => fraction(value)}
            metric={t.gc}
            summaryTemplate={t.distributionSummary}
            values={filteredRows.flatMap((row) => row.gcFraction === null || row.gcFraction === undefined ? [] : [row.gcFraction])}
          />
          <MiniDistribution
            format={(value) => fraction(value)}
            metric={t.identity}
            summaryTemplate={t.distributionSummary}
            values={filteredRows.flatMap((row) => {
              const identity = rowQcIdentity(row);
              return identity === null || identity === undefined ? [] : [identity];
            })}
          />
        </div>
      </section>

      <div className="grid gap-2 md:grid-cols-[minmax(12rem,1fr)_12rem_9rem]">
        <label className="grid gap-1 text-xs font-medium text-slate-600">
          {t.search}
          <input
            className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
            onChange={(event) => patchFilter("name", event.target.value)}
            type="search"
            value={filters.name}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">
          {t.sort}
          <select
            className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
            onChange={(event) => onSortChange(event.target.value as RowQcSortKey, sortDirection)}
            value={sortKey}
          >
            <option value="original">{t.originalOrder}</option>
            <option value="name">{t.name}</option>
            <option value="length">{t.length}</option>
            <option value="gap">{t.gap}</option>
            <option value="ambiguity">{t.ambiguity}</option>
            <option value="gc">{t.gc}</option>
            <option value="identity">{t.identity}</option>
            <option value="differences">{t.differences}</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">
          {t.direction}
          <select
            className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
            onChange={(event) => onSortChange(sortKey, event.target.value as "asc" | "desc")}
            value={sortDirection}
          >
            <option value="asc">{t.ascending}</option>
            <option value="desc">{t.descending}</option>
          </select>
        </label>
      </div>

      <details className="rounded-lg border border-slate-200 p-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-800">{t.combinedFilters}</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <NumericFilter label={t.minimumLength} value={filters.minUngappedLength} min={0} onChange={(value) => patchFilter("minUngappedLength", value)} />
          <NumericFilter label={t.maximumLength} value={filters.maxUngappedLength} min={0} onChange={(value) => patchFilter("maxUngappedLength", value)} />
          <NumericFilter label={t.maximumGap} value={filters.maxGapFraction} min={0} max={1} step={0.01} onChange={(value) => patchFilter("maxGapFraction", value)} />
          <NumericFilter label={t.maximumAmbiguity} value={filters.maxAmbiguityFraction} min={0} max={1} step={0.01} onChange={(value) => patchFilter("maxAmbiguityFraction", value)} />
          <NumericFilter label={t.minimumGc} value={filters.minGcFraction} min={0} max={1} step={0.01} onChange={(value) => patchFilter("minGcFraction", value)} />
          <NumericFilter label={t.maximumGc} value={filters.maxGcFraction} min={0} max={1} step={0.01} onChange={(value) => patchFilter("maxGcFraction", value)} />
          <NumericFilter label={t.minimumIdentity} value={filters.minReferenceIdentity} min={0} max={1} step={0.01} onChange={(value) => patchFilter("minReferenceIdentity", value)} />
          <NumericFilter label={t.maximumDifferences} value={filters.maxDifferenceCount} min={0} onChange={(value) => patchFilter("maxDifferenceCount", value)} />
        </div>
      </details>

      {onThresholdsChange ? (
        <details className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-amber-950">{t.candidateRules}</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <NumericFilter label={t.minimumLength} value={thresholds.row.minUngappedLength} min={0} onChange={(value) => patchRowThreshold("minUngappedLength", value)} />
            <NumericFilter label={t.maximumGap} value={thresholds.row.maxGapFraction} min={0} max={1} step={0.01} onChange={(value) => patchRowThreshold("maxGapFraction", value)} />
            <NumericFilter label={t.maximumAmbiguity} value={thresholds.row.maxAmbiguityFraction} min={0} max={1} step={0.01} onChange={(value) => patchRowThreshold("maxAmbiguityFraction", value)} />
            <NumericFilter label={t.minimumGc} value={thresholds.row.minGcFraction} min={0} max={1} step={0.01} onChange={(value) => patchRowThreshold("minGcFraction", value)} />
            <NumericFilter label={t.maximumGc} value={thresholds.row.maxGcFraction} min={0} max={1} step={0.01} onChange={(value) => patchRowThreshold("maxGcFraction", value)} />
            <NumericFilter label={t.minimumIdentity} value={thresholds.row.minReferenceIdentity} min={0} max={1} step={0.01} onChange={(value) => patchRowThreshold("minReferenceIdentity", value)} />
          </div>
        </details>
      ) : null}

      {onColumnThresholdsChange ? (
        <details className="rounded-lg border border-teal-200 bg-teal-50/40 p-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-teal-950">{t.columnRules}</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <NumericFilter label={t.minimumConservation} value={thresholds.column.minConservation} min={0} max={1} step={0.01} onChange={(value) => patchColumnThreshold("minConservation", value)} />
            <NumericFilter label={t.maximumGap} value={thresholds.column.maxGapFraction} min={0} max={1} step={0.01} onChange={(value) => patchColumnThreshold("maxGapFraction", value)} />
            <NumericFilter label={t.minimumCoverage} value={thresholds.column.minCoverage} min={0} max={1} step={0.01} onChange={(value) => patchColumnThreshold("minCoverage", value)} />
            <NumericFilter label={t.maximumEntropy} value={thresholds.column.maxEntropy} min={0} max={1} step={0.01} onChange={(value) => patchColumnThreshold("maxEntropy", value)} />
            <NumericFilter label={t.maximumColumnAmbiguity} value={thresholds.column.maxAmbiguityFraction} min={0} max={1} step={0.01} onChange={(value) => patchColumnThreshold("maxAmbiguityFraction", value)} />
          </div>
        </details>
      ) : null}

      <div aria-label={t.rows} className="max-h-80 overflow-auto rounded-lg border border-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-teal-500" role="region" tabIndex={0}>
        <table className="w-full min-w-[48rem] border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-slate-100 text-slate-600">
            <tr>
              <th className="p-2">{t.name}</th>
              <th className="p-2">{t.length}</th>
              <th className="p-2">{t.gap}</th>
              <th className="p-2">{t.ambiguity}</th>
              <th className="p-2">{t.gc}</th>
              <th className="p-2">{t.identity}</th>
              <th className="p-2">{t.differences}</th>
              <th className="p-2">{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.slice(0, MAX_RENDERED_ROWS).map((row) => {
              const candidate = isRowQcCandidate(row, thresholds);
              return (
                <tr className="border-t border-slate-100" key={row.rowKey}>
                  <td className="max-w-64 truncate p-2 font-medium" title={row.sequenceId}>{row.sequenceId}</td>
                  <td className="p-2 tabular-nums">{rowQcUngappedLength(row)}</td>
                  <td className="p-2 tabular-nums">{fraction(rowQcGapFraction(row))}</td>
                  <td className="p-2 tabular-nums">{fraction(row.ambiguityFraction)}</td>
                  <td className="p-2 tabular-nums">{fraction(row.gcFraction)}</td>
                  <td className="p-2 tabular-nums">{fraction(rowQcIdentity(row))}</td>
                  <td className="p-2 tabular-nums">{rowDifferenceCount(row)}</td>
                  <td className="p-2">
                    {candidate ? (
                      <button
                        className="min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-3 font-semibold text-amber-900"
                        onClick={() => onReviewRow?.(row.rowKey)}
                        type="button"
                      >
                        {t.review}
                      </button>
                    ) : <span className="text-slate-500">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredRows.length > MAX_RENDERED_ROWS ? (
        <p className="text-xs text-slate-500">{t.showingRows
          .replace("{shown}", String(MAX_RENDERED_ROWS))
          .replace("{total}", String(filteredRows.length))}</p>
      ) : null}
    </aside>
  );
}
