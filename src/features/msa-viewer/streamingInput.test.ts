// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { readAlignmentStream } from "./streamingInput";
import { processMsaInputRequest, MSA_INPUT_PROTOCOL_VERSION, type MsaInputWorkerRequest } from "./inputWorkerProtocol";
import { sha256Hex, canonicalAlignmentSource } from "./alignmentModel";
import { adaptServerAlignment } from "../../lib/api/serverAlignment";

afterEach(() => vi.restoreAllMocks());

const request = (text: string): MsaInputWorkerRequest => ({ protocolVersion: MSA_INPUT_PROTOCOL_VERSION,
  type: "parse", requestId: 1, sourceName: "test.fasta", sourceKind: "local-file",
  payload: {kind: "file", file: new File([text], "test.fasta")} });
describe("streaming input", () => {
  const legacyRequest = (): MsaInputWorkerRequest => ({...request(""), sourceKind:"job", sourceName:"legacy-job",
    payload:{kind:"url", url:"https://example.test/alignment/fasta?stage=initial", legacyUrl:"https://example.test/alignment?stage=initial"}});

  it("adapts a missing-route JSON response in the input session without changing identity or warnings", async () => {
    const payload = {jobId:"legacy-job", truncated:true, sequenceCount:12, alignmentLength:99, message:"preview",
      sequences:[{id:"short",header:"duplicate full title",sequence:"ac.g"},{id:"other",header:"duplicate full title",sequence:"au-"}]};
    const fetchMock = vi.spyOn(globalThis,"fetch")
      .mockResolvedValueOnce(new Response('{"detail":"Not Found"}',{status:404}))
      .mockResolvedValueOnce(Response.json(payload));
    expect(await readAlignmentStream(legacyRequest())).toEqual(await adaptServerAlignment(payload));
    expect(fetchMock.mock.calls.map(call=>call[0])).toEqual([
      "https://example.test/alignment/fasta?stage=initial", "https://example.test/alignment?stage=initial"
    ]);
  });

  it.each([[403,"INVALID_TOKEN"],[404,"JOB_NOT_FOUND"],[404,"RESULT_FILE_MISSING"],[410,"JOB_EXPIRED"],[500,"HTTP_ERROR"]] as const)(
    "does not fall back after %s / %s", async (status,code) => {
      const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(Response.json({error:{code,message:"fixture"}},{status}));
      await expect(readAlignmentStream(legacyRequest())).rejects.toMatchObject({code,status});
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  it.each(["not JSON", JSON.stringify({jobId:"legacy-job",truncated:false,sequenceCount:1,alignmentLength:2,sequences:[{id:"a",sequence:"A\u0000"}]}),
    JSON.stringify({jobId:"legacy-job",truncated:false,sequenceCount:0,alignmentLength:0,sequences:[],unexpected:true})])(
    "keeps strict legacy response validation (%s)", async body => {
      vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response("",{status:404})).mockResolvedValueOnce(new Response(body));
      await expect(readAlignmentStream(legacyRequest())).rejects.toMatchObject({code:"INVALID_SERVER_ALIGNMENT_PAYLOAD"});
    }
  );

  it("keeps legacy access errors and interrupted reads as failures", async () => {
    const fetchMock=vi.spyOn(globalThis,"fetch")
      .mockResolvedValueOnce(new Response("",{status:404}))
      .mockResolvedValueOnce(Response.json({error:{code:"INVALID_TOKEN",message:"fixture"}},{status:403}));
    await expect(readAlignmentStream(legacyRequest())).rejects.toMatchObject({code:"INVALID_TOKEN",status:403});
    fetchMock.mockResolvedValueOnce(new Response("",{status:404})).mockResolvedValueOnce(new Response(new ReadableStream({start(controller){controller.error(new TypeError("disconnected"));}})));
    await expect(readAlignmentStream(legacyRequest())).rejects.toMatchObject({code:"NETWORK_FAILURE"});
  });

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
