import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJob, createRealignmentJob, getJobStatus } from "./jobs";
import { getAlignmentResult, getDownloadFiles, getResultSummary } from "./results";
import { readJobAccessRecords } from "./tokens";
import { EasyMsaApiError, parseApiError } from "./client";
import type { ResultStage } from "../types/job";

// This is a reviewed mirror of the backend's real TestClient captures, not a
// second hand-maintained mock API. scripts/check_http_contract.py checks equality.
type ContractCase = {
  method: string;
  path: string;
  status: number;
  form?: Record<string, string>;
  upload?: { filename: string; text: string };
  body?: unknown;
  fasta?: string;
};
const contract = JSON.parse(readFileSync(
  resolve(process.cwd(), "contracts/http-v1.json"), "utf8"
)) as { version: number; cases: Record<string, ContractCase> };
const cases = contract.cases;
const jobId = cases.submit.form!.job_name;
const token = new URL(cases.queued.path, "http://contract.test").searchParams.get("token")!;

function requestPath(url: string) {
  const parsed = new URL(url, "http://contract.test");
  return parsed.pathname + parsed.search;
}

function serve(name: string) {
  const fixture = cases[name];
  return vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    expect(requestPath(url)).toBe(fixture.path);
    expect(init?.method ?? "GET").toBe(fixture.method);
    if (fixture.form) {
      expect(init?.body).toBeInstanceOf(FormData);
      const form = init!.body as FormData;
      const entries: Record<string, FormDataEntryValue> = {};
      form.forEach((value, key) => { if (key !== "input_file") entries[key] = value; });
      expect(entries).toEqual(fixture.form);
      if (fixture.upload) {
        expect(form.get("input_file")).toBeInstanceOf(File);
        expect((form.get("input_file") as File).name).toBe(fixture.upload.filename);
        const uploadedText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsText(form.get("input_file") as File);
        });
        expect(uploadedText).toBe(fixture.upload.text);
      } else {
        expect(form.has("input_file")).toBe(false);
      }
    }
    return new Response(JSON.stringify(fixture.body), {
      status: fixture.status, headers: { "Content-Type": "application/json" }
    });
  }));
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("shared HTTP v1 compatibility baseline", () => {
  it("submits unchanged defaults and stores the actual access response", async () => {
    expect(contract.version).toBe(1);
    serve("submit");
    const response = await createJob({
      jobName: jobId, inputMethod: "paste", language: "en",
      pastedSequence: cases.submit.form!.pasted_sequence
    });
    expect(response).toEqual(cases.submit.body);
    expect(response.downloadUrl).toBeNull();
    expect(readJobAccessRecords()).toEqual([expect.objectContaining({ jobId, token })]);
  });

  it("keeps duplicate public names isolated by access token", async () => {
    for (const name of ["submit", "duplicateSubmit"]) {
      serve(name);
      await createJob({
        jobName: jobId, inputMethod: "paste", language: "en",
        pastedSequence: cases.submit.form!.pasted_sequence
      });
    }
    const records = readJobAccessRecords();
    expect(records).toHaveLength(2);
    expect(records.every(record => record.jobId === jobId)).toBe(true);
    expect(new Set(records.map(record => record.token)).size).toBe(2);
  });

  it("submits the standalone aligned upload using its existing endpoint", async () => {
    serve("standaloneSubmit");
    const upload = cases.standaloneSubmit.upload!;
    const result = await createRealignmentJob(
      new File([upload.text], upload.filename, { type: "text/plain" }), jobId, 1, "en", ""
    );
    expect(result).toEqual(cases.standaloneSubmit.body);
  });

  it.each([
    "queued", "completed", "duplicateQueued", "summaryUnavailable", "realignedStatus", "standaloneQueued", "failed"
  ])("reads the backend %s status without losing null or optional fields", async name => {
    serve(name);
    const accessToken = new URL(cases[name].path, "http://contract.test").searchParams.get("token")!;
    const status = await getJobStatus(jobId, accessToken);
    expect(status).toEqual(cases[name].body);
    expect(status.preprocess).toHaveProperty("summaryUnavailable");
    expect(status).toHaveProperty("realignment");
    if (name === "queued") {
      expect(status.realignment).toBeNull();
      expect(status.algorithm).toEqual({ name: "auto", resolvedName: null });
    }
    if (name === "summaryUnavailable") expect(status.preprocess.summaryUnavailable).toBe(true);
    if (name === "failed") expect(status.failure?.code).toBe("REALIGN_EXECUTION_FAILED");
  });

  it.each([
    ["summary", "final"], ["refinedSummary", "refined"]
  ] as const)("adapts %s and preserves unavailable metrics", async (name, stage) => {
    serve(name);
    const summary = await getResultSummary(jobId, token, undefined, stage);
    expect(summary.jobId).toBe(jobId);
    expect(summary.algorithm).toEqual({ name: "auto", resolvedName: null });
    expect(summary.metrics).toEqual({
      sequenceCount: 2, alignmentLength: 4, gapPercentage: 12.5, averageIdentity: null
    });
    expect(summary.preprocess).toEqual({
      mode: "audit", strictness: "normal", rawSequenceCount: null,
      cleanSequenceCount: null, removedSequenceCount: null
    });
  });

  it.each([
    ["alignment", "final"], ["initial", "initial"], ["refined", "refined"],
    ["finalRefined", "final"], ["attachedFallback", "final"],
    ["failedInitial", "initial"], ["failedFinal", "final"]
  ] as const)("adapts %s with full duplicate titles and stable distinct rows", async (name, stage) => {
    serve(name);
    const accessToken = new URL(cases[name].path, "http://contract.test").searchParams.get("token")!;
    const result = await getAlignmentResult(jobId, accessToken, undefined, stage);
    const refined = name === "refined" || name === "finalRefined";
    const standalone = name === "failedInitial" || name === "failedFinal";
    expect(result.sequences.map(row => row.id)).toEqual(["same full header", standalone ? "other full header" : "same full header"]);
    expect(result.sequences.map(row => row.sequence)).toEqual([refined ? "A-CG" : "AC-G", "ACCG"]);
    expect(result.sequences.map(row => row.originalIndex)).toEqual([0, 1]);
    expect(new Set(result.sequences.map(row => row.rowKey)).size).toBe(2);
    expect(result.sequenceCount).toBe(2);
    expect(result.alignmentLength).toBe(4);
    expect(result.truncated).toBe(false);
    expect(result.descriptor?.warnings).not.toContain("SERVER_DIMENSION_MISMATCH");
  });

  it.each(["missingToken", "invalidToken", "notFound", "notCompleted", "noRefined", "invalidStage", "failedRefined", "expired"])(
    "preserves the HTTP status, error code and details for %s", async name => {
      const fixture = cases[name];
      const body = fixture.body as { error: { code: string; message: string; details: unknown } };
      const error = await parseApiError(new Response(JSON.stringify(body), { status: fixture.status }), "fallback");
      expect(error).toBeInstanceOf(EasyMsaApiError);
      expect(error.status).toBe(fixture.status);
      expect(error.code).toBe(body.error.code);
      expect(error.message).toBe(body.error.message);
      expect(error.details).toEqual(body.error.details);
    }
  );

  it("uses the backend download routes for default and explicit stages", () => {
    expect(getDownloadFiles(jobId, token).map(file => requestPath(file.href))).toEqual([
      cases.zip.path, cases.gzip.path, cases.gzipXz.path
    ]);
    const staged: [ResultStage, string, number][] = [
      ["refined", "refinedZip", 0], ["initial", "failedInitialGzip", 1]
    ];
    for (const [stage, fixture, index] of staged) {
      const accessToken = new URL(cases[fixture].path, "http://contract.test").searchParams.get("token")!;
      expect(requestPath(getDownloadFiles(jobId, accessToken, stage)[index].href)).toBe(cases[fixture].path);
    }
    expect(cases.zip.fasta).toBe(cases.gzip.fasta);
    expect(cases.gzipXz.fasta).toBe(cases.gzip.fasta);
    expect(cases.failedInitialGzip.fasta).toBe(cases.standaloneSubmit.upload!.text);
    expect(cases.refinedZip.fasta).not.toBe(cases.zip.fasta);
  });
});
