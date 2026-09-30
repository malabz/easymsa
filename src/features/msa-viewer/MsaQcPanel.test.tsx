import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { MsaQcPanel } from "./MsaQcPanel";
import { DEFAULT_ROW_QC_FILTERS } from "./qcModel";
import { DEFAULT_QC_THRESHOLDS } from "./workspaceSnapshot";

describe("MsaQcPanel", () => {
  beforeEach(() => window.localStorage.setItem("easymsa.locale", "en"));

  it("labels automatic findings as review-only QC candidates accessibly", async () => {
    const onReviewRow = vi.fn();
    const onColumnThresholdsChange = vi.fn();
    const { container } = render(
      <LanguageProvider>
        <MsaQcPanel
        analysisScope="all"
        filteredColumnCount={10}
        filters={DEFAULT_ROW_QC_FILTERS}
        onFiltersChange={() => undefined}
        onColumnThresholdsChange={onColumnThresholdsChange}
        onReviewRow={onReviewRow}
        onSortChange={() => undefined}
        rows={[{
          rowKey: "row-1",
          sequenceId: "sample",
          originalIndex: 0,
          sequenceLength: 10,
          alignmentLength: 10,
          canonicalCount: 4,
          ambiguityCount: 0,
          unknownCount: 0,
          gapCount: 6,
          gapFraction: 0.6,
          coverage: 0.4,
          informativeCoverage: 0.4,
          ambiguityFraction: 0,
          unknownFraction: 0,
          gcFraction: 0.5
        }]}
        scopeRowCount={1}
        sortDirection="asc"
        sortKey="original"
        thresholds={{
          ...DEFAULT_QC_THRESHOLDS,
          row: { ...DEFAULT_QC_THRESHOLDS.row, maxGapFraction: 0.5 }
        }}
        totalColumnCount={10}
        totalRowCount={1}
        />
      </LanguageProvider>
    );
    expect(screen.getByText(/rows are never removed/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: /Gap fraction: 1 observations/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(onReviewRow).toHaveBeenCalledWith("row-1");
    fireEvent.click(screen.getByText(/Custom column filters/));
    fireEvent.change(screen.getByLabelText("Minimum conservation"), {
      target: { value: "0.85" }
    });
    expect(onColumnThresholdsChange).toHaveBeenCalledWith({
      ...DEFAULT_QC_THRESHOLDS.column,
      minConservation: 0.85
    });
    const accessibility = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } }
    });
    expect(accessibility.violations.map((violation) => violation.id)).toEqual([]);
  });
});
