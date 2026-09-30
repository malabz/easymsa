import { describe, expect, it } from "vitest";
import {
  DEFAULT_QC_THRESHOLDS,
  exportWorkspaceSnapshot,
  importWorkspaceSnapshot,
  loadWorkspaceSnapshot,
  migrateLegacyPreferences,
  migrateLegacyReference,
  saveWorkspaceSnapshot,
  type MsaWorkspaceSnapshotV1
} from "./workspaceSnapshot";

function snapshot(fingerprint = "12345678abcdef"): MsaWorkspaceSnapshotV1 {
  return {
    schema: "easymsa-viewer-workspace/v1",
    analysisSemantics: "nucleotide-v2",
    source: { fingerprint, sequenceCount: 2, alignmentLength: 4 },
    view: {
      activeTracks: ["conservation", "gap"],
      analysisScope: "all",
      colorScheme: "nucleotide",
      consensusMode: "majority",
      coordinateMode: "alignment",
      density: "comfortable",
      differenceMode: false,
      columnFilter: "all",
      sortMode: "original",
      zoomLevel: 1,
      search: "",
      motifQuery: "",
      motifMatchMode: "strict",
      motifStrandMode: "forward",
      viewMode: "detail",
      referenceRowKey: null,
      hiddenRowKeys: [],
      pinnedRowKeys: [],
      selectedRowKeys: [],
      selection: null,
      selectedRange: null,
      viewport: null,
      inspectorOpen: false,
      inspectorWidth: 320,
      minimapCollapsed: false,
      settingsOpen: false,
      qcPanelOpen: false,
      labelWidth: 192
    },
    thresholds: DEFAULT_QC_THRESHOLDS,
    annotations: [],
    updatedAt: "2026-08-30T00:00:00.000Z"
  };
}

describe("MSA workspace snapshots", () => {
  it("round-trips a matching versioned snapshot", () => {
    const exported = exportWorkspaceSnapshot(snapshot());
    const result = importWorkspaceSnapshot(exported, {
      fingerprint: "12345678abcdef",
      sequenceCount: 2,
      alignmentLength: 4
    });
    expect(result).toEqual({ ok: true, snapshot: snapshot() });
    expect(exported).not.toMatch(/token|absolutePath|commandLine/i);
  });

  it("defaults the dock width when importing an earlier v1 snapshot", () => {
    const earlier = JSON.parse(JSON.stringify(snapshot())) as {
      view: Record<string, unknown>;
    };
    delete earlier.view.inspectorWidth;
    const result = importWorkspaceSnapshot(JSON.stringify(earlier), {
      fingerprint: "12345678abcdef",
      sequenceCount: 2,
      alignmentLength: 4
    });
    expect(result).toMatchObject({
      ok: true,
      snapshot: { view: { inspectorWidth: 320 } }
    });
  });

  it("rejects unknown keys and a different alignment", () => {
    const withToken = JSON.stringify({ ...snapshot(), token: "secret" });
    expect(
      importWorkspaceSnapshot(withToken, {
        fingerprint: "12345678abcdef",
        sequenceCount: 2,
        alignmentLength: 4
      })
    ).toMatchObject({ ok: false, code: "INVALID_SCHEMA" });

    expect(
      importWorkspaceSnapshot(exportWorkspaceSnapshot(snapshot()), {
        fingerprint: "different1",
        sequenceCount: 2,
        alignmentLength: 4
      })
    ).toMatchObject({ ok: false, code: "SOURCE_MISMATCH" });
  });

  it("stores snapshots by fingerprint without throwing on malformed state", () => {
    window.localStorage.clear();
    window.localStorage.setItem("easymsa.viewer.workspaces.v1", "not-json");
    expect(saveWorkspaceSnapshot(window.localStorage, snapshot())).toBe(true);
    expect(loadWorkspaceSnapshot(window.localStorage, "12345678abcdef")).toEqual(
      snapshot()
    );
  });

  it("migrates global display preferences but not ambiguous legacy references", () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "easymsa.viewer.preferences.v2",
      JSON.stringify({
        activeTracks: ["coverage", "coverage"],
        colorScheme: "conservation",
        consensusMode: "iupac",
        ignored: "legacy-extra"
      })
    );
    expect(migrateLegacyPreferences(window.localStorage)).toMatchObject({
      activeTracks: ["coverage"],
      colorScheme: "conservation",
      consensusMode: "iupac"
    });

    window.localStorage.setItem(
      "easymsa.viewer.references.v1",
      JSON.stringify({ "job-1": "duplicate" })
    );
    const rows = [
      { id: "duplicate", rowKey: "row-1" },
      { id: "duplicate", rowKey: "row-2" }
    ];
    expect(
      migrateLegacyReference(window.localStorage, {
        sourceType: "server-job",
        legacyJobId: "job-1",
        rows
      })
    ).toBeNull();
    expect(
      migrateLegacyReference(window.localStorage, {
        sourceType: "local-file",
        legacyJobId: "job-1",
        rows: [{ id: "duplicate", rowKey: "row-1" }]
      })
    ).toBeNull();
  });
});
