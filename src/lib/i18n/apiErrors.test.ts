import { describe, expect, it } from "vitest";
import { EasyMsaApiError } from "../api/client";
import { apiErrorMessage, isPermanentApiError } from "./apiErrors";

describe("shared API presentation", () => {
  it("translates the same error at render time and keeps a useful record number", () => {
    const error = new EasyMsaApiError({ code: "REALIGN_UNALIGNED_INPUT", message: "Unequal length at record 3: private header" });
    expect(apiErrorMessage(error, "zh")).toBe("已比对序列必须具有相同长度。（记录 3）");
    expect(apiErrorMessage(error, "en")).toBe("Aligned sequences must have equal lengths. (record 3)");
    expect(error.message).toContain("private header");
  });
  it("does not expose raw unknown server details or network jargon", () => {
    expect(apiErrorMessage(new EasyMsaApiError({ code: "SOMETHING_NEW", message: "/private/path internal failure" }), "zh")).toBe("请求未能完成，请重试。");
    expect(apiErrorMessage(new TypeError("Failed to fetch"), "en")).toContain("Check your connection");
    expect(apiErrorMessage(new Error("unrecognized"), "en", "Unable to load results.")).toBe("Unable to load results.");
  });
  it.each([401, 403, 404, 410])("localizes permanent HTTP %s errors", status => {
    expect(apiErrorMessage(new EasyMsaApiError({ code: "HTTP_ERROR", message: "error", status }), "zh")).not.toContain("error");
  });
  it.each([400, 401, 403, 404, 410, 413, 422])("classifies %s as requiring user action", status => {
    expect(isPermanentApiError(new EasyMsaApiError({ code: "HTTP_ERROR", message: "error", status }))).toBe(true);
  });
  it.each([408, 425, 429, 500, 502, 503])("keeps %s retryable", status => {
    expect(isPermanentApiError(new EasyMsaApiError({ code: "HTTP_ERROR", message: "error", status }))).toBe(false);
  });
});
