import type { RowQcStats } from "./types";
import { rowQcGapFraction, rowQcIdentity, rowQcUngappedLength } from "./qcModel";

export type QcDistribution = { key: "length" | "gap" | "ambiguity" | "gc" | "identity"; count: number; min: number; max: number; median: number; bins: number[] };
export function calculateQcDistributions(rows: RowQcStats[]): QcDistribution[] {
  return (["length", "gap", "ambiguity", "gc", "identity"] as const).map(key => {
    const values = rows.map(row => key === "length" ? rowQcUngappedLength(row) : key === "gap" ? rowQcGapFraction(row) : key === "ambiguity" ? row.ambiguityFraction : key === "gc" ? row.gcFraction : rowQcIdentity(row)).filter((n): n is number => n != null);
    const ordered = values.sort((a, b) => a - b);
    const min = ordered[0] ?? 0, max = ordered[ordered.length - 1] ?? 0, middle = Math.floor(ordered.length / 2);
    const median = ordered.length ? (ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2) : 0;
    const bins = Array.from({ length: 12 }, () => 0);
    for (const value of ordered) bins[max === min ? 0 : Math.min(11, Math.floor((value - min) / (max - min) * 12))]++;
    return { key, min, max, median, bins, count: values.length };
  });
}
