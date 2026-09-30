import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import type { MSAResult } from "../../lib/types/msa";
import { calculateExportLayout } from "./exportLayout";
import { buildMsaExportManifestV1 } from "./exportManifest";
import {
  buildMsaQcBundleEntries,
  createClientZip,
  createMsaQcBundleZip
} from "./qcBundle";
import type {
  MsaExportOptions,
  MsaExportViewerState,
  SupportedExportRegion
} from "./exportTypes";

const alignment: MSAResult = {
  jobId: "qc-job",
  truncated: false,
  sequences: [
    { id: "seq1", sequence: "ACGT" },
    { id: "seq2", sequence: "A-GT" }
  ],
  consensus: "ACGT",
  alignmentLength: 4,
  sequenceCount: 2
};

const options: MsaExportOptions<SupportedExportRegion> = {
  format: "svg",
  region: "filteredView",
  layoutMode: "single-line",
  includeSequenceNames: true,
  includeCoordinates: true,
  includeConsensus: true,
  includeConservation: false,
  includeLegend: false,
  includeAnnotations: true,
  scale: 1,
  backgroundColor: "#ffffff",
  transparentBackground: false,
  filename: "alignment.svg",
  wrapColumnCount: 120,
  maxCanvasPixels: 32_000_000
};

function fixture() {
  const state: MsaExportViewerState = {
    sequences: alignment.sequences,
    visiblePositions: [1, 2, 3, 4],
    conservationColumns: [],
    colorScheme: "nucleotide",
    selectedRange: null,
    viewSettings: {
      cellWidth: 20,
      cellHeight: 24,
      rowHeight: 36,
      fontSize: 11,
      labelWidth: 192,
      markerEvery: 10,
      showCharacters: true,
      cellGap: 2
    },
    viewport: null,
    alignmentLength: 4
  };
  const layout = calculateExportLayout(alignment, state, options);
  const manifest = buildMsaExportManifestV1({
    alignment,
    state,
    layout,
    generatedAt: "2026-08-30T00:00:00Z"
  });
  return { layout, manifest };
}

async function readBlob(blob: Blob) {
  const withArrayBuffer = blob as Blob & {
    arrayBuffer?: () => Promise<ArrayBuffer>;
  };
  if (typeof withArrayBuffer.arrayBuffer === "function") {
    return new Uint8Array(await withArrayBuffer.arrayBuffer());
  }
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(blob);
  });
}

function zipEntries(bytes: Uint8Array) {
  const decoder = new TextDecoder();
  return new Map(
    Object.entries(unzipSync(bytes)).map(([name, data]) => [name, decoder.decode(data)])
  );
}

describe("createClientZip", () => {
  it("creates a deterministic compressed ZIP with UTF-8 filenames", async () => {
    const entries = [
      { name: "manifest.json", data: "{\"ok\":true}\n" },
      { name: "表格.tsv", data: "a\tb\n1\t2\n" }
    ];

    const first = await readBlob(await createClientZip(entries));
    const second = await readBlob(await createClientZip(entries));
    const parsed = zipEntries(first);

    expect(first).toEqual(second);
    expect(new DataView(first.buffer).getUint32(0, true)).toBe(0x0403_4b50);
    expect(parsed.get("manifest.json")).toBe("{\"ok\":true}\n");
    expect(parsed.get("表格.tsv")).toBe("a\tb\n1\t2\n");
    expect(first[first.length - 22]).toBe(0x50);
  });

  it("rejects path traversal, absolute paths, URL queries and duplicates", async () => {
    await expect(
      createClientZip([{ name: "../secret.txt", data: "secret" }])
    ).rejects.toThrow("Unsafe ZIP entry name");
    await expect(
      createClientZip([{ name: "/private/secret.txt", data: "secret" }])
    ).rejects.toThrow("Unsafe ZIP entry name");
    await expect(
      createClientZip([{ name: "result.txt?token=secret", data: "secret" }])
    ).rejects.toThrow("Unsafe ZIP entry name");
    await expect(
      createClientZip([
        { name: "same.txt", data: "one" },
        { name: "same.txt", data: "two" }
      ])
    ).rejects.toThrow("Duplicate ZIP entry name");
  });
});

describe("MSA QC bundle", () => {
  it("assembles the manifest and the three audit TSV files", () => {
    const { layout, manifest } = fixture();
    const entries = buildMsaQcBundleEntries({
      manifest,
      layout,
      annotations: [
        { id: "feature-1", label: "feature", start: 2, end: 3 }
      ],
      artifact: {
        filename: "/private/alignment.svg?token=secret",
        data: "<svg/>"
      }
    });

    expect(entries.map((entry) => entry.name)).toEqual([
      "manifest.json",
      "rows.tsv",
      "columns.tsv",
      "annotations.tsv",
      "alignment.svg"
    ]);
    expect(String(entries[0].data)).toContain("easymsa-msa-export/v1");
    expect(String(entries[1].data)).toContain("row_key");
    expect(String(entries[2].data)).toContain("alignment_position");
    expect(String(entries[3].data)).toContain("feature-1");
    expect(entries.map((entry) => entry.name).join(" ")).not.toContain("secret");
  });

  it("creates a readable QC ZIP", async () => {
    const { layout, manifest } = fixture();
    const blob = await createMsaQcBundleZip({ manifest, layout });
    const entries = zipEntries(await readBlob(blob));

    expect(blob.type).toBe("application/zip");
    expect(Array.from(entries.keys())).toEqual([
      "manifest.json",
      "rows.tsv",
      "columns.tsv"
    ]);
    expect(entries.get("manifest.json")).toContain(manifest.generatedAt);
  });
});
