import { describe, expect, it } from "vitest";
import { msaCellColorClass, msaCellColorStyle } from "./exportColors";

describe("neutral MSA render palette", () => {
  it("does not assign nucleotide meaning to protein or raw-unequal residues", () => {
    expect(msaCellColorStyle("A", "neutral")).toEqual(
      msaCellColorStyle("W", "neutral")
    );
    expect(msaCellColorClass("C", "neutral")).toBe(
      msaCellColorClass("M", "neutral")
    );
    expect(msaCellColorStyle("-", "neutral")).not.toEqual(
      msaCellColorStyle("A", "neutral")
    );
  });
});
