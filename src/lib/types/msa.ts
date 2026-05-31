export type MSASequence = {
  id: string;
  sequence: string;
};

export type MSAResult = {
  jobId: string;
  truncated: boolean;
  message?: string;
  sequences: MSASequence[];
  consensus: string;
  alignmentLength: number | null;
  sequenceCount?: number | null;
};
