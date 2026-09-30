import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import type { MSAResult } from "../../lib/types/msa";
import { ExportDialog } from "./ExportDialog";
import { calculateExportLayout } from "./exportLayout";
import type { MsaExportViewerState } from "./exportTypes";
import { createDefaultExportOptions } from "./useMsaExport";

const alignment: MSAResult = {
  alignmentLength: 4,
  jobId: "localized-export",
  sequences: [{ id: "row", rowKey: "row:1", sequence: "ACGT" }],
  truncated: false
};

const viewerState: MsaExportViewerState = {
  alignmentLength: 4,
  colorScheme: "nucleotide",
  conservationColumns: [],
  selectedRange: null,
  sequences: alignment.sequences,
  viewport: null,
  visiblePositions: [1, 2, 3, 4],
  viewSettings: {
    cellGap: 2,
    cellHeight: 24,
    cellWidth: 20,
    fontSize: 11,
    labelWidth: 192,
    markerEvery: 10,
    rowHeight: 36,
    showCharacters: true
  }
};

describe("ExportDialog localization", () => {
  beforeEach(() => window.localStorage.setItem("easymsa.locale", "zh"));
  afterEach(cleanup);

  it("renders a localized safety-limit explanation without accessibility violations", async () => {
    const options = {
      ...createDefaultExportOptions(),
      format: "png" as const,
      maxCanvasPixels: 1,
      region: "fullAlignment" as const
    };
    const layout = calculateExportLayout(alignment, viewerState, options);

    render(
      <LanguageProvider>
        <ExportDialog
          error={null}
          hasSelection={false}
          isExporting={false}
          isOpen
          layout={layout}
          onClose={vi.fn()}
          onExport={vi.fn()}
          onUpdate={vi.fn()}
          options={options}
        />
      </LanguageProvider>
    );

    const message = screen.getByText(/PNG 将创建/).textContent ?? "";
    expect(message).toContain("安全上限");
    expect(message).not.toContain("above the");
    const accessibility = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } }
    });
    expect(accessibility.violations.map((violation) => violation.id)).toEqual([]);
  });

  it("offers publication and presentation presets as first-class actions", () => {
    const options = createDefaultExportOptions();
    const onUpdate = vi.fn();
    const layout = calculateExportLayout(alignment, viewerState, options);
    render(
      <LanguageProvider>
        <ExportDialog
          error={null}
          hasSelection={false}
          isExporting={false}
          isOpen
          layout={layout}
          onClose={vi.fn()}
          onExport={vi.fn()}
          onUpdate={onUpdate}
          options={options}
        />
      </LanguageProvider>
    );

    expect(screen.getByRole("button", { name: /论文矢量 SVG/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /汇报高清 PNG/ }));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      preset: "presentation-png",
      format: "png",
      scale: 3,
      wrapMode: "auto-wrap"
    }));
  });
});
