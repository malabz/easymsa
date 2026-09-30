import { z } from "zod";

export const WORKSPACE_SCHEMA = "easymsa-viewer-workspace/v1" as const;
export const ANALYSIS_SEMANTICS = "nucleotide-v2" as const;
export const WORKSPACE_STORAGE_KEY = "easymsa.viewer.workspaces.v1";
export const MAX_STORED_WORKSPACES = 20;
export const MAX_WORKSPACE_STORAGE_BYTES = 3_000_000;
export const LEGACY_PREFERENCES_KEY = "easymsa.viewer.preferences.v2";
export const LEGACY_REFERENCES_KEY = "easymsa.viewer.references.v1";

const rangeSchema = z.object({
  start: z.number().int().positive(),
  end: z.number().int().positive()
}).strict().refine((value) => value.start <= value.end, {
  message: "Range start must not exceed range end."
});

const selectionSchema = z.object({
  rowKey: z.string().min(1),
  position: z.number().int().positive()
}).strict();

const viewportSchema = z.object({
  scrollLeft: z.number().nonnegative(),
  scrollTop: z.number().nonnegative(),
  clientWidth: z.number().nonnegative(),
  clientHeight: z.number().nonnegative()
}).strict();

export const qcAnnotationSchema = z.object({
  id: z.string().min(1),
  category: z.enum(["note", "review", "exclude-candidate"]),
  text: z.string().max(4_000),
  target: z.object({
    rowKey: z.string().min(1).nullable(),
    start: z.number().int().positive().nullable(),
    end: z.number().int().positive().nullable()
  }).strict().refine(
    (target) =>
      target.rowKey !== null ||
      (target.start !== null && target.end !== null && target.start <= target.end),
    { message: "Annotation must target a row or a valid interval." }
  ),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).strict();

export type QcAnnotation = z.infer<typeof qcAnnotationSchema>;

export const qcThresholdsSchema = z.object({
  row: z.object({
    minUngappedLength: z.number().int().nonnegative().nullable(),
    maxGapFraction: z.number().min(0).max(1).nullable(),
    maxAmbiguityFraction: z.number().min(0).max(1).nullable(),
    minGcFraction: z.number().min(0).max(1).nullable(),
    maxGcFraction: z.number().min(0).max(1).nullable(),
    minReferenceIdentity: z.number().min(0).max(1).nullable()
  }).strict(),
  column: z.object({
    minConservation: z.number().min(0).max(1).nullable(),
    maxGapFraction: z.number().min(0).max(1).nullable(),
    minCoverage: z.number().min(0).max(1).nullable(),
    maxEntropy: z.number().min(0).max(1).nullable(),
    maxAmbiguityFraction: z.number().min(0).max(1).nullable()
  }).strict()
}).strict();

export type QcThresholds = z.infer<typeof qcThresholdsSchema>;

export const DEFAULT_QC_THRESHOLDS: QcThresholds = {
  row: {
    minUngappedLength: null,
    maxGapFraction: null,
    maxAmbiguityFraction: null,
    minGcFraction: null,
    maxGcFraction: null,
    minReferenceIdentity: null
  },
  column: {
    minConservation: null,
    maxGapFraction: null,
    minCoverage: null,
    maxEntropy: null,
    maxAmbiguityFraction: null
  }
};

export const workspaceSnapshotSchema = z.object({
  schema: z.literal(WORKSPACE_SCHEMA),
  analysisSemantics: z.literal(ANALYSIS_SEMANTICS),
  source: z.object({
    fingerprint: z.string().min(8),
    sequenceCount: z.number().int().nonnegative(),
    alignmentLength: z.number().int().nonnegative()
  }).strict(),
  view: z.object({
    activeTracks: z.array(z.enum(["conservation", "gap", "coverage", "entropy"])),
    analysisScope: z.enum(["all", "visible", "selected"]),
    colorScheme: z.enum(["nucleotide", "purinePyrimidine", "conservation"]),
    consensusMode: z.enum(["majority", "iupac"]),
    coordinateMode: z.enum(["alignment", "reference"]),
    density: z.enum(["comfortable", "compact"]),
    differenceMode: z.boolean(),
    columnFilter: z.enum(["all", "variable", "conserved", "lowGap", "custom"]),
    sortMode: z.enum(["original", "name", "length", "gap", "ambiguity", "gc", "identity"]),
    zoomLevel: z.number().min(0.25).max(2.5),
    search: z.string().max(1_000),
    motifQuery: z.string().max(1_000),
    motifMatchMode: z.enum(["strict", "possible"]),
    motifStrandMode: z.enum(["forward", "both"]),
    viewMode: z.enum(["overview", "detail"]),
    referenceRowKey: z.string().min(1).nullable(),
    hiddenRowKeys: z.array(z.string().min(1)),
    pinnedRowKeys: z.array(z.string().min(1)),
    selectedRowKeys: z.array(z.string().min(1)),
    selection: selectionSchema.nullable(),
    selectedRange: rangeSchema.nullable(),
    viewport: viewportSchema.nullable(),
    inspectorOpen: z.boolean(),
    inspectorWidth: z.number().int().min(256).max(720).default(320),
    minimapCollapsed: z.boolean(),
    settingsOpen: z.boolean(),
    qcPanelOpen: z.boolean(),
    labelWidth: z.number().int().min(96).max(360)
  }).strict(),
  thresholds: qcThresholdsSchema,
  annotations: z.array(qcAnnotationSchema).max(5_000),
  updatedAt: z.string().datetime()
}).strict();

export type MsaWorkspaceSnapshotV1 = z.infer<typeof workspaceSnapshotSchema>;

type StoredWorkspaceEntry = {
  snapshot: MsaWorkspaceSnapshotV1;
  touchedAt: string;
};

type WorkspaceStore = {
  entries: Record<string, StoredWorkspaceEntry>;
};

export type WorkspaceImportResult =
  | { ok: true; snapshot: MsaWorkspaceSnapshotV1 }
  | { ok: false; code: "INVALID_SCHEMA" | "SOURCE_MISMATCH"; message: string };

export type LegacyViewerPreferences = {
  activeTracks: Array<"conservation" | "gap" | "coverage" | "entropy">;
  colorScheme: "nucleotide" | "purinePyrimidine" | "conservation";
  consensusMode: "majority" | "iupac";
  coordinateMode: "alignment" | "reference";
  density: "comfortable" | "compact";
  differenceMode: boolean;
};

const legacyPreferencesSchema = z.object({
  activeTracks: z.array(z.enum(["conservation", "gap", "coverage", "entropy"])),
  colorScheme: z.enum(["nucleotide", "purinePyrimidine", "conservation"]),
  consensusMode: z.enum(["majority", "iupac"]),
  coordinateMode: z.enum(["alignment", "reference"]),
  density: z.enum(["comfortable", "compact"]),
  differenceMode: z.boolean()
}).partial().passthrough();

function emptyStore(): WorkspaceStore {
  return { entries: {} };
}

export function migrateLegacyPreferences(
  storage: Storage
): Partial<LegacyViewerPreferences> | null {
  try {
    const parsed = JSON.parse(storage.getItem(LEGACY_PREFERENCES_KEY) ?? "null");
    const result = legacyPreferencesSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }
    const migrated: Partial<LegacyViewerPreferences> = {};
    if (result.data.activeTracks?.length) {
      migrated.activeTracks = Array.from(new Set(result.data.activeTracks));
    }
    if (result.data.colorScheme) {
      migrated.colorScheme = result.data.colorScheme;
    }
    if (result.data.consensusMode) {
      migrated.consensusMode = result.data.consensusMode;
    }
    if (result.data.coordinateMode) {
      migrated.coordinateMode = result.data.coordinateMode;
    }
    if (result.data.density) {
      migrated.density = result.data.density;
    }
    if (typeof result.data.differenceMode === "boolean") {
      migrated.differenceMode = result.data.differenceMode;
    }
    return migrated;
  } catch {
    return null;
  }
}

