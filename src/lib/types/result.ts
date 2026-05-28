export type ResultSummary = {
  jobId: string;
  metrics: {
    sequenceCount: number;
    alignmentLength: number;
    averageIdentity: number;
    gapPercentage: number;
    outputSizeMB: number;
  };
};

export type ResultFile = {
  name: string;
  description: string;
  size: string;
  href: string;
};
