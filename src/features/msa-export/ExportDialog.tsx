import { Download } from "lucide-react";
import { OverlayDialog } from "../../components/common/OverlayDialog";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { cn } from "../../lib/utils/cn";
import { classifyDifference } from "../msa-viewer/analysis";
import { differenceColorStyle } from "../msa-viewer/differenceColors";
import { msaCellColorStyle } from "./exportColors";
import type {
  ExportFormat,
  ExportLayoutMode,
  CanonicalExportRegion,
  MsaExportLayout,
  ExportPreflightResult,
  SupportedMsaExportOptions
} from "./exportTypes";
import { normalizeExportRegion } from "./exportTypes";
import { exportPresetPatch } from "./useMsaExport";

type ExportDialogProps = {
  error: string | null;
  hasSelection: boolean;
  isExporting: boolean;
  isOpen: boolean;
  layout: MsaExportLayout | null;
  preflight?: ExportPreflightResult | null;
  onCancelExport?: () => void;
  onClose: () => void;
  onExport: () => void;
  onUpdate: (patch: Partial<SupportedMsaExportOptions>) => void;
  options: SupportedMsaExportOptions;
  progress?: number;
  scientificLayersEnabled?: boolean;
};

function SegmentedButton<T extends string>({
  active,
  disabled,
  label,
  onClick,
  value
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: (value: T) => void;
  value: T;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 items-center justify-center border border-slate-200 px-3 text-sm font-medium transition first:rounded-l-md last:rounded-r-md disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950"
      )}
      disabled={disabled}
      onClick={() => onClick(value)}
      type="button"
    >
      {label}
    </button>
  );
}

