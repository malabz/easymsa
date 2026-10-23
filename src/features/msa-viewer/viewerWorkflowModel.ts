import type { MSASequence } from "../../lib/types/msa";
import type { ColumnPositionView, ColumnRange } from "./types";
import { identityColumnPositionView, positionAt } from "./columnStatsStore";

export function matchesSequenceName(sequence: MSASequence, query: string) {
  return sequence.id.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}
export function parseViewerPosition(value: string, maximum: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const position = Number(value);
  return Number.isSafeInteger(position) && position >= 1 && position <= maximum ? position : null;
}
export function validateThreshold(value: string, percent: boolean, integer = false) {
  if (!value.trim()) return { valid: true, value: null };
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return { valid: false, value: null };
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (percent && parsed > 100) || (integer && !Number.isSafeInteger(parsed))) return { valid: false, value: null };
  return { valid: true, value: percent ? parsed / 100 : parsed };
}
export type ExportRows = "all" | "displayed" | "selected";
export type ExportColumns = "all" | "filtered" | "interval";
export type SequenceExportSnapshot = {
  all: MSASequence[]; displayed: MSASequence[]; selected: MSASequence[];
  positions: ColumnPositionView; length: number; range: ColumnRange | null;
  source: string; stage?: "initial" | "refined" | "final"; initialRows: ExportRows; initialColumns: ExportColumns;
};
export function resolveSequenceExport(snapshot: SequenceExportSnapshot, rowScope: ExportRows, columnScope: ExportColumns) {
  const rows = snapshot[rowScope];
  const range = columnScope === "interval" ? snapshot.range : null;
  const positions = columnScope === "filtered" ? snapshot.positions : identityColumnPositionView(range ? range.end - range.start + 1 : snapshot.length);
  const position = (index: number) => range ? range.start + index : positionAt(positions, index)!;
  const length = columnScope === "interval" && !range ? 0 : positions.length;
  const start = length ? position(0) : 0;
  const end = length ? position(length - 1) : 0;
  const contiguous = !length || end - start + 1 === length;
  return { rows, length, start, end, contiguous, position, positions, offset: range ? range.start - 1 : 0 };
}
export function sequenceExportText(selection: ReturnType<typeof resolveSequenceExport>) {
  const fasta = selection.rows.map(row => {
    const sequence = selection.contiguous
      ? row.sequence.slice(selection.start - 1, selection.end)
      : Array.from({ length: selection.length }, (_, index) => row.sequence[selection.position(index) - 1] ?? "").join("");
    return `>${row.id}\n${sequence}\n`;
  }).join("");
  const mapping = selection.contiguous ? null : "export_column\toriginal_alignment_column\n" + Array.from({ length: selection.length }, (_, index) => `${index + 1}\t${selection.position(index)}\n`).join("");
  return { fasta, mapping };
}
