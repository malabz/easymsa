import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import type { MSAResult } from "../../lib/types/msa";
import type { ResultSummary } from "../../lib/types/result";
import { ResultOverview, sequenceRetentionFraction } from "./ResultOverview";

const summary: ResultSummary = {
  jobId: "job-overview",
  metrics: {
    sequenceCount: 2,
    alignmentLength: 4,
    averageIdentity: null,
    gapPercentage: 12.5
  },
  preprocess: {
    mode: "filter",
    strictness: "normal",
    rawSequenceCount: 4,
    cleanSequenceCount: 2,
    removedSequenceCount: 2
  },
  outputFiles: [
    "preprocess/result.json",
    "output/alignment.fasta",
    "logs/run.log"
  ]
};

const alignment: MSAResult = {
  jobId: "job-overview",
  truncated: false,
  sequenceCount: 2,
  alignmentLength: 4,
  consensus: "ACGT",
  sequences: [
    { id: "reference", sequence: "ACGU" },
    { id: "sample", sequence: "A-GT" }
  ]
};

const canvasContext = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  fillStyle: "",
  strokeStyle: ""
};

function renderOverview(
  props: Partial<ComponentProps<typeof ResultOverview>> = {}
) {
  const onOpenAlignment = vi.fn();
  const onOpenDownloads = vi.fn();
  const result = render(
    <LanguageProvider>
      <ResultOverview
        alignment={alignment}
        alignmentError={null}
        alignmentPending={false}
        onOpenAlignment={onOpenAlignment}
        onOpenDownloads={onOpenDownloads}
        summary={summary}
        {...props}
      />
    </LanguageProvider>
  );
  return { ...result, onOpenAlignment, onOpenDownloads };
}

describe("ResultOverview", () => {
  beforeEach(() => {
    window.localStorage.setItem("easymsa.locale", "en");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      canvasContext as unknown as CanvasRenderingContext2D
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("calculates sequence retention safely", () => {
    expect(sequenceRetentionFraction(10, 8)).toBe(0.8);
    expect(sequenceRetentionFraction(0, 0)).toBeNull();
    expect(sequenceRetentionFraction(null, 8)).toBeNull();
  });

  it("renders the complete scientific dashboard and navigation actions", async () => {
    const { container, onOpenAlignment, onOpenDownloads } = renderOverview();

    expect(screen.getByRole("heading", { name: "Scientific alignment overview" })).toBeInTheDocument();
    expect(screen.getByText("preprocess/result.json")).toBeInTheDocument();
    expect(screen.getByText("output/alignment.fasta")).toBeInTheDocument();
    expect(screen.queryByText("Average identity")).not.toBeInTheDocument();

    const chart = await screen.findByRole("img", {
      name: "Full-length conservation, gap fraction, and Shannon entropy tracks"
    });
    expect(chart).toHaveAccessibleDescription(/all 4 alignment positions/);

    fireEvent.click(screen.getByRole("button", { name: "Open alignment matrix" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Download results" })[0]);
    expect(onOpenAlignment).toHaveBeenCalledOnce();
    expect(onOpenDownloads).toHaveBeenCalledOnce();

    const accessibility = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } }
    });
    expect(accessibility.violations.map((violation) => violation.id)).toEqual([]);
  });

  it("keeps summary content when the alignment preview is truncated", () => {
    renderOverview({
      alignment: {
        ...alignment,
        truncated: true,
        message: "too large",
        sequences: []
      }
    });

    expect(screen.getByText("Preprocessing overview")).toBeInTheDocument();
    expect(screen.getByText(/exceeds the current preview limits/)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows independent loading and error states for scientific analysis", async () => {
    const { rerender } = renderOverview({ alignment: undefined, alignmentPending: true });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Calculating alignment quality statistics in the background"
    );

    rerender(
      <LanguageProvider>
        <ResultOverview
          alignmentError="preview failed"
          alignmentPending={false}
          onOpenAlignment={() => {}}
          onOpenDownloads={() => {}}
          summary={summary}
        />
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/preview could not be loaded/)).toBeInTheDocument();
    });
    expect(screen.getByText("Output artifacts")).toBeInTheDocument();
  });
});