function CheckboxRow({
  checked,
  disabled,
  hint,
  label,
  onChange
}: {
  checked: boolean;
  disabled?: boolean;
  hint?: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
      <input
        checked={checked}
        className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        <span className="font-medium text-slate-800">{label}</span>
        {hint ? <span className="ml-1 text-slate-500">{hint}</span> : null}
      </span>
    </label>
  );
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function ExportThumbnail({ layout }: { layout: MsaExportLayout | null }) {
  if (!layout || !layout.rows.length || !layout.columns.length) {
    return (
      <div className="absolute inset-2 flex gap-1 overflow-hidden rounded bg-slate-50 p-1">
        <div className="w-1/4 shrink-0 bg-slate-200" />
        <div className="flex-1 bg-slate-100" />
      </div>
    );
  }
  const rows = layout.rows.slice(0, 12);
  const columns = layout.columns.slice(0, 36);
  const labelWidth = 42;
  const cellWidth = 7;
  const cellHeight = 7;
  const width = labelWidth + columns.length * cellWidth;
  const height = 10 + rows.length * cellHeight;
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-2 rounded bg-white"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect fill="#f8fafc" height={height} width={labelWidth} x={0} y={0} />
      {columns.map((column, index) => (
        <rect
          fill={index % 10 === 0 ? "#cbd5e1" : "#f1f5f9"}
          height={2}
          key={`marker-${column.position}`}
          width={1}
          x={labelWidth + index * cellWidth + cellWidth / 2}
          y={3}
        />
      ))}
      {rows.map((row, rowIndex) => {
        const isReference = row.rowKey && layout.referenceSequence?.rowKey
          ? row.rowKey === layout.referenceSequence.rowKey
          : row === layout.referenceSequence;
        return (
          <g key={row.rowKey ?? `${row.id}-${rowIndex}`}>
            <rect
              fill={isReference ? "#fef3c7" : rowIndex % 2 ? "#ffffff" : "#f8fafc"}
              height={cellHeight}
              width={labelWidth}
              x={0}
              y={10 + rowIndex * cellHeight}
            />
            {columns.map((column, columnIndex) => {
              const base = row.sequence[column.position - 1] ?? "";
              const referenceBase = layout.referenceSequence?.sequence[column.position - 1] ?? "";
              const style = layout.differenceMode && layout.referenceSequence
                ? differenceColorStyle(classifyDifference(base, referenceBase))
                : msaCellColorStyle(base, layout.colorScheme, column.conservation);
              return (
                <rect
                  fill={style.background}
                  height={cellHeight - 0.5}
                  key={`${rowIndex}-${column.position}`}
                  stroke={style.border}
                  strokeWidth={0.35}
                  width={cellWidth - 0.5}
                  x={labelWidth + columnIndex * cellWidth}
                  y={10 + rowIndex * cellHeight}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function ExportDialog({
  error,
  hasSelection,
  isExporting,
  isOpen,
  layout,
  preflight = null,
  onCancelExport,
  onClose,
  onExport,
  onUpdate,
  options,
  progress = 0,
  scientificLayersEnabled = true
}: ExportDialogProps) {
  const { dictionary: d } = useLanguage();
  const t = d.results.viewer.imageExport;

  const selectionDisabled = !hasSelection;
  const estimate = preflight ?? (layout ? {
    ...layout,
    rowCount: layout.rows.length,
    columnCount: layout.columns.length,
    blockCount: layout.blocks.length
  } : null);
  const noExportableData =
    !estimate || estimate.rowCount === 0 || estimate.columnCount === 0;
  const exportDisabled =
    isExporting ||
    noExportableData ||
    estimate?.exportLimitExceeded ||
    (normalizeExportRegion(options.region) === "selectedInterval" && selectionDisabled);

  const regionLabels: Record<CanonicalExportRegion, string> = {
    viewport: t.regions.viewport,
    selectedInterval: t.regions.selectedInterval,
    filteredView: t.regions.filteredView,
    fullAlignment: t.regions.fullAlignment
  };
  const limitMessage = (() => {
    if (!estimate?.exportLimitKind) {
      return null;
    }
    if (estimate.exportLimitKind === "png-dimension") {
      return t.errors.pngDimensionLimit
        .replace("{width}", estimate.canvasWidth.toLocaleString())
        .replace("{height}", estimate.canvasHeight.toLocaleString())
        .replace("{limit}", estimate.effectiveCanvasDimensionLimit.toLocaleString());
    }
    if (estimate.exportLimitKind === "png-pixels") {
      return t.errors.pngPixelLimit
        .replace("{actual}", estimate.canvasMegapixels.toFixed(1))
        .replace(
          "{limit}",
          (estimate.effectiveCanvasPixelLimit / 1_000_000).toFixed(0)
        );
    }
    if (estimate.exportLimitKind === "svg-cells") {
      return t.errors.svgCellLimit
        .replace("{actual}", estimate.renderedCellCount.toLocaleString())
        .replace("{limit}", estimate.effectiveSvgCellLimit.toLocaleString());
    }
    return t.errors.svgByteLimit
      .replace(
        "{actual}",
        (estimate.estimatedSvgBytes / (1024 * 1024)).toFixed(1)
      )
      .replace(
        "{limit}",
        (estimate.effectiveSvgEstimatedByteLimit / (1024 * 1024)).toFixed(0)
      );
  })();

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="min-w-32 flex-1">
        {isExporting ? (
          <div
            aria-label={t.progress.replace("{value}", Math.round(progress * 100).toString())}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(progress * 100)}
            className="h-2 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-teal-600 transition-[width]"
              style={{ width: `${Math.max(2, progress * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
          onClick={isExporting ? onCancelExport : onClose}
          type="button"
        >
          {isExporting ? t.cancelExport : t.cancel}
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
          disabled={exportDisabled}
          onClick={onExport}
          type="button"
        >
          <Download className="h-4 w-4" />
          {isExporting ? t.exporting : t.export}
        </button>
      </div>
    </div>
  );

  return (
    <OverlayDialog
      closeLabel={t.cancel}
      description={t.description}
      footer={footer}
      isOpen={isOpen}
      onClose={onClose}
      title={t.title}
    >
          <div className="grid gap-5 md:grid-cols-[1fr_16rem]">
            <div className="space-y-5">
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase text-slate-500">
                    {t.preset}
                  </h3>
                  {options.preset === "custom" ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                      {t.presets.custom}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    aria-pressed={options.preset === "paper-svg"}
                    className={cn(
                      "min-h-20 rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                      options.preset === "paper-svg"
                        ? "border-teal-500 bg-teal-50 text-teal-950"
                        : "border-slate-200 bg-white text-slate-800 hover:border-teal-300"
                    )}
                    onClick={() => onUpdate(exportPresetPatch("paper-svg"))}
                    type="button"
                  >
                    <span className="block text-sm font-semibold">{t.presets.paper}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{t.presets.paperHint}</span>
                  </button>
                  <button
                    aria-pressed={options.preset === "presentation-png"}
                    className={cn(
                      "min-h-20 rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                      options.preset === "presentation-png"
                        ? "border-teal-500 bg-teal-50 text-teal-950"
                        : "border-slate-200 bg-white text-slate-800 hover:border-teal-300"
                    )}
                    onClick={() => onUpdate(exportPresetPatch("presentation-png"))}
                    type="button"
                  >
                    <span className="block text-sm font-semibold">{t.presets.presentation}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{t.presets.presentationHint}</span>
                  </button>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  {t.format}
                </h3>
                <div className="inline-flex">
                  {(["svg", "png", "fasta"] as ExportFormat[]).map((format) => (
                    <SegmentedButton
                      active={options.format === format}
                      key={format}
                      label={format === "svg" ? t.svg : format === "png" ? t.png : "FASTA"}
                      onClick={(value) => onUpdate({ format: value })}
                      value={format}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  {t.region}
                </h3>
                <div className="flex flex-wrap">
                  {([
                    "viewport",
                    "selectedInterval",
                    "filteredView",
                    "fullAlignment"
                  ] as CanonicalExportRegion[]).map((region) => (
                    <SegmentedButton
                      active={normalizeExportRegion(options.region) === region}
                      disabled={region === "selectedInterval" && selectionDisabled}
                      key={region}
                      label={regionLabels[region]}
                      onClick={(value: CanonicalExportRegion) => onUpdate({ region: value })}
                      value={region}
                    />
                  ))}
                </div>
                {selectionDisabled ? (
                  <p className="text-xs text-slate-500">{t.noSelectionHint}</p>
                ) : null}
              </section>

              {options.format !== "fasta" ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-slate-500">
                    {t.layoutMode}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <div className="inline-flex">
                      <SegmentedButton
                        active={(options.wrapMode ?? (options.layoutMode === "wrapped" ? "fixed-wrap" : "single-line")) === "auto-wrap"}
                        label={t.wrapModes.auto}
                        onClick={() => onUpdate({ layoutMode: "wrapped", wrapMode: "auto-wrap" })}
                        value="auto-wrap"
                      />
                      <SegmentedButton
                        active={(options.wrapMode ?? (options.layoutMode === "wrapped" ? "fixed-wrap" : "single-line")) === "fixed-wrap"}
                        label={t.wrapModes.fixed}
                        onClick={() => onUpdate({ layoutMode: "wrapped", wrapMode: "fixed-wrap" })}
                        value="fixed-wrap"
                      />
                      <SegmentedButton
                        active={(options.wrapMode ?? (options.layoutMode === "wrapped" ? "fixed-wrap" : "single-line")) === "single-line"}
                        label={t.wrapModes.single}
                        onClick={() => onUpdate({ layoutMode: "single-line", wrapMode: "single-line" })}
                        value="single-line"
                      />
                    </div>
                    {(options.wrapMode ?? (options.layoutMode === "wrapped" ? "fixed-wrap" : "single-line")) === "fixed-wrap" ? (
                      <label className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-700">
                        {t.wrapColumns}
                        <input
                          className="min-h-11 w-24 rounded-md border border-slate-300 px-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                          min={10}
                          max={1000}
                          onChange={(event) =>
                            onUpdate({
                              wrapColumnCount: clampNumber(Number(event.target.value), 10, 1000)
                            })
                          }
                          type="number"
                          value={options.wrapColumnCount}
                        />
                      </label>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  {t.include}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {options.format !== "fasta" ? (
                    <>
                      <CheckboxRow
                        checked={options.includeSequenceNames}
                        label={t.sequenceNames}
                        onChange={(checked) => onUpdate({ includeSequenceNames: checked })}
                      />
                      <CheckboxRow
                        checked={options.includeCoordinates}
                        label={t.coordinates}
                        onChange={(checked) => onUpdate({ includeCoordinates: checked })}
                      />
                      {scientificLayersEnabled ? (
                        <>
                          <CheckboxRow
                            checked={options.includeConservation}
                            label={t.conservation}
                            onChange={(checked) => onUpdate({ includeConservation: checked })}
                          />
                          <CheckboxRow
                            checked={options.includeConsensus}
                            label={t.consensus}
                            onChange={(checked) => onUpdate({ includeConsensus: checked })}
                          />
                          <CheckboxRow
                            checked={options.includeLegend}
                            label={t.legend}
                            onChange={(checked) => onUpdate({ includeLegend: checked })}
                          />
                        </>
                      ) : null}
                    </>
                  ) : null}
                  <CheckboxRow
                    checked={options.includeAnnotations}
                    label={t.annotations}
                    onChange={(checked) => onUpdate({ includeAnnotations: checked })}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  {t.output}
                </h3>
                <label className="block text-sm font-medium text-slate-700">
                  {t.filename}
                  <input
                    className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    onChange={(event) => onUpdate({ filename: event.target.value })}
                    value={options.filename}
                  />
                </label>

                {options.format === "png" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-700">
                      {t.scale}
                      <input
                        className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                        max={4}
                        min={0.5}
                        onChange={(event) =>
                          onUpdate({
                            scale: clampNumber(Number(event.target.value), 0.5, 4)
                          })
                        }
                        step={0.5}
                        type="number"
                        value={options.scale}
                      />
                    </label>
                    <CheckboxRow
                      checked={options.transparentBackground}
                      label={t.transparentBackground}
                      onChange={(checked) => onUpdate({ transparentBackground: checked })}
                    />
                  </div>
                ) : null}

                {options.format !== "fasta" && !options.transparentBackground ? (
                  <label className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700">
                    {t.background}
                    <input
                      className="h-11 w-14 rounded border border-slate-300 bg-white p-1"
                      onChange={(event) => onUpdate({ backgroundColor: event.target.value })}
                      type="color"
                      value={options.backgroundColor}
                    />
                  </label>
                ) : null}
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  {t.bundle.title}
                </h3>
                <div className="inline-flex">
                  <SegmentedButton
                    active={(options.bundleMode ?? "qc-bundle") === "qc-bundle"}
                    label={t.bundle.qcBundle}
                    onClick={() => onUpdate({ bundleMode: "qc-bundle" })}
                    value="qc-bundle"
                  />
                  <SegmentedButton
                    active={options.bundleMode === "bare"}
                    label={t.bundle.bare}
                    onClick={() => onUpdate({ bundleMode: "bare" })}
                    value="bare"
                  />
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  {(options.bundleMode ?? "qc-bundle") === "qc-bundle"
                    ? t.bundle.qcHint
                    : t.bundle.bareWarning}
                </p>
              </section>
            </div>

            <aside className="space-y-3 border-t border-slate-200 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                {t.estimate}
              </h3>
              {estimate ? (
                <div className="space-y-2 text-sm text-slate-700">
                  <div
                    aria-label={t.preview}
                    className="relative aspect-[4/3] overflow-hidden rounded-md border border-slate-200 bg-white"
                  >
                    <ExportThumbnail layout={layout} />
                    <span className="absolute bottom-2 right-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-600 shadow-sm">
                      {estimate.rowCount.toLocaleString()} × {estimate.columnCount.toLocaleString()}
                    </span>
                  </div>
                  <p>
                    {(options.format === "fasta" ? t.fastaEstimate : t.sizeEstimate)
                      .replace("{rows}", estimate.rowCount.toLocaleString())
                      .replace("{columns}", estimate.columnCount.toLocaleString())
                      .replace("{width}", estimate.width.toLocaleString())
                      .replace("{height}", estimate.height.toLocaleString())}
                  </p>
                  {options.format !== "fasta" ? (
                    <p>
                      {t.blockEstimate
                        .replace("{count}", estimate.blockCount.toLocaleString())}
                    </p>
                  ) : null}
                  {estimate.pageCount > 1 ? (
                    <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
                      {t.pageEstimate.replace("{count}", estimate.pageCount.toLocaleString())}
                    </p>
                  ) : null}
                  {options.format === "png" ? (
                    <>
                      <p>
                        {t.pngEstimate
                          .replace("{width}", estimate.canvasWidth.toLocaleString())
                          .replace("{height}", estimate.canvasHeight.toLocaleString())
                          .replace("{mp}", estimate.canvasMegapixels.toFixed(1))}
                      </p>
                      {estimate.scaleAdjusted ? (
                        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
                          {t.scaleAdjusted
                            .replace("{requested}", estimate.requestedScale.toFixed(1))
                            .replace("{resolved}", estimate.resolvedScale.toFixed(1))}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {estimate.exportLimitExceeded ? (
                    <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                      {limitMessage ?? t.errors.limitExceeded}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500" role="status">{t.errors.noData}</p>
              )}
              {error ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                  {error}
                </p>
              ) : null}
            </aside>
          </div>
    </OverlayDialog>
  );
}
