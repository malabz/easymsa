import { describe, expect, it } from "vitest";
import { identityColumnPositionView } from "./columnStatsStore";
import { matchesSequenceName, parseViewerPosition, resolveSequenceExport, sequenceExportText, validateThreshold, type SequenceExportSnapshot } from "./viewerWorkflowModel";

describe("viewer workflow ranges and units", () => {
  it.each([['',null],['0',0],['20',0.2],['100',1]])("converts percent %s once", (raw,value) => {
    expect(validateThreshold(raw as string,true)).toEqual({valid:true,value});
  });
  it.each(['abc','-1','101','Infinity','NaN','0x10','1e2'])("rejects invalid percentages %s", raw => expect(validateThreshold(raw,true).valid).toBe(false));
  it.each(['', '0', '-1', '3.1', '1e2', '9', 'NaN', 'Infinity'])("rejects position %s rather than clamping", raw => expect(parseViewerPosition(raw,8)).toBeNull());
  it("accepts the first and last positions",()=>{expect(parseViewerPosition(' 1 ',8)).toBe(1);expect(parseViewerPosition('8',8)).toBe(8);});
  it("searches full headers and descriptions, including Chinese",()=>{
    const row={id:'Sample-01\t中文描述 Teaching DNA',sequence:'ACGT'};
    for (const query of ['SAMPLE','teaching','中文描述']) expect(matchesSequenceName(row,query)).toBe(true);
  });
  const all=[{id:'sample A description',rowKey:'a',sequence:'AC-GT'},{id:'sample B',rowKey:'b',sequence:'ACTGT'}];
  const fixture:SequenceExportSnapshot={all,displayed:[all[0]],selected:[all[1]],length:5,positions:{kind:'filtered',positions:new Uint32Array([1,3,5]),length:3},range:{start:2,end:4},source:'fixture',stage:'refined',initialRows:'displayed',initialColumns:'filtered'};
  it("exports hidden selected rows using original titles",()=>{
    const result=sequenceExportText(resolveSequenceExport(fixture,'selected','all'));
    expect(result).toEqual({fasta:'>sample B\nACTGT\n',mapping:null});
  });
  it("exports continuous intervals including filtered out columns",()=>{
    const result=resolveSequenceExport(fixture,'displayed','interval');
    expect(result.length).toBe(3); expect(result.contiguous).toBe(true);
    expect(sequenceExportText(result).fasta).toBe('>sample A description\nC-G\n');
  });
  it("provides the exact original position mapping for disjoint columns",()=>{
    const result=sequenceExportText(resolveSequenceExport(fixture,'all','filtered'));
    expect(result.fasta).toBe('>sample A description\nA-T\n>sample B\nATT\n');
    expect(result.mapping).toBe('export_column\toriginal_alignment_column\n1\t1\n2\t3\n3\t5\n');
  });
  it("handles empty rows and columns without phantom data",()=>{
    expect(resolveSequenceExport({...fixture,displayed:[]},'displayed','all').rows).toEqual([]);
    expect(resolveSequenceExport({...fixture,positions:identityColumnPositionView(0)},'all','filtered').length).toBe(0);
    expect(resolveSequenceExport({...fixture,range:null},'all','interval').length).toBe(0);
  });
});
