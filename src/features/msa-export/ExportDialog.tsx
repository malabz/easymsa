import { Download, X } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { cn } from "../../lib/utils/cn";
import type {
  ExportFormat,
  ExportLayoutMode,
  ExportRegion,
  MsaExportLayout,
  MsaExportOptions
} from "./exportTypes";

type ExportDialogProps = {
  error: string | null;
  hasSelection: boolean;
  isExporting: boolean;
  isOpen: boolean;
  layout: MsaExportLayout | null;
  onClose: () => void;
  onExport: () => void;
  onUpdate: (patch: Partial<MsaExportOptions>) => void;
  options: MsaExportOptions;
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
      className={cn(
        "inline-flex h-9 items-center justify-center border border-slate-200 px-3 text-sm font-medium transition first:rounded-l-md last:rounded-r-md disabled:cursor-not-allowed disabled:opacity-40",
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
    <label className="flex items-start gap-2 text-sm text-slate-700">
      <input
        checked={checked}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
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

export function ExportDialog({
  error,
  hasSelection,
  isExporting,
  isOpen,
  layout,
  onClose,
  onExport,
  onUpdate,
  options
}: ExportDialogProps) {
  const { dictionary: d } = useLanguage();
  const t = d.results.viewer.imageExport;

  if (!isOpen) {
    return null;
  }

  const selectionDisabled = !hasSelection;
  const noExportableData = !layout || layout.rows.length === 0 || layout.columns.length === 0;
  const exportDisabled =
    isExporting ||
    noExportableData ||
    layout?.exceedsCanvasLimit ||
    (options.region === "selection" && selectionDisabled);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{t.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{t.description}</p>
          </div>
          <button
            aria-label={t.cancel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-8rem)] overflow-y-auto px-5 py-4">
          <div className="grid gap-5 md:grid-cols-[1fr_16rem]">
            <div className="space-y-5">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  {t.format}
                </h3>
                <div className="inline-flex">
                  {(["svg", "png"] as ExportFormat[]).map((format) => (
                    <SegmentedButton
                      active={options.format === format}
                      key={format}
                      label={format === "svg" ? t.svg : t.png}
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
                  {(["visible", "full", "selection"] as ExportRegion[]).map((region) => (
                    <SegmentedButton
                      active={options.region === region}
                      disabled={region === "selection" && selectionDisabled}
                      key={region}
                      label={t.regions[region]}
                      onClick={(value) => onUpdate({ region: value })}
                      value={region}
                    />
                  ))}
                </div>
                {selectionDisabled ? (
                  <p className="text-xs text-slate-500">{t.noSelectionHint}</p>
                ) : null}
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  {t.layoutMode}
                </h3>
                <div className="flex flex-wrap gap-3">
                  <div className="inline-flex">
                    {(["single-line", "wrapped"] as ExportLayoutMode[]).map((mode) => (
                      <SegmentedButton
                        active={options.layoutMode === mode}
                        key={mode}
                        label={mode === "single-line" ? t.layoutModes.singleLine : t.layoutModes.wrapped}
                        onClick={(value) => onUpdate({ layoutMode: value })}
                        value={mode}
                      />
                    ))}
                  </div>
                  {options.layoutMode === "wrapped" ? (
                    <label className="inline-flex h-9 items-center gap-2 text-sm text-slate-700">
                      {t.wrapColumns}
                      <input
                        className="h-9 w-24 rounded-md border border-slate-300 px-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
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

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  {t.include}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
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
                  <CheckboxRow
                    checked={false}
                    disabled
                    hint={t.annotationsUnavailable}
                    label={t.annotations}
                    onChange={() => undefined}
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
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    onChange={(event) => onUpdate({ filename: event.target.value })}
                    value={options.filename}
                  />
                </label>

                {options.format === "png" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-700">
                      {t.scale}
                      <input
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
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

                {!options.transparentBackground ? (
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    {t.background}
                    <input
                      className="h-9 w-14 rounded border border-slate-300 bg-white p-1"
                      onChange={(event) => onUpdate({ backgroundColor: event.target.value })}
                      type="color"
                      value={options.backgroundColor}
                    />
                  </label>
                ) : null}
              </section>
            </div>

            <aside className="space-y-3 border-t border-slate-200 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                {t.estimate}
              </h3>
              {layout ? (
                <div className="space-y-2 text-sm text-slate-700">
                  <p>
                    {t.sizeEstimate
                      .replace("{rows}", layout.rows.length.toLocaleString())
                      .replace("{columns}", layout.columns.length.toLocaleString())
                      .replace("{width}", layout.width.toLocaleString())
                      .replace("{height}", layout.height.toLocaleString())}
                  </p>
                  <p>
                    {t.blockEstimate
                      .replace("{count}", layout.blocks.length.toLocaleString())}
                  </p>
                  {options.format === "png" ? (
                    <p>
                      {t.pngEstimate
                        .replace("{width}", layout.canvasWidth.toLocaleString())
                        .replace("{height}", layout.canvasHeight.toLocaleString())
                        .replace("{mp}", layout.canvasMegapixels.toFixed(1))}
                    </p>
                  ) : null}
                  {layout.exceedsCanvasLimit ? (
                    <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                      {t.errors.limitExceeded}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{t.errors.noData}</p>
              )}
              {error ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {error}
                </p>
              ) : null}
            </aside>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            {t.cancel}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
            disabled={exportDisabled}
            onClick={onExport}
            type="button"
          >
            <Download className="h-4 w-4" />
            {isExporting ? t.exporting : t.export}
          </button>
        </div>
      </div>
    </div>
  );
}
