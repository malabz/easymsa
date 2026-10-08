import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import type { AlignmentDescriptor, MSAResult } from "../../lib/types/msa";
import { MsaViewerRoot } from "./MsaViewerRoot";

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const canvasContext = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  createImageData: (w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),
  putImageData: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  strokeRect: vi.fn(),
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1
};

function alignment(
  rows: Array<{ id: string; rowKey: string; sequence: string }>,
  descriptor: Partial<AlignmentDescriptor> = {}
): MSAResult {
  const length = rows.reduce((maximum, row) => Math.max(maximum, row.sequence.length), 0);
  return {
    jobId: "viewer-test",
    truncated: false,
    alignmentLength: length,
    sequenceCount: rows.length,
    sequences: rows.map((row, originalIndex) => ({ ...row, originalIndex })),
    descriptor: {
      sourceKey: "sha256:test-viewer-fingerprint",
      sourceKind: "pasted",
      sourceName: "fixture.fasta",
      alphabet: "dna",
      alphabetConfidence: "high",
      alignmentMode: "aligned",
      sequenceCount: rows.length,
      alignmentLength: length,
      observedDimensions: {
        sequenceCount: rows.length,
        alignmentLength: length
      },
      warnings: [],
      ...descriptor
    }
  };
}

function renderViewer(value: MSAResult) {
  return render(
    <LanguageProvider>
      <MsaViewerRoot alignment={value} />
    </LanguageProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("easymsa.locale", "en");
  vi.stubGlobal("Worker", undefined);
  vi.stubGlobal("ResizeObserver", TestResizeObserver);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    canvasContext as unknown as CanvasRenderingContext2D
  );
});

afterEach(() => cleanup());

describe("MsaViewerRoot scientific workspace", () => {
  it("has no detectable accessibility violations in the complete viewer workspace", async () => {
    const { container } = renderViewer(alignment([
      { id: "reference", rowKey: "row:reference", sequence: "ACGT" },
      { id: "sample", rowKey: "row:sample", sequence: "AGGT" }
    ]));

    await waitFor(() => expect(screen.getByText("All rows · 2")).not.toBeNull());
    const accessibility = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } }
    });

    expect(accessibility.violations).toEqual([]);
  });

  it("keeps protein data in neutral browsing mode without nucleotide-only controls", () => {
    renderViewer(alignment([
      { id: "protein-a", rowKey: "row:a", sequence: "MELK" },
      { id: "protein-b", rowKey: "row:b", sequence: "MQLK" }
    ], {
      alphabet: "protein",
      alignmentMode: "neutral"
    }));

    expect(screen.getByText(/Protein-specific residues were detected/)).not.toBeNull();
    expect(screen.queryByRole("combobox", { name: "Analysis scope" })).toBeNull();
    expect(screen.queryByRole("searchbox", { name: "Search DNA\/RNA motif" })).toBeNull();
    expect(screen.queryByText("Set as reference")).toBeNull();
    expect(screen.queryByText("Color legend")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Workspace settings" }));
    expect(screen.queryByText("Export consensus range")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    fireEvent.click(screen.getByRole("button", { name: "Analysis inspector" }));
    expect(screen.queryByText(/^Reference$/)).toBeNull();
    expect(screen.queryByText("Reference position")).toBeNull();

    fireEvent.click(document.querySelector(".msa-export-menu summary")!);
    fireEvent.click(screen.getByRole("button", { name: "Export / QC bundle" }));
    expect(screen.queryByLabelText("Active analysis tracks")).toBeNull();
    expect(screen.queryByLabelText("Consensus")).toBeNull();
    expect(screen.queryByLabelText("Color legend")).toBeNull();
  });

  it("reports duplicate headers while keeping content-derived row identities", async () => {
    renderViewer(alignment([
      { id: "duplicate", rowKey: "row:first", sequence: "ACGT" },
      { id: "duplicate", rowKey: "row:second", sequence: "AGGT" }
    ], { warnings: ["duplicate_headers"] }));

    expect(screen.getByText(/Duplicate headers detected/)).not.toBeNull();
    await waitFor(() => expect(screen.getByText("All rows · 2")).not.toBeNull());
  });

  it("enters and exits the CSS immersive workspace without the Fullscreen API", () => {
    renderViewer(alignment([
      { id: "a", rowKey: "row:a", sequence: "ACGT" },
      { id: "b", rowKey: "row:b", sequence: "AGGT" }
    ]));
    const shell = document.querySelector("[data-msa-workspace-shell='true']") as HTMLElement;
    expect(shell.getAttribute("data-msa-workspace-mode")).toBe("embedded");

    fireEvent.click(screen.getByRole("button", { name: "Full screen" }));
    expect(shell.getAttribute("data-msa-workspace-mode")).toBe("immersive");
    fireEvent.click(screen.getAllByRole("button", { name: "Exit full screen" })[0]);
    expect(shell.getAttribute("data-msa-workspace-mode")).toBe("embedded");
  });

  it("shows a readable consensus label in the analysis panel", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(600);
    renderViewer(alignment([
      { id: "a", rowKey: "row:a", sequence: "ACGT" },
      { id: "b", rowKey: "row:b", sequence: "AGGT" }
    ]));
    await waitFor(() => expect(document.querySelector('[data-msa-row-key="easymsa:consensus"][data-msa-sequence-cell]')).not.toBeNull());
    fireEvent.click(document.querySelector('[data-msa-row-key="easymsa:consensus"][data-msa-sequence-cell]')!);
    fireEvent.click(screen.getByRole("button", { name: "Analysis inspector" }));
    const inspector = document.querySelector('[data-msa-workspace-dock]');
    expect(inspector?.textContent).toContain("Consensus");
    expect(inspector?.textContent).not.toContain("easymsa:consensus");
  });
});
