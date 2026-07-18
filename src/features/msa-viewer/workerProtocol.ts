import type { MSASequence } from "../../lib/types/msa";
import type { ColumnStats, MotifMatch } from "./types";

export type MsaAnalysisWorkerRequest =
  | {
      type: "initialize";
      generation: number;
      sequences: MSASequence[];
      alignmentLength: number;
      skipAnalysis?: boolean;
    }
  | {
      type: "searchMotif";
      generation: number;
      requestId: number;
      query: string;
    };

export type MsaAnalysisWorkerResponse =
  | {
      type: "analysisReady";
      generation: number;
      columns: ColumnStats[];
    }
  | {
      type: "analysisInitialized";
      generation: number;
    }
  | {
      type: "motifReady";
      generation: number;
      requestId: number;
      matches: MotifMatch[];
      totalCount: number;
      truncated: boolean;
    }
  | {
      type: "analysisError";
      generation: number;
      message: string;
    };
