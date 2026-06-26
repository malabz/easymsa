import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadBlob, withFileExtension } from "./downloadBlob";

describe("withFileExtension", () => {
  it("adds an extension only when it is missing", () => {
    expect(withFileExtension("alignment", "svg")).toBe("alignment.svg");
    expect(withFileExtension("alignment.png", ".png")).toBe("alignment.png");
    expect(withFileExtension("  ", "svg")).toBe("msa-export.svg");
  });
});

describe("downloadBlob", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates and revokes an object URL", () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    downloadBlob(new Blob(["test"]), "alignment.svg");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});
