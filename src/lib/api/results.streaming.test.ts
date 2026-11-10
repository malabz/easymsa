import { afterEach, describe, expect, it, vi } from "vitest";
import { EasyMsaApiError } from "./client";
import { MsaInputError } from "../../features/msa-viewer/inputWorkerProtocol";
import { loadAlignmentInput } from "../../features/msa-viewer/useAlignmentInput";
import { getAlignmentResult } from "./results";

vi.mock("../../features/msa-viewer/useAlignmentInput", () => ({ loadAlignmentInput: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("streamed job result failures", () => {
  it.each(["INPUT_EMPTY", "INPUT_DECODE_FAILED", "INPUT_INVALID_FASTA"] as const)("explains %s as a result format error", async code => {
    vi.stubGlobal("Worker", class {});
    vi.mocked(loadAlignmentInput).mockRejectedValueOnce(new MsaInputError(code));
    await expect(getAlignmentResult("job", "secret")).rejects.toMatchObject({ code: "INCOMPATIBLE_RESULT" });
  });

  it.each(["INVALID_TOKEN", "JOB_EXPIRED", "NETWORK_FAILURE", "LOAD_TIMEOUT"])("preserves %s without requesting the old endpoint", async code => {
    vi.stubGlobal("Worker", class {});
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const error = new EasyMsaApiError({ code, message: "fixture" });
    vi.mocked(loadAlignmentInput).mockRejectedValueOnce(error);
    await expect(getAlignmentResult("job", "secret")).rejects.toBe(error);
    expect(fetch).not.toHaveBeenCalled();
  });
});
