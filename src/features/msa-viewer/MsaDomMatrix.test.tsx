import { createRef } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { calculateColumnStats } from "./analysis";
import {
  matrixNavigationDelta,
  matrixSequenceRowKey,
  MsaDomMatrix
} from "./MsaDomMatrix";
import type { MsaViewSettings } from "./types";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => {
    const size = estimateSize();
    const items = Array.from({ length: count }, (_, index) => ({
      end: (index + 1) * size,
      index,
      key: index,
      lane: 0,
      size,
      start: index * size
    }));
    return {
      getTotalSize: () => count * size,
      getVirtualItems: () => items,
      measure: () => undefined,
      measureElement: () => undefined
    };
  }
}));

class TestResizeObserver {
  observe() {}
  disconnect() {}
}

function testViewSettings(showCharacters: boolean): MsaViewSettings {
  return {
    cellGap: showCharacters ? 2 : 0,
    cellHeight: showCharacters ? 24 : 6,
    cellWidth: showCharacters ? 20 : 6,
    fontSize: showCharacters ? 11 : 9,
    labelWidth: showCharacters ? 192 : 128,
    markerEvery: showCharacters ? 10 : 50,
    rowHeight: showCharacters ? 38 : 8,
    showCharacters
  };
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
    Object.defineProperties(HTMLCanvasElement.prototype, {
      hasPointerCapture: {
        configurable: true,
        value: vi.fn(() => true)
      },
      releasePointerCapture: {
        configurable: true,
        value: vi.fn()
      },
      setPointerCapture: {
        configurable: true,
        value: vi.fn()
      }
    });
  });

  afterEach(() => {
    cleanup();
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
          settings={testViewSettings(false)}
          stats={stats}
          visiblePositions={stats.map((column) => column.position)}
        />
      </LanguageProvider>
    );

    expect(container.querySelectorAll("canvas[data-msa-canvas='true']")).toHaveLength(1);
    expect(container.querySelectorAll("[data-msa-sequence-cell='true']")).toHaveLength(0);
    const grid = container.querySelector<HTMLElement>("[role='grid']");
    const canvas = container.querySelector<HTMLCanvasElement>("canvas");
    expect(grid?.tabIndex).toBe(0);
    expect(grid?.getAttribute("aria-rowcount")).toBe("503");
    expect(grid?.getAttribute("aria-colcount")).toBe("101");
    expect(grid?.querySelectorAll("button:not([tabindex='-1']), summary:not([tabindex='-1']), [tabindex='0']")).toHaveLength(0);
    expect(canvas?.tabIndex).toBe(-1);
    expect(canvas?.getAttribute("role")).toBe("presentation");
  });

  it("keeps duplicate display headers independently addressable by rowKey", () => {
    const onHideSequence = vi.fn();
    const onPinSequence = vi.fn();
    const onSelect = vi.fn();
    const onSelectSequence = vi.fn();
    const onSetReference = vi.fn();
    const sequences = [
      { id: "duplicate header", rowKey: "source:row:1", originalIndex: 0, sequence: "AC" },
      { id: "duplicate header", rowKey: "source:row:2", originalIndex: 1, sequence: "GT" }
    ];
    const stats = calculateColumnStats(sequences, 2);
    const { container, getAllByLabelText } = render(
      <LanguageProvider>
        <MsaDomMatrix
          activeTracks={[]}
          alignmentLength={2}
          colorScheme="nucleotide"
          consensus="AC"
          coordinateMode="alignment"
          differenceMode={false}
          motifPositionMap={new Map([["source:row:2", new Set([1])]])}
          onHideSequence={onHideSequence}
          onNavigate={() => {}}
          onPinSequence={onPinSequence}
          onRangeSelect={() => {}}
          onSelect={onSelect}
          onSelectSequence={onSelectSequence}
          onSetReference={onSetReference}
          pinnedSequenceIds={new Set(["source:row:2"])}
          reference={sequences[1]}
          scrollRef={createRef<HTMLDivElement>()}
          selectedRange={null}
          selectedSequenceIds={new Set(["source:row:2"])}
          selection={null}
          sequences={sequences}
          settings={testViewSettings(true)}
          stats={stats}
          visiblePositions={[1, 2]}
        />
      </LanguageProvider>
    );

    const rows = container.querySelectorAll<HTMLElement>(
      "[role='row'][data-msa-row-key]"
    );
    expect(Array.from(rows, (row) => row.dataset.msaRowKey)).toEqual([
      "source:row:1",
      "source:row:2"
    ]);

    const selectButtons = getAllByLabelText(/Select sequence duplicate header/i);
    expect(selectButtons[0].getAttribute("aria-pressed")).toBe("false");
    expect(selectButtons[1].getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(selectButtons[0]);
    expect(onSelectSequence).toHaveBeenCalledWith("source:row:1");

    fireEvent.click(getAllByLabelText("duplicate header row actions")[0]);
    fireEvent.click(document.querySelector<HTMLElement>("[role=menuitemcheckbox]:nth-child(2)")!);
    expect(onPinSequence).toHaveBeenCalledWith("source:row:1");
    fireEvent.click(getAllByLabelText("duplicate header row actions")[0]);
    fireEvent.click(document.querySelector<HTMLElement>("[role=menuitemcheckbox]:nth-child(3)")!);
    expect(onSetReference).toHaveBeenCalledWith("source:row:1");
    fireEvent.click(getAllByLabelText("duplicate header row actions")[0]);
    fireEvent.click(document.querySelector<HTMLElement>("[role=menuitemcheckbox]:nth-child(4)")!);
    expect(onHideSequence).toHaveBeenCalledWith("source:row:1");

    const secondRowFirstCell = container.querySelector<HTMLElement>(
      "[data-msa-row-key='source:row:2'] [data-msa-sequence-cell='true']"
    );
    expect(secondRowFirstCell?.className).toContain("ring-amber-500");
    fireEvent.click(secondRowFirstCell!);
    expect(onSelect).toHaveBeenCalledWith(
      {
        rowKey: "source:row:2",
        position: 1
      },
      false
    );
    expect(
      Array.from(container.querySelectorAll<HTMLElement>("[data-msa-cell='true']")).every(
        (cell) => cell.tabIndex === -1
      )
    ).toBe(true);
  });

  it("dispatches complete grid navigation through the single grid entry", () => {
    const onNavigate = vi.fn();
    const sequences = [{ id: "row", rowKey: "row-key", sequence: "ACGT" }];
    const stats = calculateColumnStats(sequences, 4);
    const { getByRole } = render(
      <LanguageProvider>
        <MsaDomMatrix
          activeTracks={[]}
          alignmentLength={4}
          colorScheme="nucleotide"
          consensus="ACGT"
          coordinateMode="alignment"
          differenceMode={false}
          motifPositionMap={new Map()}
          onHideSequence={() => {}}
          onNavigate={onNavigate}
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
          selection={{ rowKey: "row-key", position: 2 }}
          sequences={sequences}
          settings={testViewSettings(true)}
          stats={stats}
          visiblePositions={[1, 2, 3, 4]}
        />
      </LanguageProvider>
    );
    const grid = getByRole("grid");
    Object.defineProperty(grid, "clientHeight", { configurable: true, value: 200 });

    fireEvent.keyDown(grid, { key: "Home" });
    fireEvent.keyDown(grid, { key: "End", shiftKey: true });
    fireEvent.keyDown(grid, { key: "PageUp" });
    fireEvent.keyDown(grid, { key: "PageDown", shiftKey: true });

    expect(onNavigate.mock.calls[0]).toEqual([0, -4, false]);
    expect(onNavigate.mock.calls[1]).toEqual([0, 4, true]);
    expect(onNavigate.mock.calls[2]).toEqual([-4, 0, false]);
    expect(onNavigate.mock.calls[3]).toEqual([4, 0, true]);
    expect(grid.getAttribute("aria-activedescendant")).toBeTruthy();
    expect(
      document.getElementById(grid.getAttribute("aria-activedescendant") ?? "")?.textContent
    ).toContain("row; Position 2; C");
  });

  it("removes reference actions when scientific analysis is unavailable", () => {
    const sequences = [{ id: "neutral-row", rowKey: "row:neutral", sequence: "MELK" }];
    const stats = calculateColumnStats(sequences, 4);
    const { queryByLabelText, queryByText } = render(
      <LanguageProvider>
        <MsaDomMatrix
          activeTracks={[]}
          alignmentLength={4}
          colorScheme="nucleotide"
          consensus=""
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
          referenceActionsEnabled={false}
          scrollRef={createRef<HTMLDivElement>()}
          selectedRange={null}
          selectedSequenceIds={new Set()}
          selection={null}
          sequences={sequences}
          settings={testViewSettings(true)}
          showConsensus={false}
          stats={stats}
          visiblePositions={[1, 2, 3, 4]}
        />
      </LanguageProvider>
    );

    expect(queryByLabelText(/Set as reference neutral-row/i)).toBeNull();
    expect(queryByText("Set as reference")).toBeNull();
  });

  it("uses the 44px row action menu at every coarse-pointer breakpoint", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
      matches: query === "(any-pointer: coarse)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })));
    const sequences = [{ id: "touch-row", rowKey: "row:touch", sequence: "AC" }];
    const stats = calculateColumnStats(sequences, 2);
    const { container, getByLabelText, queryByLabelText } = render(
      <LanguageProvider>
        <MsaDomMatrix
          activeTracks={[]}
          alignmentLength={2}
          colorScheme="nucleotide"
          consensus="AC"
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
          settings={testViewSettings(true)}
          stats={stats}
          visiblePositions={[1, 2]}
        />
      </LanguageProvider>
    );

    expect(queryByLabelText("Select sequence touch-row")).toBeNull();
    const menu = getByLabelText("touch-row row actions");
    expect(menu.className).toContain("msa-row-menu-trigger");
    expect(menu.getAttribute("aria-haspopup")).toBe("menu");
  });

  it("renders stable interbase labels for reference-gap columns", () => {
    const reference = {
      id: "reference",
      originalIndex: 0,
      rowKey: "reference-row",
      sequence: "A--C"
    };
    const stats = calculateColumnStats([reference], 4);
    const { getByText } = render(
      <LanguageProvider>
        <MsaDomMatrix
          activeTracks={[]}
          alignmentLength={4}
          colorScheme="nucleotide"
          consensus="A--C"
          coordinateMode="reference"
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
          reference={reference}
          scrollRef={createRef<HTMLDivElement>()}
          selectedRange={null}
          selectedSequenceIds={new Set()}
          selection={null}
          sequences={[reference]}
          settings={testViewSettings(true)}
          stats={stats}
          visiblePositions={[1, 2, 3, 4]}
        />
      </LanguageProvider>
    );
    expect(getByText("1+1").textContent).toBe("1+1");
    expect(getByText("1+2").textContent).toBe("1+2");
  });
});

describe("matrix identity and navigation helpers", () => {
  it("generates distinct legacy row keys for duplicate headers", () => {
    const sequence = { id: "duplicate", sequence: "AC" };
    expect(matrixSequenceRowKey(sequence, 0)).not.toBe(
      matrixSequenceRowKey(sequence, 1)
    );
  });

  it("maps paging and boundary keys without changing scientific coordinates", () => {
    expect(
      matrixNavigationDelta({ key: "PageDown", pageRows: 7, visibleColumnCount: 10 })
    ).toEqual({ row: 7, column: 0 });
    expect(
      matrixNavigationDelta({ key: "End", pageRows: 7, visibleColumnCount: 10 })
    ).toEqual({ row: 0, column: 10 });
    expect(
      matrixNavigationDelta({ key: "Enter", pageRows: 7, visibleColumnCount: 10 })
    ).toBeNull();
  });
});