/**
 * v1 references were keyed by a caller-provided job id and stored a display
 * header. They can only be migrated for the exact server job and when that
 * header identifies one row unambiguously. Local filenames are intentionally
 * not accepted as a legacy source key.
 */
export function migrateLegacyReference(
  storage: Storage,
  input: {
    sourceType: "server-job" | "local-file" | "pasted";
    legacyJobId?: string;
    rows: Array<{ id: string; rowKey: string }>;
  }
) {
  if (input.sourceType !== "server-job" || !input.legacyJobId) {
    return null;
  }
  try {
    const parsed = JSON.parse(storage.getItem(LEGACY_REFERENCES_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const legacyId = (parsed as Record<string, unknown>)[input.legacyJobId];
    if (typeof legacyId !== "string") {
      return null;
    }
    const matches = input.rows.filter((row) => row.id === legacyId);
    return matches.length === 1 ? matches[0].rowKey : null;
  } catch {
    return null;
  }
}

function readStore(storage: Storage): WorkspaceStore {
  try {
    const parsed = JSON.parse(storage.getItem(WORKSPACE_STORAGE_KEY) ?? "null") as unknown;
    if (!parsed || typeof parsed !== "object" || !("entries" in parsed)) {
      return emptyStore();
    }
    const entries = (parsed as { entries?: unknown }).entries;
    if (!entries || typeof entries !== "object") {
      return emptyStore();
    }
    const validEntries: Record<string, StoredWorkspaceEntry> = {};
    Object.entries(entries).forEach(([fingerprint, value]) => {
      if (!value || typeof value !== "object") {
        return;
      }
      const candidate = value as { snapshot?: unknown; touchedAt?: unknown };
      const result = workspaceSnapshotSchema.safeParse(candidate.snapshot);
      if (result.success && typeof candidate.touchedAt === "string") {
        validEntries[fingerprint] = {
          snapshot: result.data,
          touchedAt: candidate.touchedAt
        };
      }
    });
    return { entries: validEntries };
  } catch {
    return emptyStore();
  }
}

function serializedBytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function trimStore(store: WorkspaceStore) {
  const ordered = Object.entries(store.entries).sort(
    ([, left], [, right]) => right.touchedAt.localeCompare(left.touchedAt)
  );
  const entries: Record<string, StoredWorkspaceEntry> = {};
  for (const [fingerprint, entry] of ordered.slice(0, MAX_STORED_WORKSPACES)) {
    entries[fingerprint] = entry;
    if (serializedBytes({ entries }) > MAX_WORKSPACE_STORAGE_BYTES) {
      delete entries[fingerprint];
      break;
    }
  }
  return { entries } satisfies WorkspaceStore;
}

export function saveWorkspaceSnapshot(
  storage: Storage,
  snapshot: MsaWorkspaceSnapshotV1
) {
  const valid = workspaceSnapshotSchema.parse(snapshot);
  const store = readStore(storage);
  store.entries[valid.source.fingerprint] = {
    snapshot: valid,
    touchedAt: valid.updatedAt
  };
  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(trimStore(store)));
    return true;
  } catch {
    return false;
  }
}

