// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { columnStatsStoreTransferables } from "./columnStatsStore";
import { calculateMinimapPair } from "./minimapData";
import { calculateMotifSearchPayload } from "./motifWorkerProtocol";
import { calculateMsaRangeStatsTask } from "./rangeStatsWorkerProtocol";
import type { SessionMessage, SessionResponse, SessionTask } from "./sharedDataProtocol";
import { calculateMsaAnalysisPayloadV4 } from "./workerProtocol";

const rows = [
  { id: "duplicate title", rowKey: "row:a", sequence: "ACGT" },
  { id: "duplicate title", rowKey: "row:b", sequence: "A-GT" },
  { id: "third full title", rowKey: "row:c", sequence: "TCGA" }
];
const tasks = {
  analysis: { type: "run", id: 1, operation: "analysis", rows: [2, 1], referenceSequence: 0,
    request: { protocolVersion: 4, type: "analyze", generation: 1, requestId: 11,
      sourceFingerprint: "fixture", scope: "selected", scopeRowKeys: ["row:c", "row:b"],
      alignmentLength: 4, referenceRowKey: "row:a", alphabet: "dna" } },
  motif: { type: "run", id: 2, operation: "motif", rows: [1],
    request: { protocolVersion: 3, type: "search", requestId: 12, sourceFingerprint: "fixture",
      query: "GT", matchMode: "strict", strandMode: "forward", maxMatches: 20_000 } },
  range: { type: "run", id: 3, operation: "range", rows: null, reference: 0,
    request: { protocolVersion: 1, type: "calculate", requestId: 13, sourceFingerprint: "fixture",
      scopeRowKeys: ["row:a", "row:b", "row:c"], range: { start: 2, end: 4 }, consensusMode: "majority" } },
  overview: { type: "run", id: 4, operation: "overview", rows: [2, 0], reference: 0,
    request: { positions: { kind: "identity", length: 4 }, scheme: "nucleotide", store: null, differenceMode: true } },
  export: { type: "run", id: 5, operation: "export", rows: [1, 0],
    request: { positions: { kind: "identity", length: 4 }, offset: 0, length: 2, start: 2, end: 3, contiguous: true } }
} satisfies Record<string, SessionTask>;

let turns: Array<() => void>;
let replies: Array<{ message: SessionResponse; transfer?: Transferable[] }>;
let scope: {
  onmessage: ((event: MessageEvent<SessionMessage>) => void) | null;
  postMessage: (message: SessionResponse, transfer?: Transferable[]) => void;
};

beforeEach(async () => {
  vi.resetModules();
  turns = [];
  replies = [];
  scope = { onmessage: null, postMessage: (message, transfer) => replies.push({ message, transfer }) };
  vi.stubGlobal("self", scope);
  // Keep the real scheduler; advance its event-loop turns deterministically.
  vi.stubGlobal("MessageChannel", class {
    port1 = { onmessage: null as (() => void) | null };
    port2 = { postMessage: () => turns.push(() => this.port1.onmessage?.()) };
  });
  await import("./sharedData.worker");
});
afterEach(() => vi.unstubAllGlobals());

function send(message: SessionMessage) {
  scope.onmessage!({ data: message } as MessageEvent<SessionMessage>);
}
function drainTurns() {
  while (turns.length) turns.shift()!();
}
function resultReply(id: number) {
  const reply = replies.find(({ message }) => message.id === id && message.result !== undefined);
  expect(reply).toBeDefined();
  return reply!;
}

describe("shared data Worker wire compatibility", () => {
  it("restores indexed rows and references for all five operations without changing response envelopes", async () => {
    send({ type: "initialize", sequences: rows });
    Object.values(tasks).forEach(send);
    drainTurns();

    const analysis = calculateMsaAnalysisPayloadV4({ ...tasks.analysis.request,
      sequences: [rows[2], rows[1]], referenceSequence: rows[0] });
    expect(resultReply(1)).toEqual({ message: { id: 1, result: analysis }, transfer: columnStatsStoreTransferables(analysis.columnStore) });
    expect(resultReply(2)).toEqual({ message: { id: 2, result: calculateMotifSearchPayload({ ...tasks.motif.request, sequences: [rows[1]] }) }, transfer: [] });
    expect(resultReply(3)).toEqual({ message: { id: 3, result: calculateMsaRangeStatsTask({ ...tasks.range.request, sequences: rows, reference: rows[0] }) }, transfer: [] });
    const overview = calculateMinimapPair({ ...tasks.overview.request, rows: [rows[2], rows[0]], reference: rows[0] });
    expect(resultReply(4)).toEqual({ message: { id: 4, result: overview }, transfer: [overview.horizontal.pixels.buffer, overview.vertical.pixels.buffer] });

    const exported = resultReply(5);
    expect(Object.keys(exported.message).sort()).toEqual(["id", "result"]);
    expect(exported.transfer).toEqual([]);
    const blob = exported.message.result;
    expect(blob).toBeInstanceOf(Blob);
    if (!(blob instanceof Blob)) throw new Error("Expected an export blob");
    expect(await blob.text()).toBe(">duplicate title\n-G\n>duplicate title\nCG\n");
    expect(replies.filter(({ message }) => message.progress !== undefined).map(({ message }) => Object.keys(message).sort()))
      .toEqual(expect.arrayContaining([["id", "progress"]]));
    expect(replies.some(({ message }) => message.error !== undefined)).toBe(false);
  });

  it("keeps cancellation and normalized error messages on the same wire protocol", () => {
    send({ type: "initialize", sequences: rows });
    send(tasks.export);
    send({ type: "cancel", id: tasks.export.id });
    send({ ...tasks.motif, request: { ...tasks.motif.request, query: "!" } });
    drainTurns();
    expect(replies.some(({ message }) => message.id === tasks.export.id)).toBe(false);
    expect(replies).toHaveLength(1);
    expect(replies[0].message).toMatchObject({ id: tasks.motif.id, error: { code: "MOTIF_INVALID", invalidCharacters: ["!"] } });
    expect(Object.keys(replies[0].message).sort()).toEqual(["error", "id"]);
  });
});
