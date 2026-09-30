import type { MSAResult, MSASequence } from "../../lib/types/msa";
import { rowKeyForSequence } from "../msa-viewer/alignmentModel";
import { ANALYSIS_SEMANTICS } from "../msa-viewer/workspaceSnapshot";
import type {
  CanonicalExportRegion,
  MsaExportAnnotation,
  MsaExportLayout,
  MsaExportViewerState
} from "./exportTypes";

export const MSA_EXPORT_MANIFEST_SCHEMA = "easymsa-msa-export/v1" as const;

export type MsaAnalysisPoliciesV1 = {
  denominator: "canonical-only";
  coverage: "non-gap-over-total";
  informativeCoverage: "canonical-over-total";
  ambiguity: "excluded-from-canonical-metrics";
  unknown: "neutral-mode-boundary";
  consensusTie: "deterministic-majority-or-iupac";
  difference: "iupac-compatible";
  tiTv: "canonical-substitutions-only";
};

export type MsaExportAnalysisV1 =
  | {
      enabled: true;
      semantics: typeof ANALYSIS_SEMANTICS;
      scope: "all" | "visible" | "selected";
      rowKeys: string[];
      reference: { rowKey: string; label: string } | null;
      coordinateRule: "alignment-1-based;reference-interbase-v2";
      consensusMode: "majority" | "iupac";
      thresholds: MsaExportViewerState["thresholds"] | null;
      policies: MsaAnalysisPoliciesV1;
    }
  | {
      enabled: false;
      semantics: null;
      disabledReason:
        | "protein"
        | "unknown-alphabet"
        | "raw-unequal"
        | "neutral-input";
    };

export type MsaExportManifestV1 = {
  schema: typeof MSA_EXPORT_MANIFEST_SCHEMA;
  generatedAt: string;
  frontend: {
    version: string;
    buildSha: string | null;
  };
  source: {
    label: string;
    kind: "job" | "local-file" | "pasted" | "unknown";
    jobId: string | null;
    sequenceCount: number;
    alignmentLength: number;
    declaredDimensions: {
      sequenceCount: number | null;
      alignmentLength: number | null;
    } | null;
    observedDimensions: {
      sequenceCount: number;
      alignmentLength: number;
    };
    truncated: boolean;
    alphabet: "dna" | "rna" | "nucleotide" | "protein" | "unknown";
    alignmentMode: "aligned" | "rawUnequal" | "neutral" | "unknown";
    warnings: string[];
    rawSha256: string | null;
    alignmentSha256: string | null;
  };
  pipeline: {
    requestedAlgorithm: string;
    resolvedAlgorithm: string;
    preprocessMode: string;
    preprocessStrictness: string;
  };
  analysis: MsaExportAnalysisV1;
  annotations: Array<{
    id: string;
    category: string;
    rowKey: string | null;
    start: number | null;
    end: number | null;
    label: string;
    note: string;
  }>;
  scope: {
    region: CanonicalExportRegion;
    exportedRowKeys: string[];
    alignmentPositions: number[];
    exportedRowCount: number;
    exportedColumnCount: number;
    firstAlignmentPosition: number | null;
    lastAlignmentPosition: number | null;
    contiguousColumns: boolean;
    selectedInterval: { start: number; end: number } | null;
    rowFilterApplied: boolean;
    columnFilterApplied: boolean;
  };
  view: {
    colorScheme: MsaExportLayout["colorScheme"];
    activeTracks: MsaExportLayout["activeTracks"];
    consensusMode: "majority" | "iupac" | null;
    coordinateMode: MsaExportLayout["coordinateMode"];
    differenceMode: boolean;
    referenceLabel: string | null;
  };
  output: {
    filename: string;
    format: MsaExportLayout["options"]["format"];
    layoutMode: MsaExportLayout["options"]["layoutMode"];
    width: number;
    height: number;
    renderedCellCount: number;
    estimatedSvgBytes: number | null;
    includeSequenceNames: boolean;
    includeCoordinates: boolean;
    includeConsensus: boolean;
    includeConservation: boolean;
    includeLegend: boolean;
    includeAnnotations: boolean;
    scale: number;
    limitWarnings: string[];
    pages: Array<{
      page: number;
      filename: string;
      width: number;
      height: number;
      scale: number;
      alignmentPositions: number[];
    }>;
  };
  files: {
    rows: "rows.tsv";
    columns: "columns.tsv";
    annotations: "annotations.tsv" | null;
  };
};

