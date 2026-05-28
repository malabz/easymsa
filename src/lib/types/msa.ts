export type MSASequence = {
  id: string;
  sequence: string;
};

export type MSAResult = {
  jobId: string;
  sequences: MSASequence[];
  consensus: string;
  alignmentLength: number;
};
