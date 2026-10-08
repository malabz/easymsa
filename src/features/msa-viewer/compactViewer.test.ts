import { describe, expect, it } from 'vitest';
import { calculateMsaAnalysisStore } from './analysis';
import { frequencyLetters } from './frequencyLogo';
import { calculateMinimap } from './minimapData';
import { filteredColumnPositionView, identityColumnPositionView, assertColumnStatsStore } from './columnStatsStore';
import { calculateMotifSearchPayload, MOTIF_WORKER_PROTOCOL_VERSION } from './motifWorkerProtocol';
import { createInitialViewerState } from './useViewerState';
import { viewerStateToSnapshot } from './useWorkspacePersistence';
import { workspaceSnapshotSchema, WORKSPACE_SCHEMA } from './workspaceSnapshot';
import { frozenHeight } from './viewerGeometry';

describe('compact viewer data',()=>{
  it('keeps gaps, ambiguity and unknown symbols in the frequency denominator',()=>{
    const {columnStore:store}=calculateMsaAnalysisStore([{sequence:'A--N'},{sequence:'CN-N'},{sequence:'TN-N'},{sequence:'UN-N'}],4,{alphabet:'dna'});
    assertColumnStatsStore(store);
    expect(Array.from(store.nucleotideCounts.subarray(0,4))).toEqual([1,1,0,2]);
    expect(frequencyLetters(store,1).map(x=>[x.base,x.frequency])).toEqual([['A',.25],['C',.25],['T',.5]]);
    expect(frequencyLetters(store,2)).toEqual([]);expect(frequencyLetters(store,3)).toEqual([]);expect(frequencyLetters(store,4)).toEqual([]);
    expect(store.canonicalCounts[0]).toBe(4);
  });
  it('uses U for RNA and exactly the active scope total for logo height',()=>{
    const all=calculateMsaAnalysisStore([{sequence:'U'},{sequence:'T'},{sequence:'N'},{sequence:'-'}],1,{alphabet:'rna'}).columnStore;
    expect(frequencyLetters(all,1,true)).toMatchObject([{base:'U',count:2,frequency:.5}]);
    const selected=calculateMsaAnalysisStore([{sequence:'U'}],1,{alphabet:'rna'}).columnStore;
    expect(frequencyLetters(selected,1,true)[0].frequency).toBe(1);
  });
  it('aggregates every hit even when the detailed list is truncated to one',()=>{
    const payload=calculateMotifSearchPayload({protocolVersion:MOTIF_WORKER_PROTOCOL_VERSION,type:'search',requestId:1,sourceFingerprint:'synthetic',sequences:[{id:'one',sequence:'AA-AA'},{id:'two',sequence:'AAAAA'}],query:'AA',matchMode:'strict',strandMode:'forward',maxMatches:1});
    expect(payload.totalCount).toBe(7);expect(payload.matches).toHaveLength(1);expect(payload.truncated).toBe(true);
    expect(Array.from(payload.columnHitCounts)).toEqual([2,2,1,2,0]);
    expect(payload.columnHitCounts.reduce((sum,n)=>sum+n,0)).toBe(7);
  });
  it('minimap respects ordered rows and original filtered column coordinates',()=>{
    const rows=[{id:'second',sequence:'GT'},{id:'first',sequence:'AC'}];
    const image=calculateMinimap({rows,positions:filteredColumnPositionView([2]),scheme:'nucleotide',store:null,width:1,height:2});
    expect(image.width).toBe(1);expect(image.height).toBe(2);
    expect(Array.from(image.pixels)).toEqual([255,228,230,255,224,242,254,255]);
    const bin=calculateMinimap({rows,positions:identityColumnPositionView(2),scheme:'nucleotide',store:null,width:1,height:1});
    expect(bin.pixels.length).toBe(4);
    expect(calculateMinimap({rows:Array.from({length:600},()=>rows[0]),positions:identityColumnPositionView(2),scheme:'neutral',store:null,width:1000,height:1000}).height).toBe(512);
  });
  it('migrates V1 workspaces while retaining scientific choices and viewport',()=>{
    const state=createInitialViewerState({rows:[],storage:null});
    const current=viewerStateToSnapshot({...state,density:'comfortable',zoomLevel:1.5,selection:{rowKey:'row:1',position:3},showLogo:false},{fingerprint:'synthetic-fixture',sequenceCount:2,alignmentLength:12});
    const legacy=JSON.parse(JSON.stringify(current));legacy.schema='easymsa-viewer-workspace/v1';delete legacy.view.showLogo;delete legacy.view.showConsensus;
    const migrated=workspaceSnapshotSchema.parse(legacy);
    expect(migrated.schema).toBe(WORKSPACE_SCHEMA);expect(migrated.view.density).toBe('compact');expect(migrated.view.zoomLevel).toBe(1.5);expect(migrated.view.selection?.position).toBe(3);
    expect(workspaceSnapshotSchema.parse(current).view.showLogo).toBe(false);
  });
  it('keeps fixed track geometry independent of matrix zoom',()=>{
    expect(frozenHeight(2,true,true)).toBe(152);expect(frozenHeight(2,true,true,true)).toBe(172);
  });
});
