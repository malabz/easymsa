// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { readAlignmentStream } from "./streamingInput";
import { processMsaInputRequest, MSA_INPUT_PROTOCOL_VERSION, type MsaInputWorkerRequest } from "./inputWorkerProtocol";
import { sha256Hex, canonicalAlignmentSource } from "./alignmentModel";

const request = (text: string): MsaInputWorkerRequest => ({ protocolVersion: MSA_INPUT_PROTOCOL_VERSION,
  type: "parse", requestId: 1, sourceName: "test.fasta", sourceKind: "local-file",
  payload: {kind: "file", file: new File([text], "test.fasta")} });
describe("streaming input", () => {
  it("matches legacy parsing, titles, row identity, warnings and hashes", async () => {
    for (const text of [">same full title\r\nac.g\r\n>same full title\r\nu-Nr", ">中文🙂 \"\\\nACG\nT\n>\nNN--", ">a\nAC\n>b\nACG", ">a\nMELKQW", "\ufeff >a\nAC\n >b\nGT"]) {
      const input = request(text);
      const streamed = await readAlignmentStream(input);
      const legacy = await processMsaInputRequest({...input, payload:{kind:"bytes", bytes:new TextEncoder().encode(text).buffer}});
      expect(streamed).toEqual(legacy);
      expect(streamed.descriptor?.alignmentSha256).toBe(await sha256Hex(canonicalAlignmentSource(streamed.sequences)));
    }
  });
  it("decodes UTF-8 split across network chunks and handles a row over a read block", async () => {
    const text = `>中文🙂\n${"ACGT".repeat(270000)}\n>b\nA`;
    const bytes = new TextEncoder().encode(text);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new ReadableStream({start(controller) {
      for (let i=0;i<bytes.length;i+=4093) controller.enqueue(bytes.slice(i,i+4093)); controller.close();
    }})));
    try {
      const value = await readAlignmentStream({...request(text),sourceKind:"job",payload:{kind:"url",url:"https://example.test/alignment"}});
      expect(value.sequences[0]).toMatchObject({id:"中文🙂",sequence:"ACGT".repeat(270000)});
      expect(value.descriptor?.alignmentMode).toBe("rawUnequal");
    } finally { fetchMock.mockRestore(); }
  });
  it.each(["", ">x\n", "ACGT\n>x\nAC", ">x\nAC\n>y\n"])("rejects invalid input %j", async text => {
    await expect(readAlignmentStream(request(text))).rejects.toMatchObject({code: text ? "INPUT_INVALID_FASTA" : "INPUT_EMPTY"});
  });
  it("reports a broken result stream as a recoverable network failure", async () => {
    const fetchMock = vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(new ReadableStream({start(controller) {
      controller.enqueue(new TextEncoder().encode(">a\nAC")); controller.error(new TypeError("connection closed"));
    }})));
    try {
      await expect(readAlignmentStream({...request(""),sourceKind:"job",payload:{kind:"url",url:"https://example.test/alignment"}})).rejects.toMatchObject({code:"NETWORK_FAILURE"});
    } finally { fetchMock.mockRestore(); }
  });
});
