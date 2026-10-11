import { describe, expect, it } from "vitest";
import { homeColumnSummary, prepareHomeDemo } from "./homeDemoData";

const input = ">seq_1\nACG\n>seq_2\nATG\n";
const result = { alignmentLength: 4, sequences: [
  { id: "seq_1", sequence: "AC-G" }, { id: "seq_2", sequence: "AT-G" },
] };
describe("homepage public example data", () => {
  it("uses the existing metric definitions for real columns", () => {
    const data = prepareHomeDemo(input, result);
    expect(homeColumnSummary(data, 0)).toEqual({ position: 1, conservation: 1, gap: 0 });
    expect(homeColumnSummary(data, 1)).toEqual({ position: 2, conservation: .5, gap: 0 });
    expect(homeColumnSummary(data, 2)).toEqual({ position: 3, conservation: null, gap: 1 });
  });
  it("allows reordered output while preserving IDs and contents", () => {
    const data = prepareHomeDemo(input, { ...result, sequences: [...result.sequences].reverse() });
    expect(data.aligned[0].id).toBe("seq_2");
    expect(data.input[0]).toEqual({ id: "seq_2", sequence: "ATG" });
  });
  it("rejects ID substitutions and invalid output", () => {
    expect(() => prepareHomeDemo(input, { ...result, sequences: [{ id: "other", sequence: "AC-G" }, result.sequences[1]] })).toThrow();
    expect(() => prepareHomeDemo(input, { ...result, sequences: [result.sequences[0], result.sequences[0]] })).toThrow();
    expect(() => prepareHomeDemo(input, { ...result, sequences: [result.sequences[0], { id: "seq_2", sequence: "AC-G" }] })).toThrow();
  });
  it("rejects missing rows, unequal lengths and empty inputs", () => {
    expect(() => prepareHomeDemo(input, { ...result, sequences: result.sequences.slice(0, 1) })).toThrow();
    expect(() => prepareHomeDemo(input, { ...result, sequences: [result.sequences[0], { id: "seq_2", sequence: "ATG" }] })).toThrow();
    expect(() => prepareHomeDemo("", result)).toThrow();
  });
  it("bounds selected columns to the actual alignment", () => {
    const data = prepareHomeDemo(input, result);
    expect(homeColumnSummary(data, -10).position).toBe(1);
    expect(homeColumnSummary(data, 100).position).toBe(4);
  });
});
