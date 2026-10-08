import { calculateMsaAnalysisStore } from "../msa-viewer/analysis";
import { describe, expect, it } from "vitest";
import type { MSAResult } from "../../lib/types/msa";
import { calculateExportLayout } from "./exportLayout";
import { renderMsaExportToSvg } from "./exportSvgRenderer";
import type { MsaExportLabels, MsaExportOptions, MsaExportViewerState } from "./exportTypes";

const alignment: MSAResult = {
  jobId: "svg",
  truncated: false,
  sequences: [
    { id: "seq<1>", sequence: "ACGT" },
    { id: "seq2", sequence: "A-GT" }
  ],
  consensus: "ACGT",
  alignmentLength: 4
};

const options: MsaExportOptions = {
  format: "svg",
  region: "full",
  layoutMode: "single-line",
  includeSequenceNames: true,
  includeCoordinates: true,
  includeConsensus: true,
  includeConservation: true,
  includeLegend: true,
  includeAnnotations: false,
  scale: 2,
  backgroundColor: "#ffffff",
  transparentBackground: false,
  filename: "svg",
  wrapColumnCount: 120,
  maxCanvasPixels: 80_000_000
};

const state: MsaExportViewerState = {
  sequences: alignment.sequences,
  visiblePositions: [1, 2, 3, 4],
  conservationColumns: [1, 2, 3, 4].map((position) => ({
    position,
    conservation: 1,
    gapFraction: 0,
    dominantBase: "A"
  })),
  colorScheme: "nucleotide",
  selectedRange: null,
  viewSettings: {
    cellWidth: 20,
    cellHeight: 24,
    rowHeight: 36,
    fontSize: 11,
    labelWidth: 192,
    markerEvery: 10,
    showCharacters: true,
    cellGap: 2
  },
  viewport: null,
  alignmentLength: 4
};

const labels: MsaExportLabels = {
  position: "Position",
  conservation: "Conservation",
  consensus: "Consensus",
  legend: "Legend",
  dominant: "Dominant",
  variant: "Variant",
  gapEmpty: "Gap",
  referencePosition: "Reference coordinate",
  tracks: {
    conservation: "Conservation",
    gap: "Gap fraction",
    coverage: "Coverage",
    entropy: "Shannon entropy"
  },
  differences: {
    match: "Match",
    compatibleAmbiguity: "Compatible ambiguity",
    substitution: "Substitution",
    mismatch: "Substitution",
    insertion: "Insertion",
    deletion: "Deletion",
    unknown: "Unknown"
  }
};

