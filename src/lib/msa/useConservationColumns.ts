import { useMemo } from "react";
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

  return {
    columns: analysis.columns,
    isCalculating: analysis.isCalculating
  };
}
