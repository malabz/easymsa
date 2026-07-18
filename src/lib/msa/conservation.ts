import {
  calculateColumnStats,
} from "../../features/msa-viewer/analysis";
import type { ColumnStats } from "../../features/msa-viewer/types";

export type ConservationColumn = ColumnStats;

export function calculateConservationColumns(
  sequences: Array<{ sequence: string }>,
  alignmentLength: number
): ConservationColumn[] {
  return calculateColumnStats(sequences, alignmentLength);
}
