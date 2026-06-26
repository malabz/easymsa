import { useMemo, useState } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { MSAResult } from "../../lib/types/msa";
import { calculateExportLayout } from "./exportLayout";
import { renderMsaExportToPngBlob } from "./exportCanvasRenderer";
import { renderMsaExportToSvg } from "./exportSvgRenderer";
import { downloadBlob, withFileExtension } from "./downloadBlob";
import type {
  MsaExportLabels,
  MsaExportOptions,
  MsaExportViewerState
} from "./exportTypes";

const DEFAULT_CANVAS_PIXEL_LIMIT = 80_000_000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function timestamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");
}

export function createDefaultExportOptions(): MsaExportOptions {
  return {
    format: "svg",
    region: "visible",
    layoutMode: "single-line",
    includeSequenceNames: true,
    includeCoordinates: true,
    includeConsensus: true,
    includeConservation: true,
    includeLegend: false,
    includeAnnotations: false,
    scale: 2,
    backgroundColor: "#ffffff",
    transparentBackground: false,
    filename: `msa-export-${timestamp()}`,
    wrapColumnCount: 120,
    maxCanvasPixels: DEFAULT_CANVAS_PIXEL_LIMIT
  };
}

export function useMsaExport(
  alignment: MSAResult,
  getViewerState: () => MsaExportViewerState
) {
  const { dictionary: d } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<MsaExportViewerState | null>(null);
  const [options, setOptions] = useState<MsaExportOptions>(() =>
    createDefaultExportOptions()
  );
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = useMemo<MsaExportLabels>(
    () => ({
      position: d.results.viewer.position,
      conservation: d.results.viewer.conservation,
      consensus: d.results.viewer.consensus,
      legend: d.results.viewer.legend,
      dominant: d.results.viewer.legendLabels.dominant,
      variant: d.results.viewer.legendLabels.variant,
      gapEmpty: d.results.viewer.legendLabels.gapEmpty
    }),
    [d]
  );

  const layout = useMemo(() => {
    if (!snapshot) {
      return null;
    }
    return calculateExportLayout(alignment, snapshot, options);
  }, [alignment, options, snapshot]);

  function openDialog() {
    setSnapshot(getViewerState());
    setOptions((current) => ({
      ...current,
      filename: `msa-export-${timestamp()}`
    }));
    setError(null);
    setIsOpen(true);
  }

  function closeDialog() {
    if (isExporting) {
      return;
    }
    setIsOpen(false);
    setError(null);
  }

  function updateOptions(patch: Partial<MsaExportOptions>) {
    setOptions((current) => ({
      ...current,
      ...patch
    }));
    setError(null);
  }

  async function runExport() {
    if (!snapshot || !layout) {
      setError(d.results.viewer.imageExport.errors.noData);
      return;
    }
    if (options.region === "selection" && !snapshot.selectedRange) {
      setError(d.results.viewer.imageExport.errors.selectionRequired);
      return;
    }
    if (layout.rows.length === 0 || layout.columns.length === 0) {
      setError(d.results.viewer.imageExport.errors.noData);
      return;
    }
    if (layout.exceedsCanvasLimit) {
      setError(d.results.viewer.imageExport.errors.limitExceeded);
      return;
    }

    setIsExporting(true);
    setError(null);
    try {
      const extension = options.format === "svg" ? "svg" : "png";
      const filename = withFileExtension(options.filename, extension);
      if (options.format === "svg") {
        const svg = renderMsaExportToSvg(layout, labels);
        downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), filename);
      } else {
        const blob = await renderMsaExportToPngBlob(layout, labels);
        downloadBlob(blob, filename);
      }
      setIsOpen(false);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : d.results.viewer.imageExport.errors.failed
      );
    } finally {
      setIsExporting(false);
    }
  }

  return {
    closeDialog,
    error,
    hasSelection: Boolean(snapshot?.selectedRange),
    isExporting,
    isOpen,
    layout,
    openDialog,
    options,
    runExport,
    updateOptions
  };
}
