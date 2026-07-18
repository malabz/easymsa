import { describe, expect, it } from "vitest";
import { canvasCellLocation } from "./MsaCanvasMatrix";

describe("canvasCellLocation", () => {
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
});
