import { zipSync, type Zippable } from "fflate";
import {
  buildAnnotationsTsv,
  buildColumnsTsv,
  buildRowsTsv,
  sanitizeManifestLabel
} from "./exportManifest";
import type { MsaExportManifestV1 } from "./exportManifest";
import type { MsaExportAnnotation, MsaExportLayout } from "./exportTypes";

export type ClientZipData = string | Uint8Array | ArrayBuffer | Blob;

export type ClientZipEntry = {
  name: string;
  data: ClientZipData;
};

export type MsaQcBundleArtifact = {
  filename: string;
  data: ClientZipData;
};

export type BuildMsaQcBundleInput = {
  manifest: MsaExportManifestV1;
  layout: MsaExportLayout;
  annotations?: readonly MsaExportAnnotation[];
  artifact?: MsaQcBundleArtifact;
  artifacts?: readonly MsaQcBundleArtifact[];
};

const MAX_ZIP32_VALUE = 0xffff_ffff;
const FIXED_ZIP_MTIME = new Date("1980-01-01T00:00:00.000Z");

function validateZipEntryName(name: string) {
  const normalized = name.replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[a-z]:\//i.test(normalized) ||
    /[?#\u0000-\u001f\u007f]/.test(normalized) ||
    normalized.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Unsafe ZIP entry name: ${name || "(empty)"}`);
  }
  return normalized;
}

async function toBytes(data: ClientZipData) {
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  return new Uint8Array(await data.arrayBuffer());
}

/**
 * Creates a deterministic, compressed ZIP in the browser. Validation happens
 * before fflate receives any entry name, keeping path and credential-bearing
 * names out of the archive boundary.
 */
export async function createClientZip(entries: readonly ClientZipEntry[]) {
  if (entries.length === 0) {
    throw new Error("A ZIP bundle must contain at least one entry.");
  }
  if (entries.length > 0xffff) {
    throw new Error("ZIP32 supports at most 65,535 entries.");
  }

  const names = new Set<string>();
  const archiveEntries: Zippable = {};
  let uncompressedBytes = 0;

  for (const entry of entries) {
    const safeName = validateZipEntryName(entry.name);
    if (names.has(safeName)) {
      throw new Error(`Duplicate ZIP entry name: ${safeName}`);
    }
    names.add(safeName);

    const dataBytes = await toBytes(entry.data);
    if (new TextEncoder().encode(safeName).byteLength > 0xffff) {
      throw new Error(`ZIP entry name is too long: ${safeName}`);
    }
    if (dataBytes.byteLength > MAX_ZIP32_VALUE) {
      throw new Error(`ZIP entry is too large for ZIP32: ${safeName}`);
    }

    uncompressedBytes += dataBytes.byteLength;
    if (uncompressedBytes > MAX_ZIP32_VALUE) {
      throw new Error("ZIP bundle is too large for ZIP32.");
    }
    archiveEntries[safeName] = [
      dataBytes,
      { level: 6, mtime: FIXED_ZIP_MTIME }
    ];
  }

  const archive = zipSync(archiveEntries, { level: 6 });
  const bytes = archive.buffer.slice(
    archive.byteOffset,
    archive.byteOffset + archive.byteLength
  ) as ArrayBuffer;
  return new Blob([bytes], { type: "application/zip" });
}

export function buildMsaQcBundleEntries({
  manifest,
  layout,
  annotations = [],
  artifact,
  artifacts = artifact ? [artifact] : []
}: BuildMsaQcBundleInput): ClientZipEntry[] {
  const entries: ClientZipEntry[] = [
    {
      name: "manifest.json",
      data: `${JSON.stringify(manifest, null, 2)}\n`
    },
    { name: "rows.tsv", data: buildRowsTsv(layout) },
    { name: "columns.tsv", data: buildColumnsTsv(layout) }
  ];

  if (annotations.length) {
    entries.push({
      name: "annotations.tsv",
      data: buildAnnotationsTsv(layout, annotations)
    });
  }

  for (const artifactEntry of artifacts) {
    let filename = sanitizeManifestLabel(
      artifactEntry.filename,
      `msa-export.${manifest.output.format}`
    );
    if (entries.some((entry) => entry.name === filename)) {
      filename = `export-${filename}`;
    }
    entries.push({ name: filename, data: artifactEntry.data });
  }
  return entries;
}

export async function createMsaQcBundleZip(input: BuildMsaQcBundleInput) {
  return createClientZip(buildMsaQcBundleEntries(input));
}
