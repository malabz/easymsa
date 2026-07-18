/// <reference lib="webworker" />

import { calculateConservationColumns } from "../lib/msa/conservation";

type Request = {
  sequences: Array<{ sequence: string }>;
  alignmentLength: number;
};

self.onmessage = (event: MessageEvent<Request>) => {
  self.postMessage(
    calculateConservationColumns(event.data.sequences, event.data.alignmentLength)
  );
};
