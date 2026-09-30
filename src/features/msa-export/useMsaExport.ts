import { useMemo, useRef, useState } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { MSAResult } from "../../lib/types/msa";
import {
  calculateExportLayout,
  calculateExportPreflight,
  paginateMsaExportLayout,
  MAX_SAFE_CANVAS_DIMENSION,
  MAX_SAFE_CANVAS_PIXELS,
  MAX_SAFE_SVG_CELLS,
  MAX_SAFE_SVG_ESTIMATED_BYTES
} from "./exportLayout";
import { downloadBlob, withFileExtension } from "./downloadBlob";
import { buildMsaExportManifestV1 } from "./exportManifest";
import { createMsaQcBundleZip } from "./qcBundle";
import { normalizeExportRegion } from "./exportTypes";
import type {
  MsaExportLabels,
  MsaExportOptions,
  MsaExportViewerState,
  SupportedExportRegion,
  SupportedMsaExportOptions
} from "./exportTypes";
import {
  markMsaPerformance,
  MSA_PERFORMANCE_MARKS
} from "../msa-viewer/performanceMarks";

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

function numberedPageFilename(filename: string, page: number, pageCount: number) {
  if (pageCount <= 1) return filename;
  const extensionIndex = filename.lastIndexOf(".");
  const stem = extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;
  const extension = extensionIndex > 0 ? filename.slice(extensionIndex) : "";
  return `${stem}-page-${String(page).padStart(2, "0")}${extension}`;
}

export function createDefaultExportOptions(): SupportedMsaExportOptions {
  return {
    format: "svg",
    region: "viewport",
    layoutMode: "wrapped",
    includeSequenceNames: true,
    includeCoordinates: true,
    includeConsensus: true,
    includeConservation: true,
    includeLegend: true,
    includeAnnotations: true,
    scale: 2,
    backgroundColor: "#ffffff",
    transparentBackground: false,
    filename: `msa-export-${timestamp()}`,
    wrapColumnCount: 120,
    maxCanvasPixels: MAX_SAFE_CANVAS_PIXELS,
    maxCanvasDimension: MAX_SAFE_CANVAS_DIMENSION,
    maxSvgCells: MAX_SAFE_SVG_CELLS,
    maxSvgEstimatedBytes: MAX_SAFE_SVG_ESTIMATED_BYTES,
    bundleMode: "qc-bundle",
    preset: "paper-svg",
    wrapMode: "auto-wrap",
    renderTheme: "publication-light",
    targetContentWidth: 1_600
  };
}

export function exportPresetPatch(
  preset: "paper-svg" | "presentation-png"
): Partial<SupportedMsaExportOptions> {
  if (preset === "presentation-png") {
    return {
      preset,
      format: "png",
      layoutMode: "wrapped",
      wrapMode: "auto-wrap",
      targetContentWidth: 1_920,
      scale: 3,
      transparentBackground: false,
      backgroundColor: "#ffffff",
      includeSequenceNames: true,
      includeCoordinates: true,
      includeConsensus: true,
      includeConservation: true,
      includeLegend: true,
      includeAnnotations: true,
      renderTheme: "publication-light",
      bundleMode: "qc-bundle"
    };
  }
  return {
    preset,
    format: "svg",
    layoutMode: "wrapped",
    wrapMode: "auto-wrap",
    targetContentWidth: 1_600,
    scale: 1,
    transparentBackground: false,
    backgroundColor: "#ffffff",
    includeSequenceNames: true,
    includeCoordinates: true,
    includeConsensus: true,
    includeConservation: true,
    includeLegend: true,
    includeAnnotations: true,
    renderTheme: "publication-light",
    bundleMode: "qc-bundle"
  };
}

