import { describe, expect, it } from "vitest";
import type { MsaExportLayout } from "./exportTypes";
import { renderMsaExportToFasta } from "./exportFastaRenderer";

describe("renderMsaExportToFasta", () => {
  it("uses the same exact non-contiguous columns and duplicate-header rows as the shared layout", () => {
    const layout = {
      rows: [
        { id: "duplicate", rowKey: "row:1", sequence: "ACGTACGT" },
        { id: "duplicate", rowKey: "row:2", sequence: "TGCATGCA" }
      ],
      columns: [{ position: 2 }, { position: 5 }, { position: 8 }]
    } as MsaExportLayout;

    expect(renderMsaExportToFasta(layout)).toBe(
      ">duplicate\nCAT\n>duplicate\nGTA\n"
    );
  });
});
