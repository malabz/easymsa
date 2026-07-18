export type ResultSummary = {
  jobId: string;
  metrics: {
    sequenceCount: number | null;
    alignmentLength: number | null;
    averageIdentity: number | null;
    gapPercentage: number | null;
  };
  preprocess: {
    mode: string | null;
    strictness: string | null;
    rawSequenceCount: number | null;
    cleanSequenceCount: number | null;
    removedSequenceCount: number | null;
  };
  outputFiles: string[];
};

export type ResultFile = {
  name: string;
  description: string;
  size: string;
  href: string;
};
