import { useMemo } from "react";
import { materializeAllColumnStats } from "../../features/msa-viewer/columnStatsStore";
import { useMsaAnalysis } from "../../features/msa-viewer/useMsaAnalysis";

export function useConservationColumns(
  jobId: string,
  sequences: Array<{ sequence: string }>,
  alignmentLength: number
) {
  void jobId;
  const normalizedSequences = useMemo(
    () => sequences.map((sequence, index) => ({ id: String(index), ...sequence })),
    [sequences]
  );
  const analysis = useMsaAnalysis(
    normalizedSequences,
    alignmentLength,
    ""
  );
  // Explicit compatibility bridge for the one legacy caller. Production MSA
  // Viewer paths consume the compact store directly and never expose an
  // implicit full-column getter.
  const columns = useMemo(
    () => analysis.columnStore
      ? materializeAllColumnStats(analysis.columnStore)
      : [],
    [analysis.columnStore]
  );

  return {
    columns,
    isCalculating: analysis.isCalculating
  };
}
