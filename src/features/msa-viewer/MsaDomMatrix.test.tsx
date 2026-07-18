import { createRef } from "react";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { calculateColumnStats } from "./analysis";
import { MsaDomMatrix } from "./MsaDomMatrix";
import { getMsaViewSettings } from "./MsaViewerRoot";

class TestResizeObserver {
  observe() {}
  disconnect() {}
}

describe("MsaDomMatrix hybrid rendering", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      setTransform: vi.fn(),
      strokeRect: vi.fn()
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses one Canvas and creates no per-cell DOM at low zoom", () => {
    const sequences = Array.from({ length: 500 }, (_, index) => ({
      id: `sequence-${index + 1}`,
      sequence: "ACGT".repeat(25)
    }));
    const stats = calculateColumnStats(sequences, 100);
    const { container } = render(
      <LanguageProvider>
        <MsaDomMatrix
          activeTracks={["conservation", "gap"]}
          alignmentLength={100}
          colorScheme="nucleotide"
          consensus={stats.map((column) => column.consensusBase).join("")}
          coordinateMode="alignment"
          differenceMode={false}
          motifPositionMap={new Map()}
          onHideSequence={() => {}}
          onNavigate={() => {}}
          onPinSequence={() => {}}
          onRangeSelect={() => {}}
          onSelect={() => {}}
          onSelectSequence={() => {}}
          onSetReference={() => {}}
          pinnedSequenceIds={new Set()}
          reference={null}
          scrollRef={createRef<HTMLDivElement>()}
          selectedRange={null}
          selectedSequenceIds={new Set()}
          selection={null}
          sequences={sequences}
          settings={getMsaViewSettings(0.5, "compact")}
          stats={stats}
          visiblePositions={stats.map((column) => column.position)}
        />
      </LanguageProvider>
    );

    expect(container.querySelectorAll("canvas[data-msa-canvas='true']")).toHaveLength(1);
    expect(container.querySelectorAll("[data-msa-sequence-cell='true']")).toHaveLength(0);
  });
});
