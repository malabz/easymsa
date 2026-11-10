import { describe, expect, it } from "vitest";
import { calculateMsaAnalysisPayloadV4 as current, type MsaAnalysisWorkerRequest } from "./workerProtocol";
import { calculateMsaAnalysisPayloadV4 as reference } from "./__reference__/workerProtocol";
import { calculateMsaAnalysisStore as currentStore } from "./analysis";
import { calculateMsaAnalysisStore as referenceStore } from "./__reference__/analysis";

describe("lossless analysis optimization against e08316e", () => {
  it("preserves every count, consensus, comparison and floating-point value", () => {
    let seed = 19;
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
    for (let sample = 0; sample < 100; sample++) {
      const length = random() % 103, count = random() % 17 + 1;
      const symbols = sample % 5 === 0 ? "-" : "ACGTURYSWKMBDHVN-.acgu";
      const sequences = Array.from({length: count}, (_, i) => ({ id: "duplicate title", rowKey: `row:${i}`, originalIndex: i,
        sequence: Array.from({length}, () => symbols[random() % symbols.length]).join("") }));
      const request: Extract<MsaAnalysisWorkerRequest, {type: "analyze"}> = {
        protocolVersion: 4, type: "analyze", requestId: sample, generation: 1, sourceFingerprint: "fixture",
        scope: sample % 2 ? "all" : "selected", scopeRowKeys: sequences.map(row => row.rowKey),
        alphabet: sample % 2 ? "dna" : "rna", sequences, alignmentLength: length, overviewBinCount: 9,
        referenceRowKey: sample % 3 ? null : sequences[0].rowKey,
        referenceSequence: sample % 7 ? null : {...sequences[0], rowKey: "external"}
      };
      expect(current(request), `sample ${sample}`).toEqual(reference(request));
    }
  });
  it("preserves unknown and missing-tail behavior in the general analysis helpers", () => {
    for (const rows of [[], [{sequence:""}], [{sequence:"ac-?😊"},{sequence:"T"}], [{sequence:"NN..."}]]) {
      expect(currentStore(rows, 8)).toEqual(referenceStore(rows, 8));
    }
  });
});