describe("renderMsaExportToSvg", () => {
  it("renders a standalone SVG with cells, text, and escaped labels", () => {
    const layout = calculateExportLayout(alignment, state, options);
    const svg = renderMsaExportToSvg(layout, labels);

    expect(svg).toContain("<svg");
    expect(svg).toContain("<title>EasyMSA MSA export:");
    expect(svg).toContain("<desc>");
    expect(svg).toContain('id="easymsa-export-metadata"');
    expect(svg).toContain("easymsa-msa-export/v1");
    expect(svg).toContain("viewBox=");
    expect(svg).toContain("<rect");
    expect(svg).toContain("<text");
    expect(svg).toContain("seq&lt;1&gt;");
    expect(svg).toContain("Legend");
  });

  it("exports active tracks, reference coordinates, and difference colors", () => {
    const layout = calculateExportLayout(
      alignment,
      {
        ...state,
        activeTracks: ["gap", "entropy"],
        coordinateMode: "reference",
        differenceMode: true,
        referenceSequenceId: "seq<1>"
      },
      options
    );
    const svg = renderMsaExportToSvg(layout, labels);

    expect(svg).toContain("Gap fraction");
    expect(svg).toContain("Shannon entropy");
    expect(svg).toContain("Reference coordinate");
    expect(svg).toContain("#ffedd5");
  });

  it("clips long labels, marks coordinate discontinuities, and identifies duplicate headers by rowKey", () => {
    const duplicateAlignment: MSAResult = {
      ...alignment,
      sequences: [
        { id: "duplicate-header-with-a-very-long-name", rowKey: "row:first", sequence: "ACGT" },
        { id: "duplicate-header-with-a-very-long-name", rowKey: "row:second", sequence: "A-GT" }
      ]
    };
    const layout = calculateExportLayout(
      duplicateAlignment,
      {
        ...state,
        sequences: duplicateAlignment.sequences,
        visiblePositions: [1, 3, 4],
        referenceRowKey: "row:second"
      },
      { ...options, region: "filteredView" }
    );
    const svg = renderMsaExportToSvg(layout, labels);

    expect(svg).toContain("<clipPath");
    expect(svg).toContain("stroke-linecap=\"round\"");
    expect(svg.match(/#fffbeb/g)).toHaveLength(1);
    expect(svg).toContain("font-variant-ligatures:none");
  });
});

it('exports the frequency logo with true counts and an explicit switch',()=>{
  const columnStore=calculateMsaAnalysisStore(alignment.sequences,4,{alphabet:'dna'}).columnStore;
  const enabled=calculateExportLayout(alignment,{...state,columnStore},{...options,includeLogo:true});
  const disabled=calculateExportLayout(alignment,{...state,columnStore},{...options,includeLogo:false});
  expect(enabled.height-disabled.height).toBe(48);
  expect(enabled.columns[1].logo).toMatchObject([{base:'C',frequency:.5}]);
  const svg=renderMsaExportToSvg(enabled,labels);
  expect(svg).toContain('Logo · 0–100%');expect(svg).toContain('preserveAspectRatio="none"');
  expect(renderMsaExportToSvg(disabled,labels)).not.toContain('Logo · 0–100%');
});


it("keeps conservation display scale in SVG, PNG and manifest while TSV retains raw values", async () => {
  const {buildColumnsTsv, buildMsaExportManifestV1}=await import('./exportManifest');
  const {renderMsaExportToCanvas}=await import('./exportCanvasRenderer');
  const {vi}=await import('vitest');
  const exportState={...state,viewSettings:{...state.viewSettings,conservationScale:'high' as const},
    conservationColumns:state.conservationColumns!.map((column,index)=>({...column,conservation:[1,.95,.75,null][index]}))};
  const layout=calculateExportLayout(alignment,exportState,{...options,includeLegend:false});
  const svg=renderMsaExportToSvg(layout,labels);
  const document=new DOMParser().parseFromString(svg,'image/svg+xml');
  const bars=Array.from(document.querySelectorAll('g')).filter(group=>/^Conservation \d+:/.test(group.querySelector(':scope > title')?.textContent??''));
  expect(bars.map(group=>Number(group.querySelector('rect')!.getAttribute('height')))).toEqual([24,18,3,0]);
  expect(bars[1].querySelector('title')!.textContent).toContain('95%');
  expect(bars[2].querySelector('rect')!.getAttribute('fill')).toBe('#d97706');
  expect(svg).toContain('80–100%');
  expect(buildColumnsTsv(layout)).toContain('0.95');
  const manifest=buildMsaExportManifestV1({alignment,state:exportState,layout,generatedAt:'2026-10-08T00:00:00Z'});
  expect(manifest.view.conservationDisplay).toEqual({mode:'high',range:[.8,1],belowRange:'amber-marker'});
  const calls:Array<{color:unknown;height:number}>=[];
  const texts:string[]=[];
  const ctx=new Proxy({fillStyle:''}, {get(target,key){
    if(key==='fillStyle')return target.fillStyle;
    if(key==='fillRect')return (_x:number,_y:number,_w:number,height:number)=>calls.push({color:target.fillStyle,height});
    if(key==='fillText')return (value:string)=>texts.push(value);
    return ()=>undefined;
  },set(target,key,value){if(key==='fillStyle')target.fillStyle=value;return true;}});
  const context=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  try {
    renderMsaExportToCanvas(layout,labels);
    expect(calls.filter(call=>call.color==='#0f766e').map(call=>call.height)).toEqual([24,18,0]);
    expect(calls.filter(call=>call.color==='#d97706').map(call=>call.height)).toEqual([3]);
    expect(texts).toContain('80–100%');
  } finally {context.mockRestore();}
});