export type BuildMsaExportManifestV1Input = {
  alignment: MSAResult;
  state: MsaExportViewerState;
  layout: MsaExportLayout;
  generatedAt: string;
  sourceLabel?: string;
  outputFilename?: string;
  pages?: MsaExportLayout[];
};

function numberedPageFilename(filename: string, page: number, pageCount: number) {
  if (pageCount <= 1) return sanitizeManifestLabel(filename, "msa-export");
  const safe = sanitizeManifestLabel(filename, "msa-export.png");
  const extensionIndex = safe.lastIndexOf(".");
  const stem = extensionIndex > 0 ? safe.slice(0, extensionIndex) : safe;
  const extension = extensionIndex > 0 ? safe.slice(extensionIndex) : "";
  return `${stem}-page-${String(page).padStart(2, "0")}${extension}`;
}

function finiteNonNegativeInteger(value: number | null | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

function redactCredentials(value: string) {
  return value.replace(
    /\b(token|access[_-]?token|authorization|api[_-]?key)\s*[:=]\s*[^\s&]+/gi,
    "$1=[redacted]"
  );
}

export function sanitizeSensitiveText(value: string) {
  return redactCredentials(value)
    .replace(/https?:\/\/[^\s]+/gi, (match) => {
      try {
        const url = new URL(match);
        return `${url.origin}${url.pathname}`;
      } catch {
        return "[url-redacted]";
      }
    })
    .replace(/\b[a-z]:[\\/][^\t\r\n]*/gi, "[local-path-redacted]")
    .replace(
      /(^|\s)\/(?:home|users|mnt|var|tmp|opt|srv)\/[^\s]*/gi,
      "$1[local-path-redacted]"
    )
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim();
}

function safeSha256(value: string | null | undefined) {
  const digest = String(value ?? "").trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(digest) ? digest : null;
}

function safeSourceKind(value: string | null | undefined) {
  return value === "job" || value === "local-file" || value === "pasted"
    ? value
    : "unknown";
}

/**
 * Produces a display-only basename.  It deliberately discards URL query/hash
 * data and every directory component so a manifest cannot disclose access
 * tokens or an absolute local path.
 */
export function sanitizeManifestLabel(value: string | null | undefined, fallback: string) {
  let candidate = String(value ?? "").trim();
  if (!candidate) {
    return fallback;
  }

  candidate = candidate.split(/[?#]/, 1)[0] ?? "";
  try {
    const parsed = new URL(candidate);
    candidate = parsed.pathname || parsed.hostname;
  } catch {
    // A normal job id or local filename is not a URL.
  }

  candidate = candidate.replace(/\\/g, "/");
  const pathParts = candidate.split("/").filter(Boolean);
  candidate = pathParts[pathParts.length - 1] ?? "";
  candidate = redactCredentials(candidate)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim();
  if (!candidate || candidate === "." || candidate === "..") {
    return fallback;
  }
  return candidate.slice(0, 240);
}

function safeOpaqueId(value: string | null | undefined, fallback: string) {
  const candidate = String(value ?? "");
  return /^[A-Za-z0-9:._-]{1,512}$/.test(candidate) ? candidate : fallback;
}

function safeBuildSha(value: string | null | undefined) {
  const candidate = String(value ?? "").trim();
  return /^[a-f0-9]{7,64}$/i.test(candidate) ? candidate : null;
}

function safePipelineValue(value: string | null | undefined) {
  const sanitized = sanitizeSensitiveText(String(value ?? ""));
  return sanitized ? sanitized.slice(0, 160) : "unknown";
}

function safeWarningCodes(values: readonly string[] | undefined) {
  return Array.from(
    new Set(
      (values ?? []).filter((value) => /^[a-z0-9_-]{1,80}$/i.test(value))
    )
  ).sort();
}

function normalizedTimestamp(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("generatedAt must be a valid date-time value.");
  }
  return timestamp.toISOString();
}

function columnsAreContiguous(layout: MsaExportLayout) {
  return layout.columns.every(
    (column, index) => index === 0 || column.position === layout.columns[index - 1].position + 1
  );
}

function columnFilterApplied(
  layout: MsaExportLayout,
  state: MsaExportViewerState
) {
  if (layout.columns.length !== state.alignmentLength) {
    return true;
  }
  return layout.columns.some((column, index) => column.position !== index + 1);
}

function rowFilterApplied(alignment: MSAResult, layout: MsaExportLayout) {
  if (layout.rows.length !== alignment.sequences.length) {
    return true;
  }
  return layout.rows.some((sequence, index) => {
    const source = alignment.sequences[index];
    return (
      !source ||
      (sequence !== source &&
        (sequence.id !== source.id || sequence.sequence !== source.sequence))
    );
  });
}

function nucleotideAnalysisEnabled(alignment: MSAResult) {
  const descriptor = alignment.descriptor;
  return descriptor?.alignmentMode === "aligned" && (
    descriptor.alphabet === "dna" ||
    descriptor.alphabet === "rna" ||
    descriptor.alphabet === "nucleotide"
  );
}

function analysisDisabledReason(
  alignment: MSAResult
): Extract<MsaExportAnalysisV1, { enabled: false }>["disabledReason"] {
  if (alignment.descriptor?.alignmentMode === "rawUnequal") {
    return "raw-unequal";
  }
  if (alignment.descriptor?.alphabet === "protein") {
    return "protein";
  }
  if (alignment.descriptor?.alphabet === "unknown") {
    return "unknown-alphabet";
  }
  return "neutral-input";
}

export function buildMsaExportManifestV1({
  alignment,
  state,
  layout,
  generatedAt,
  sourceLabel,
  outputFilename,
  pages = [layout]
}: BuildMsaExportManifestV1Input): MsaExportManifestV1 {
  const firstAlignmentPosition = layout.columns[0]?.position ?? null;
  const lastAlignmentPosition =
    layout.columns.length > 0
      ? layout.columns[layout.columns.length - 1].position
      : null;
  const selectedRange =
    layout.canonicalRegion === "selectedInterval" &&
    firstAlignmentPosition !== null &&
    lastAlignmentPosition !== null
      ? { start: firstAlignmentPosition, end: lastAlignmentPosition }
      : null;
  const referenceLabel = layout.referenceSequence
    ? sanitizeManifestLabel(layout.referenceSequence.id, "reference")
    : null;

  const rowKeys = layout.rows.map((row, index) => {
    const sourceIndex = typeof row.originalIndex === "number"
      ? row.originalIndex
      : alignment.sequences.indexOf(row);
    return safeOpaqueId(
      row.rowKey ?? rowKeyForSequence(row, Math.max(0, sourceIndex)),
      `row-${index + 1}`
    );
  });
  const sourceRowKeys = new Set(
    alignment.sequences.map((row, index) =>
      row.rowKey ?? rowKeyForSequence(row, row.originalIndex ?? index)
    )
  );
  const analysisRowKeys = (state.analysisRowKeys ?? rowKeys)
    .filter((rowKey) => sourceRowKeys.has(rowKey))
    .map((rowKey, index) => safeOpaqueId(rowKey, `analysis-row-${index + 1}`));
  const referenceIndex = layout.referenceSequence
    ? alignment.sequences.indexOf(layout.referenceSequence)
    : -1;
  const referenceRowKey = layout.referenceSequence
    ? safeOpaqueId(
        layout.referenceSequence.rowKey ??
          rowKeyForSequence(layout.referenceSequence, Math.max(0, referenceIndex)),
        "reference"
      )
    : null;
  const exportedRowKeys = new Set(rowKeys);
  const annotations = (state.annotations ?? [])
    .filter((annotation) => {
      if (annotation.rowKey && !exportedRowKeys.has(annotation.rowKey)) {
        return false;
      }
      if (annotation.start === null || annotation.end === null) {
        return true;
      }
      const start = Math.min(annotation.start, annotation.end);
      const end = Math.max(annotation.start, annotation.end);
      return layout.columns.some(
        (column) => column.position >= start && column.position <= end
      );
    })
    .map((annotation, index) => ({
      id: safeOpaqueId(annotation.id, `annotation-${index + 1}`),
      category: safePipelineValue(annotation.category ?? annotation.type ?? "note"),
      rowKey: annotation.rowKey
        ? safeOpaqueId(annotation.rowKey, `row-${index + 1}`)
        : null,
      start: annotation.start === null || annotation.end === null
        ? null
        : Math.min(annotation.start, annotation.end),
      end: annotation.start === null || annotation.end === null
        ? null
        : Math.max(annotation.start, annotation.end),
      label: sanitizeSensitiveText(annotation.label).slice(0, 240),
      note: sanitizeSensitiveText(annotation.note ?? "").slice(0, 4_000)
    }));
  const viewerContext = state.viewerContext;
  const analysisEnabled = nucleotideAnalysisEnabled(alignment);
  const observedDimensions = alignment.descriptor?.observedDimensions ?? {
    sequenceCount: alignment.sequences.length,
    alignmentLength: state.alignmentLength
  };
  const analysis: MsaExportAnalysisV1 = analysisEnabled
    ? {
        enabled: true,
        semantics: ANALYSIS_SEMANTICS,
        scope: state.analysisScope ?? "all",
        rowKeys: analysisRowKeys,
        reference: referenceRowKey && referenceLabel
          ? { rowKey: referenceRowKey, label: referenceLabel }
          : null,
        coordinateRule: "alignment-1-based;reference-interbase-v2",
        consensusMode: state.consensusMode === "iupac" ? "iupac" : "majority",
        thresholds: state.thresholds ?? null,
        policies: {
          denominator: "canonical-only",
          coverage: "non-gap-over-total",
          informativeCoverage: "canonical-over-total",
          ambiguity: "excluded-from-canonical-metrics",
          unknown: "neutral-mode-boundary",
          consensusTie: "deterministic-majority-or-iupac",
          difference: "iupac-compatible",
          tiTv: "canonical-substitutions-only"
        }
      }
    : {
        enabled: false,
        semantics: null,
        disabledReason: analysisDisabledReason(alignment)
      };

  return {
    schema: MSA_EXPORT_MANIFEST_SCHEMA,
    generatedAt: normalizedTimestamp(generatedAt),
    frontend: {
      version: safePipelineValue(state.frontendVersion ?? "unknown"),
      buildSha: safeBuildSha(state.buildSha)
    },
    source: {
      label: sanitizeManifestLabel(
        sourceLabel ?? alignment.descriptor?.sourceName ?? alignment.jobId,
        "alignment"
      ),
      kind: safeSourceKind(alignment.descriptor?.sourceKind),
      jobId:
        viewerContext?.source.type === "server-job"
          ? safePipelineValue(viewerContext.source.jobId)
          : null,
      sequenceCount: finiteNonNegativeInteger(
        observedDimensions.sequenceCount,
        alignment.sequences.length
      ),
      alignmentLength: finiteNonNegativeInteger(
        observedDimensions.alignmentLength,
        state.alignmentLength
      ),
      declaredDimensions: alignment.descriptor?.declaredDimensions
        ? {
            sequenceCount: alignment.descriptor.declaredDimensions.sequenceCount,
            alignmentLength: alignment.descriptor.declaredDimensions.alignmentLength
          }
        : null,
      observedDimensions: {
        sequenceCount: finiteNonNegativeInteger(
          observedDimensions.sequenceCount,
          alignment.sequences.length
        ),
        alignmentLength: finiteNonNegativeInteger(
          observedDimensions.alignmentLength,
          state.alignmentLength
        )
      },
      truncated: Boolean(alignment.truncated),
      alphabet: alignment.descriptor?.alphabet ?? "unknown",
      alignmentMode: alignment.descriptor?.alignmentMode ?? "unknown",
      warnings: safeWarningCodes(alignment.descriptor?.warnings),
      rawSha256: safeSha256(alignment.descriptor?.rawSha256),
      alignmentSha256: safeSha256(alignment.descriptor?.alignmentSha256)
    },
    pipeline: {
      requestedAlgorithm: safePipelineValue(viewerContext?.algorithm.requested),
      resolvedAlgorithm: safePipelineValue(viewerContext?.algorithm.resolved),
      preprocessMode: safePipelineValue(viewerContext?.preprocess.mode),
      preprocessStrictness: safePipelineValue(viewerContext?.preprocess.strictness)
    },
    analysis,
    annotations,
    scope: {
      region: layout.canonicalRegion,
      exportedRowKeys: rowKeys,
      alignmentPositions: layout.columns.map((column) => column.position),
      exportedRowCount: layout.rows.length,
      exportedColumnCount: layout.columns.length,
      firstAlignmentPosition,
      lastAlignmentPosition,
      contiguousColumns: columnsAreContiguous(layout),
      selectedInterval: selectedRange,
      rowFilterApplied: rowFilterApplied(alignment, layout),
      columnFilterApplied: columnFilterApplied(layout, state)
    },
    view: {
      colorScheme: layout.colorScheme,
      activeTracks: analysisEnabled ? [...layout.activeTracks] : [],
      consensusMode: analysisEnabled
        ? state.consensusMode === "iupac" ? "iupac" : "majority"
        : null,
      coordinateMode: analysisEnabled ? layout.coordinateMode : "alignment",
      differenceMode: analysisEnabled ? layout.differenceMode : false,
      referenceLabel: analysisEnabled ? referenceLabel : null
    },
    output: {
      filename: sanitizeManifestLabel(
        outputFilename ?? layout.options.filename,
        "msa-export"
      ),
      format: layout.options.format,
      layoutMode: layout.options.layoutMode,
      width: layout.width,
      height: layout.height,
      renderedCellCount: layout.renderedCellCount,
      estimatedSvgBytes:
        layout.options.format === "svg" ? layout.estimatedSvgBytes : null,
      includeSequenceNames: layout.options.includeSequenceNames,
      includeCoordinates: layout.options.includeCoordinates,
      includeConsensus: layout.options.includeConsensus,
      includeConservation: layout.options.includeConservation,
      includeLegend: layout.options.includeLegend,
      includeAnnotations: layout.options.includeAnnotations,
      scale: layout.options.format === "png" ? layout.renderScale : 1,
      limitWarnings: layout.limitReason ? [sanitizeSensitiveText(layout.limitReason)] : [],
      pages: pages.map((pageLayout, index) => ({
        page: index + 1,
        filename: numberedPageFilename(
          outputFilename ?? layout.options.filename,
          index + 1,
          pages.length
        ),
        width: pageLayout.width,
        height: pageLayout.height,
        scale: pageLayout.options.format === "png" ? pageLayout.renderScale : 1,
        alignmentPositions: pageLayout.columns.map((column) => column.position)
      }))
    },
    files: {
      rows: "rows.tsv",
      columns: "columns.tsv",
      annotations: annotations.length ? "annotations.tsv" : null
    }
  };
}

function safeTsvCell(value: string | number | boolean | null | undefined) {
  const stringValue = typeof value === "string";
  let cell = value === null || value === undefined ? "" : String(value);
  cell = stringValue
    ? sanitizeSensitiveText(cell).replace(/[\t\r\n]+/g, " ").trim()
    : cell.replace(/[\t\r\n]+/g, " ").trim();
  if (stringValue && /^[=+\-@]/.test(cell)) {
    cell = `'${cell}`;
  }
  return cell;
}

function tsvLine(values: Array<string | number | boolean | null | undefined>) {
  return `${values.map(safeTsvCell).join("\t")}\n`;
}

function sourceRowIndex(
  row: MSASequence,
  sourceRows: MSASequence[],
  claimed: Set<number>
) {
  const originalIndex = row.originalIndex;
  if (
    typeof originalIndex === "number" &&
    Number.isInteger(originalIndex) &&
    originalIndex >= 0 &&
    originalIndex < sourceRows.length &&
    !claimed.has(originalIndex)
  ) {
    claimed.add(originalIndex);
    return originalIndex + 1;
  }

  let index = sourceRows.findIndex(
    (candidate, candidateIndex) => candidate === row && !claimed.has(candidateIndex)
  );
  if (index < 0) {
    index = sourceRows.findIndex(
      (candidate, candidateIndex) =>
        !claimed.has(candidateIndex) &&
        candidate.id === row.id &&
        candidate.sequence === row.sequence
    );
  }
  if (index >= 0) {
    claimed.add(index);
    return index + 1;
  }
  return null;
}

export function buildRowsTsv(layout: MsaExportLayout) {
  let output = tsvLine([
    "export_row",
    "source_row",
    "row_key",
    "original_header",
    "aligned_length",
    "ungapped_length",
    "is_reference"
  ]);
  const claimed = new Set<number>();
  layout.rows.forEach((row, index) => {
    output += tsvLine([
      index + 1,
      sourceRowIndex(row, layout.alignment.sequences, claimed),
      row.rowKey ?? rowKeyForSequence(row, row.originalIndex ?? index),
      row.id,
      row.sequence.length,
      row.sequence.replace(/-/g, "").length,
      row.rowKey && layout.referenceSequence?.rowKey
        ? row.rowKey === layout.referenceSequence.rowKey
        : row === layout.referenceSequence
    ]);
  });
  return output;
}

function optionalMetric(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(6))
    : null;
}

export function buildColumnsTsv(layout: MsaExportLayout) {
  let output = tsvLine([
    "export_column",
    "alignment_position",
    "reference_position",
    "consensus_base",
    "dominant_base",
    "ambiguity_consensus",
    "conservation",
    "gap_fraction",
    "coverage",
    "entropy",
    "variation"
  ]);
  layout.columns.forEach((column, index) => {
    const stats = column.conservation;
    output += tsvLine([
      index + 1,
      column.position,
      column.referencePosition,
      layout.consensusSequence[column.position - 1] ?? "",
      stats?.dominantBase ?? "",
      stats?.ambiguityConsensus ?? "",
      optionalMetric(stats?.conservation),
      optionalMetric(stats?.gapFraction),
      optionalMetric(stats?.coverage),
      optionalMetric(stats?.entropy),
      optionalMetric(stats?.variation)
    ]);
  });
  return output;
}

function annotationOverlapsLayout(
  annotation: MsaExportAnnotation,
  layout: MsaExportLayout,
  exportedRowKeys: Set<string>,
  exportedSequenceIds: Set<string>
) {
  if (annotation.rowKey && !exportedRowKeys.has(annotation.rowKey)) {
    return false;
  }
  if (
    annotation.sequenceId &&
    !exportedSequenceIds.has(annotation.sequenceId)
  ) {
    return false;
  }
  if (annotation.start === null || annotation.end === null) {
    return true;
  }
  const start = Math.min(annotation.start, annotation.end);
  const end = Math.max(annotation.start, annotation.end);
  return layout.columns.some(
    (column) => column.position >= start && column.position <= end
  );
}

export function buildAnnotationsTsv(
  layout: MsaExportLayout,
  annotations: readonly MsaExportAnnotation[] = []
) {
  let output = tsvLine([
    "annotation_id",
    "category",
    "label",
    "row_key",
    "original_header",
    "start",
    "end",
    "coordinate_system",
    "note"
  ]);
  const exportedSequenceIds = new Set(layout.rows.map((row) => row.id));
  const exportedRowKeys = new Set(
    layout.rows.map((row, index) => row.rowKey ?? rowKeyForSequence(row, index))
  );
  annotations
    .filter(
      (annotation) =>
        annotationOverlapsLayout(
          annotation,
          layout,
          exportedRowKeys,
          exportedSequenceIds
        )
    )
    .forEach((annotation) => {
      output += tsvLine([
        annotation.id,
        annotation.category ?? annotation.type ?? "",
        annotation.label,
        annotation.rowKey ?? "",
        annotation.sequenceId ?? "",
        annotation.start === null || annotation.end === null
          ? ""
          : Math.min(annotation.start, annotation.end),
        annotation.start === null || annotation.end === null
          ? ""
          : Math.max(annotation.start, annotation.end),
        "alignment",
        annotation.note ?? ""
      ]);
    });
  return output;
}
