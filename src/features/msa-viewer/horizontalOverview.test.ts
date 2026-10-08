import {describe, expect, it} from "vitest";
import {horizontalOverviewGeometry, overviewClickScroll, overviewDragScroll} from "./horizontalOverviewGeometry";
import {calculateMinimap} from "./minimapData";
import {filteredColumnPositionView, identityColumnPositionView} from "./columnStatsStore";

describe("horizontal overview navigation", () => {
  it("accounts for the frozen name column and reaches both ends of the data", () => {
    const options = {columnCount: 1000, pitch: 14, viewportWidth: 900, labelOffset: 216, trackWidth: 600};
    const start = horizontalOverviewGeometry({...options, scrollLeft: 0});
    const end = horizontalOverviewGeometry({...options, scrollLeft: 20000});
    expect(start.firstIndex).toBe(0);
    expect(start.lastIndex).toBe(48);
    expect(start.maxScroll).toBe(13316);
    expect(end.lastIndex).toBe(999);
    expect(end.thumbLeft + end.thumbWidth).toBeCloseTo(600);
    expect(overviewClickScroll(0, start.thumbWidth, start.travel, start.maxScroll)).toBe(0);
    expect(overviewClickScroll(600, start.thumbWidth, start.travel, start.maxScroll)).toBe(start.maxScroll);
  });

  it("keeps a usable thumb for long alignments without changing drag endpoints", () => {
    const geometry = horizontalOverviewGeometry({columnCount: 100000, pitch: 14, viewportWidth: 900, labelOffset: 216, trackWidth: 600, scrollLeft: 5000});
    expect(geometry.thumbWidth).toBe(24);
    expect(overviewDragScroll(5000, 0, geometry.travel, geometry.maxScroll)).toBe(5000);
    expect(overviewDragScroll(0, geometry.travel, geometry.travel, geometry.maxScroll)).toBe(geometry.maxScroll);
    expect(overviewDragScroll(geometry.maxScroll, -geometry.travel, geometry.travel, geometry.maxScroll)).toBe(0);
  });

  it("does not scroll when all columns already fit", () => {
    const geometry = horizontalOverviewGeometry({columnCount: 10, pitch: 14, viewportWidth: 900, labelOffset: 216, trackWidth: 600, scrollLeft: 200});
    expect(geometry.maxScroll).toBe(0);
    expect(geometry.thumbWidth).toBe(600);
    expect(geometry.offset).toBe(0);
    expect(overviewDragScroll(0, 100, geometry.travel, geometry.maxScroll)).toBe(0);
  });

  it("renders actual filtered columns and bounds horizontal overview memory", () => {
    const image = calculateMinimap({rows: [{id:"one",sequence:"ACGT"}], positions: filteredColumnPositionView([2,4]), scheme:"nucleotide",store:null,layout:"horizontal",width:2048,height:18});
    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(Array.from(image.pixels)).toEqual([224,242,254,255,255,228,230,255]);
    const bounded = calculateMinimap({rows:Array.from({length:30},(_,i)=>({id:String(i),sequence:"A".repeat(3000)})),positions:identityColumnPositionView(3000),scheme:"nucleotide",store:null,layout:"horizontal",width:9000,height:9000});
    expect([bounded.width,bounded.height]).toEqual([2048,24]);
    const vertical = calculateMinimap({rows:[{id:"one",sequence:"A".repeat(100)}],positions:identityColumnPositionView(100),scheme:"nucleotide",store:null,width:9000,height:9000});
    expect(vertical.width).toBe(88);
  });
});
