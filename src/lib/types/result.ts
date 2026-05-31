export type ResultSummary = {
  jobId: string;
  metrics: {
    sequenceCount: number;
    alignmentLength: number;
    averageIdentity: number | null;
    gapPercentage: number | null;
    outputSizeMB: number | null;
  };
};

export type ResultFile = {
  name: string;
  description: string;
  size: string;
  href: string;
};
