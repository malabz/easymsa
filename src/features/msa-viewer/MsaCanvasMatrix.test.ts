import { createElement, createRef, StrictMode } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateColumnStats } from "./analysis";
import { canvasCellLocation, MsaCanvasMatrix } from "./MsaCanvasMatrix";

class TestResizeObserver {
  observe() {}
  disconnect() {}
}

function dispatchPointer(
  element: Element,
  type: "pointerdown" | "pointermove" | "pointerup",
  values: {
    buttons?: number;
    clientX: number;
    clientY: number;
    pointerId: number;
    pointerType: "mouse" | "touch";
  }
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    buttons: { value: values.buttons ?? (type === "pointerup" ? 0 : 1) },
    clientX: { value: values.clientX },
    clientY: { value: values.clientY },
    pointerId: { value: values.pointerId },
    pointerType: { value: values.pointerType }
  });
  fireEvent(element, event);
}

function renderCanvas({ rangeSelectionMode = false, strictEffects = false } = {}) {
  const onRangeSelect = vi.fn();
  const onSelect = vi.fn();
  const scrollRef = createRef<HTMLDivElement>();
  const viewportRef = createRef<HTMLDivElement>();
  const sequences = [
    { id: "same header", originalIndex: 0, rowKey: "row:first", sequence: "AC" },
    { id: "same header", originalIndex: 1, rowKey: "row:second", sequence: "GT" }
  ];
  const settings = {
    cellWidth: 20,
    cellHeight: 20,
    rowHeight: 24,
    fontSize: 10,
    labelWidth: 104,
    markerEvery: 10,
    showCharacters: false,
    cellGap: 0
  };
  const stats = calculateColumnStats(sequences, 2);
  const tree = createElement(
    "div",
    { ref: viewportRef },
    createElement(
      "div",
      { ref: scrollRef, tabIndex: 0 },
      createElement(MsaCanvasMatrix, {
        colorScheme: "nucleotide",
        columns: stats,
        differenceMode: false,
        headerHeight: 0,
        motifPositionMap: new Map([["row:second", new Set([1])]]),
        onNavigate: () => {},
        onRangeSelect,
        onSelect,
        rangeSelectionMode,
        reference: null,
        scrollRef,
        selectedRange: null,
        selection: null,
        sequences,
        settings,
        viewportRef,
        visiblePositions: [1, 2]
      })
    )
  );
  const result = render(strictEffects ? createElement(StrictMode, null, tree) : tree);
  return {
    ...result,
    canvas: result.container.querySelector("canvas")!,
    onRangeSelect,
    onSelect,
    scrollRef
  };
}

describe("canvasCellLocation", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: 116, height: 116, left: 0, right: 220, top: 0,
      width: 220, x: 0, y: 0, toJSON: () => ({})
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
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

  it("schedules a replacement draw after cancelling a pending frame", () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.mocked(window.requestAnimationFrame).mockImplementation((callback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    const { canvas } = renderCanvas({ strictEffects: true });
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(callbacks).toHaveLength(2);
    act(() => callbacks[1](0));
    expect(canvas.style.width).toBe("100px");
    expect(canvas.style.height).toBe("100px");
  });

  it("keeps CSS viewport dimensions independent from the high-DPI buffer", () => {
    const previousRatio = window.devicePixelRatio;
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 2 });
    try {
      const { canvas } = renderCanvas();
      expect(canvas.style.width).toBe("100px");
      expect(canvas.style.height).toBe("100px");
      expect(canvas.width).toBe(200);
      expect(canvas.height).toBe(200);
    } finally {
      Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: previousRatio });
    }
  });

  it("maps viewport pointer coordinates into virtual rows and columns", () => {
    const location = canvasCellLocation({
      clientX: 144,
      clientY: 90,
      canvasLeft: 100,
      canvasTop: 50,
      scrollLeft: 44,
      scrollTop: 36,
      settings: {
        cellWidth: 20,
        cellHeight: 24,
        rowHeight: 36,
        fontSize: 11,
        labelWidth: 192,
        markerEvery: 10,
        showCharacters: true,
        cellGap: 2
      },
      visiblePositions: [10, 20, 30, 40, 50],
      sequenceCount: 5
    });
    expect(location).toEqual({ rowIndex: 2, columnIndex: 3, position: 40 });
  });

  it("selects duplicate display headers by internal rowKey and is not a tab stop", () => {
    const { canvas, onSelect } = renderCanvas();
    expect(canvas.tabIndex).toBe(-1);
    expect(canvas.getAttribute("role")).toBe("presentation");
    expect(canvas.getAttribute("aria-hidden")).toBe("true");

    dispatchPointer(canvas, "pointerdown", {
      clientX: 13,
      clientY: 25,
      pointerId: 1,
      pointerType: "mouse"
    });
    expect(onSelect).toHaveBeenCalledWith({
      rowKey: "row:second",
      position: 1
    });
  });

  it("treats default touch drag as pan while a touch tap selects", () => {
    const { canvas, onRangeSelect, onSelect, scrollRef } = renderCanvas();
    dispatchPointer(canvas, "pointerdown", {
      clientX: 33,
      clientY: 1,
      pointerId: 2,
      pointerType: "touch"
    });
    dispatchPointer(canvas, "pointermove", {
      clientX: 13,
      clientY: 1,
      pointerId: 2,
      pointerType: "touch"
    });
    dispatchPointer(canvas, "pointerup", {
      clientX: 13,
      clientY: 1,
      pointerId: 2,
      pointerType: "touch"
    });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onRangeSelect).not.toHaveBeenCalled();
    expect(scrollRef.current?.scrollLeft).toBe(20);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;

    dispatchPointer(canvas, "pointerdown", {
      clientX: 13,
      clientY: 1,
      pointerId: 3,
      pointerType: "touch"
    });
    dispatchPointer(canvas, "pointerup", {
      clientX: 13,
      clientY: 1,
      pointerId: 3,
      pointerType: "touch"
    });
    expect(onSelect).toHaveBeenCalledWith({
      rowKey: "row:first",
      position: 1
    });
    expect(canvas.style.touchAction).toBe("none");
  });

  it("enables touch range gestures only in explicit range mode", () => {
    const { canvas, onRangeSelect, onSelect } = renderCanvas({
      rangeSelectionMode: true
    });
    dispatchPointer(canvas, "pointerdown", {
      clientX: 13,
      clientY: 1,
      pointerId: 4,
      pointerType: "touch"
    });
    dispatchPointer(canvas, "pointermove", {
      clientX: 33,
      clientY: 1,
      pointerId: 4,
      pointerType: "touch"
    });
    expect(onSelect).toHaveBeenCalledWith({
      rowKey: "row:first",
      position: 1
    });
    expect(onRangeSelect).toHaveBeenCalledWith("row:first", 1, 2);
    expect(canvas.style.touchAction).toBe("none");
  });
});
