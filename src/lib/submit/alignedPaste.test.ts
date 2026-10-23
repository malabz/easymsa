import { describe, expect, it } from "vitest";
import { validateAlignedPaste } from "./alignedPaste";

describe("aligned FASTA early feedback", () => {
  it.each([">a description\r\nac-g\r\n>b 中文\r\nACCG", ">a\nAC-U\n>b\nACGU"])("accepts aligned DNA/RNA with descriptions", input => {
    expect(validateAlignedPaste(input, "en").valid).toBe(true);
  });
  it.each([
    ["", "粘贴"], [">a\nACGT", "两条"], [">a\nAC\n>b\nACG", "相同长度"],
    [">a\nAC\n>a description\nAC", "重复"], [">a\nAN\n>b\nAC", "仅支持"],
    [">a\n--\n>b\nAC", "缺口"], [">a\nAT\n>b\nAU", "混用"], [">\nAC\n>b\nAC", "名称为空"]
  ])("explains invalid pasted input", (input, message) => {
    const result = validateAlignedPaste(input, "zh");
    expect(result.valid).toBe(false); expect(result.message).toContain(message);
  });
  it("does not add a new upper-size restriction for content checked by the server", () => {
    expect(validateAlignedPaste(`>a\n${"A".repeat(1_100_000)}\n>b\nAC`, "en").valid).toBe(true);
  });
});