export function loadWorkspaceSnapshot(
  storage: Storage,
  fingerprint: string
): MsaWorkspaceSnapshotV1 | null {
  return readStore(storage).entries[fingerprint]?.snapshot ?? null;
}

export function exportWorkspaceSnapshot(snapshot: MsaWorkspaceSnapshotV1) {
  return `${JSON.stringify(workspaceSnapshotSchema.parse(snapshot), null, 2)}\n`;
}

export function importWorkspaceSnapshot(
  text: string,
  expected: {
    fingerprint: string;
    sequenceCount: number;
    alignmentLength: number;
  }
): WorkspaceImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      code: "INVALID_SCHEMA",
      message: "Workspace file is not valid JSON."
    };
  }
  const result = workspaceSnapshotSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      code: "INVALID_SCHEMA",
      message: result.error.issues[0]?.message ?? "Workspace schema is invalid."
    };
  }
  const source = result.data.source;
  if (
    source.fingerprint !== expected.fingerprint ||
    source.sequenceCount !== expected.sequenceCount ||
    source.alignmentLength !== expected.alignmentLength
  ) {
    return {
      ok: false,
      code: "SOURCE_MISMATCH",
      message: "Workspace file belongs to a different alignment."
    };
  }
  return { ok: true, snapshot: result.data };
}
