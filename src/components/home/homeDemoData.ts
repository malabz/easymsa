import { calculateMsaAnalysisStore } from "../../features/msa-viewer/analysis";
import { parseFasta } from "../../lib/utils/fasta";
import type { ColumnStatsStoreV2 } from "../../features/msa-viewer/types";

export type HomeDemoRecord = { id: string; sequence: string };
export type HomeDemoData = {
  input: HomeDemoRecord[];
  aligned: HomeDemoRecord[];
  length: number;
  columns: ColumnStatsStoreV2;
};

export function prepareHomeDemo(inputText: string, result: unknown): HomeDemoData {
  const input = parseFasta(inputText);
  const payload = result as { sequences?: HomeDemoRecord[]; alignmentLength?: number };
  if (!input.valid || !Array.isArray(payload?.sequences) || !payload.sequences.length) {
    throw new Error("EXAMPLE_UNAVAILABLE");
  }
  const length = payload.alignmentLength;
  const inputById = new Map(input.records.map(record => [record.id.split(/\s/)[0], record.sequence.toUpperCase()]));
  const aligned = payload.sequences;
  if (!Number.isInteger(length) || !length || aligned.length !== input.records.length ||
    new Set(aligned.map(record => record.id)).size !== aligned.length ||
    aligned.some(record => typeof record.sequence !== "string" || record.sequence.length !== length ||
      record.sequence.replace(/[-.]/g, "").toUpperCase() !== inputById.get(record.id))) {
    throw new Error("EXAMPLE_INTEGRITY_FAILED");
  }
  return {
    input: aligned.map(record => ({ id: record.id, sequence: inputById.get(record.id)! })),
    aligned,
    length,
    columns: calculateMsaAnalysisStore(aligned, length, { alphabet: "dna" }).columnStore,
  };
}

export function homeColumnSummary(data: HomeDemoData, column: number) {
  const index = Math.min(data.length - 1, Math.max(0, Math.round(column)));
  const canonical = data.columns.canonicalCounts[index];
  return {
    position: index + 1,
    conservation: canonical ? data.columns.dominantCounts[index] / canonical : null,
    gap: data.columns.gapCounts[index] / data.aligned.length,
  };
}

export const HOME_BASE_COLORS: Record<string, [string, string]> = {
  A: ["#d8eee5", "#285d51"], C: ["#dce9f2", "#356b89"],
  G: ["#f3eacb", "#876b32"], T: ["#f2dfe7", "#9b566a"],
  U: ["#f2dfe7", "#9b566a"], "-": ["#f1f5f9", "#9aa7b5"],
};