export function useMsaExport(
  alignment: MSAResult,
  getViewerState: () => MsaExportViewerState,
  scientificLayersEnabled = true
) {
  const { dictionary: d } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<MsaExportViewerState | null>(null);
  const [options, setOptions] = useState<SupportedMsaExportOptions>(() =>
    createDefaultExportOptions()
  );
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const exportRunRef = useRef(0);

  const labels = useMemo<MsaExportLabels>(
    () => ({
      position: d.results.viewer.position,
      conservation: d.results.viewer.conservation,
      consensus: d.results.viewer.consensus,
      legend: d.results.viewer.legend,
      dominant: d.results.viewer.legendLabels.dominant,
      variant: d.results.viewer.legendLabels.variant,
      gapEmpty: d.results.viewer.legendLabels.gapEmpty,
      referencePosition: d.results.viewer.stageTwo.referencePosition,
      tracks: d.results.viewer.stageTwo.tracks,
      differences: d.results.viewer.stageTwo.differences
    }),
    [d]
  );

  const effectiveOptions = useMemo<SupportedMsaExportOptions>(
    () => scientificLayersEnabled
      ? options
      : {
          ...options,
          includeConsensus: false,
          includeConservation: false,
          includeLegend: false
        },
    [options, scientificLayersEnabled]
  );

  const layout = useMemo(() => {
    if (!snapshot) {
      return null;
    }
    const nextPreflight = calculateExportPreflight(
      alignment,
      snapshot,
      effectiveOptions
    );
    if (nextPreflight.exportLimitExceeded) {
      return null;
    }
    return calculateExportLayout(alignment, snapshot, effectiveOptions);
  }, [alignment, effectiveOptions, snapshot]);

  const preflight = useMemo(() => {
    if (!snapshot) return null;
    markMsaPerformance(MSA_PERFORMANCE_MARKS.exportPreflightStart);
    const result = calculateExportPreflight(alignment, snapshot, effectiveOptions);
    markMsaPerformance(MSA_PERFORMANCE_MARKS.exportPreflightDone);
    return result;
  }, [alignment, effectiveOptions, snapshot]);

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

  function updateOptions(
    patch: Partial<MsaExportOptions<SupportedExportRegion>>
  ) {
    setOptions((current) => ({
      ...current,
      ...patch,
      preset: patch.preset ?? "custom"
    }));
    setError(null);
  }

  async function runExport() {
    if (!snapshot || !preflight) {
      setError(d.results.viewer.imageExport.errors.noData);
      return;
    }
    if (
      normalizeExportRegion(effectiveOptions.region) === "selectedInterval" &&
      !snapshot.selectedRange
    ) {
      setError(d.results.viewer.imageExport.errors.selectionRequired);
      return;
    }
    if (preflight.rowCount === 0 || preflight.columnCount === 0) {
      setError(d.results.viewer.imageExport.errors.noData);
      return;
    }
    if (preflight.exportLimitExceeded) {
      setError(d.results.viewer.imageExport.errors.limitExceeded);
      return;
    }
    if (!layout) {
      setError(d.results.viewer.imageExport.errors.failed);
      return;
    }

    const runId = exportRunRef.current + 1;
    exportRunRef.current = runId;
    setIsExporting(true);
    setProgress(0.08);
    setError(null);
    try {
      markMsaPerformance(MSA_PERFORMANCE_MARKS.exportRenderStart);
      const extension = effectiveOptions.format === "svg"
        ? "svg"
        : effectiveOptions.format === "png"
          ? "png"
          : "fasta";
      const filename = withFileExtension(options.filename, extension);
      const generatedAt = new Date().toISOString();
      const pages = effectiveOptions.format === "png"
        ? paginateMsaExportLayout(layout, preflight)
        : [layout];
      const manifest = buildMsaExportManifestV1({
        alignment,
        state: snapshot,
        layout,
        generatedAt,
        outputFilename: filename,
        pages
      });
      const artifacts: Array<{ filename: string; data: Blob }> = [];
      if (effectiveOptions.format === "svg") {
        const { renderMsaExportToSvg } = await import("./exportSvgRenderer");
        if (runId !== exportRunRef.current) {
          return;
        }
        setProgress(0.35);
        const svg = renderMsaExportToSvg(layout, labels, manifest);
        artifacts.push({
          filename,
          data: new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
        });
      } else if (effectiveOptions.format === "png") {
        const { renderMsaExportToPngBlob } = await import("./exportCanvasRenderer");
        if (runId !== exportRunRef.current) {
          return;
        }
        setProgress(0.3);
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
          if (runId !== exportRunRef.current) return;
          artifacts.push({
            filename: numberedPageFilename(filename, pageIndex + 1, pages.length),
            data: await renderMsaExportToPngBlob(pages[pageIndex], labels)
          });
          setProgress(0.3 + ((pageIndex + 1) / pages.length) * 0.38);
        }
      } else {
        const { renderMsaExportToFasta } = await import("./exportFastaRenderer");
        setProgress(0.45);
        artifacts.push({
          filename,
          data: new Blob(
            [renderMsaExportToFasta(layout)],
            { type: "text/x-fasta;charset=utf-8" }
          )
        });
      }
      if (runId !== exportRunRef.current) {
        return;
      }
      setProgress(0.72);
      if (effectiveOptions.bundleMode === "bare") {
        downloadBlob(artifacts[0].data, artifacts[0].filename);
      } else {
        const bundle = await createMsaQcBundleZip({
          manifest,
          layout,
          annotations: effectiveOptions.includeAnnotations
            ? snapshot.annotations ?? []
            : [],
          artifacts
        });
        if (runId !== exportRunRef.current) {
          return;
        }
        downloadBlob(bundle, withFileExtension(options.filename, "zip"));
      }
      setProgress(1);
      markMsaPerformance(MSA_PERFORMANCE_MARKS.exportRenderDone);
      setIsOpen(false);
    } catch {
      setError(d.results.viewer.imageExport.errors.failed);
    } finally {
      if (runId === exportRunRef.current) {
        setIsExporting(false);
      }
    }
  }

  function cancelExport() {
    exportRunRef.current += 1;
    setIsExporting(false);
    setProgress(0);
  }

  return {
    closeDialog,
    cancelExport,
    error,
    hasSelection: Boolean(snapshot?.selectedRange),
    isExporting,
    isOpen,
    layout,
    preflight,
    openDialog,
    options: effectiveOptions,
    progress,
    runExport,
    updateOptions
  };
}
